import { constants } from "fs";
import { access, mkdir, writeFile } from "fs/promises";
import path from "path";
import Groq from "groq-sdk";
import * as ort from "onnxruntime-node";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { parseLabel } from "@/lib/labels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL_URL =
  "https://huggingface.co/vgonur2/PlantDiseaseDetection/resolve/main/plant_model_v2.onnx";
const LABELS_URL =
  "https://huggingface.co/vgonur2/PlantDiseaseDetection/resolve/main/labels.json";

const CACHE_DIR = path.join(process.cwd(), ".cache");
const MODEL_PATH = path.join(CACHE_DIR, "plant_model_v2.onnx");

const MEAN = [0.485, 0.456, 0.406] as const;
const STD = [0.229, 0.224, 0.225] as const;
const IMAGE_SIZE = 224;

let sessionPromise: Promise<ort.InferenceSession> | null = null;
let labelsPromise: Promise<Record<number, string>> | null = null;
let modelDownloadPromise: Promise<void> | null = null;
let groqClient: Groq | null = null;

function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  if (!groqClient) {
    groqClient = new Groq({ apiKey });
  }

  return groqClient;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url} (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buffer);
}

async function ensureModelCached(): Promise<string> {
  if (await fileExists(MODEL_PATH)) {
    return MODEL_PATH;
  }

  if (!modelDownloadPromise) {
    modelDownloadPromise = downloadFile(MODEL_URL, MODEL_PATH).finally(() => {
      modelDownloadPromise = null;
    });
  }

  await modelDownloadPromise;
  return MODEL_PATH;
}

async function getSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const modelPath = await ensureModelCached();
      return ort.InferenceSession.create(modelPath);
    })();
  }
  return sessionPromise;
}

async function getLabels(): Promise<Record<number, string>> {
  if (!labelsPromise) {
    labelsPromise = (async () => {
      const response = await fetch(LABELS_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch labels (${response.status})`);
      }
      const raw = (await response.json()) as Record<string, string>;
      const labels: Record<number, string> = {};
      for (const [key, value] of Object.entries(raw)) {
        labels[Number(key)] = value;
      }
      return labels;
    })();
  }
  return labelsPromise;
}

async function preprocessImage(imageBuffer: Buffer): Promise<Float32Array> {
  const { data, info } = await sharp(imageBuffer)
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const tensor = new Float32Array(3 * width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelOffset = (y * width + x) * channels;
      for (let c = 0; c < 3; c++) {
        const normalized =
          (data[pixelOffset + c] / 255 - MEAN[c]) / STD[c];
        tensor[c * height * width + y * width + x] = normalized;
      }
    }
  }

  return tensor;
}

function getTopPrediction(logits: Float32Array): {
  classIndex: number;
  confidence: number;
} {
  const values = Array.from(logits);
  const maxLogit = Math.max(...values);
  const expScores = values.map((v) => Math.exp(v - maxLogit));
  const sumExp = expScores.reduce((a, b) => a + b, 0);
  const probabilities = expScores.map((v) => v / sumExp);

  let classIndex = 0;
  let confidence = probabilities[0];

  for (let i = 1; i < probabilities.length; i++) {
    if (probabilities[i] > confidence) {
      confidence = probabilities[i];
      classIndex = i;
    }
  }

  return { classIndex, confidence };
}

async function getTreatmentAdvice(plant: string, disease: string): Promise<string> {
  const client = getGroqClient();
  if (!client) {
    return "Treatment recommendation unavailable because GROQ_API_KEY is not configured.";
  }

  const isHealthy = disease.toLowerCase() === "healthy";
  const userPrompt = isHealthy
    ? `The ${plant} plant appears healthy. Give a brief care tip.`
    : `A farmer has a ${plant} plant diagnosed with ${disease}. What should they do?`;

  const completion = await client.chat.completions.create({
    model: "llama3-8b-8192",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You are an expert plant pathologist helping farmers. Give concise, practical advice in 2-3 sentences. Be specific about what actions to take.",
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  return (
    completion.choices[0]?.message?.content?.trim() ??
    "No treatment recommendation was generated."
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!image || !(image instanceof Blob)) {
      return NextResponse.json(
        { error: "No image provided. Send a file under the 'image' field." },
        { status: 400 },
      );
    }

    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const inputTensor = await preprocessImage(imageBuffer);

    const [session, labels] = await Promise.all([getSession(), getLabels()]);

    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];

    const feeds: Record<string, ort.Tensor> = {
      [inputName]: new ort.Tensor(
        "float32",
        inputTensor,
        [1, 3, IMAGE_SIZE, IMAGE_SIZE],
      ),
    };

    const results = await session.run(feeds);
    const output = results[outputName];

    if (!output || !(output.data instanceof Float32Array)) {
      throw new Error("Unexpected model output format.");
    }

    const { classIndex, confidence } = getTopPrediction(output.data);
    const label = labels[classIndex] ?? "Unknown___Unknown";
    const { plant, disease } = parseLabel(label);

    const treatment = await getTreatmentAdvice(plant, disease);

    return NextResponse.json({
      plant,
      condition: disease,
      confidence,
      treatment,
      label,
      classIndex,
    });
  } catch (error) {
    console.error("Classification error:", error);
    return NextResponse.json(
      { error: "Failed to process classification request." },
      { status: 500 },
    );
  }
}

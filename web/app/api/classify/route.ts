import Groq from "groq-sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

async function getTreatmentAdvice(plant: string, condition: string): Promise<string> {
  const client = getGroqClient();
  if (!client) {
    return "Treatment recommendation unavailable because GROQ_API_KEY is not configured.";
  }

  const isHealthy = condition.toLowerCase() === "healthy";
  const userPrompt = isHealthy
    ? `The ${plant} plant appears healthy. Give a brief care tip.`
    : `A farmer has a ${plant} plant diagnosed with ${condition}. What should they do?`;

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
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
  const inferenceUrl = process.env.INFERENCE_API_URL;
  if (!inferenceUrl) {
    return NextResponse.json(
      { error: "INFERENCE_API_URL is not configured." },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!image || !(image instanceof Blob)) {
      return NextResponse.json(
        { error: "No image provided. Send a file under the 'image' field." },
        { status: 400 },
      );
    }

    const forwardData = new FormData();
    forwardData.append("image", image as Blob, "upload.jpg");

    const response = await fetch(inferenceUrl, {
      method: "POST",
      body: forwardData,
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    const plant = data.plant;
    const condition = data.condition;

    if (typeof plant === "string" && typeof condition === "string") {
      const treatment = await getTreatmentAdvice(plant, condition);
      return NextResponse.json({ ...data, treatment }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Classification forward error:", error);
    return NextResponse.json(
      { error: "Failed to forward inference request." },
      { status: 500 },
    );
  }
}

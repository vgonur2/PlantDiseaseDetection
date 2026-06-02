from pathlib import Path
import json
import requests
import numpy as np
from PIL import Image
import onnxruntime as ort
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse

MODEL_URL = "https://huggingface.co/vgonur2/PlantDiseaseDetection/resolve/main/plant_model_v2.onnx"
LABELS_URL = "https://huggingface.co/vgonur2/PlantDiseaseDetection/resolve/main/labels.json"
CACHE_DIR = Path(__file__).resolve().parent / ".cache"
MODEL_PATH = CACHE_DIR / "plant_model_v2.onnx"
LABELS_PATH = Path(__file__).resolve().parents[1] / "model" / "labels.json"
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

app = FastAPI()
labels = {}
session: ort.InferenceSession | None = None


def download_model() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    if MODEL_PATH.exists():
        return

    response = requests.get(MODEL_URL, stream=True, timeout=30)
    response.raise_for_status()
    with open(MODEL_PATH, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)


def load_labels() -> dict[str, str]:
    if LABELS_PATH.exists():
        return json.loads(LABELS_PATH.read_text(encoding="utf-8"))

    response = requests.get(LABELS_URL, timeout=30)
    response.raise_for_status()
    return response.json()


def parse_label(raw_label: str) -> tuple[str, str]:
    parts = raw_label.split("___", 1)
    plant = parts[0].replace("_", " ").strip()
    condition = parts[1].replace("_", " ").strip() if len(parts) > 1 else "Unknown"
    return plant, condition


def preprocess_image(file: UploadFile) -> np.ndarray:
    image = Image.open(file.file).convert("RGB")
    image = image.resize((224, 224), Image.BILINEAR)
    array = np.asarray(image, dtype=np.float32) / 255.0
    array = (array - MEAN) / STD
    array = np.transpose(array, (2, 0, 1))
    return np.expand_dims(array, axis=0)


@app.on_event("startup")
def startup_event() -> None:
    global session, labels
    download_model()
    labels = load_labels()
    session = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])


@app.post("/classify")
async def classify(image: UploadFile = File(...)) -> JSONResponse:
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    if session is None:
        raise HTTPException(status_code=500, detail="Inference session not initialized.")

    input_tensor = preprocess_image(image)
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: input_tensor})

    if not outputs:
        raise HTTPException(status_code=500, detail="Inference returned no output.")

    logits = np.asarray(outputs[0]).flatten()
    probabilities = np.exp(logits - np.max(logits))
    probabilities = probabilities / np.sum(probabilities)
    class_index = int(np.argmax(probabilities))
    confidence = float(probabilities[class_index])
    raw_label = labels.get(str(class_index), "Unknown___Unknown")
    plant, condition = parse_label(raw_label)

    return JSONResponse({
        "plant": plant,
        "condition": condition,
        "confidence": confidence,
    })

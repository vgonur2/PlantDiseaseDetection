# 🌿 Plant Disease Detection — AI-Powered Plant Disease Detection

**Live Demo:** [(https://plant-disease-detection.vercel.app)  ]((https://plant-disease-detection-j88fd7q5g.vercel.app/))

**Model Repo:** [huggingface.co/vgonur2/PlantDiseaseDetection](https://huggingface.co/vgonur2/PlantDiseaseDetection)

LeafGuard is a full-stack machine learning web app that lets farmers and gardeners upload a photo of a plant leaf and instantly get back:
- What plant it is (tomato, corn, potato, etc.)
- Whether it's healthy or diseased
- What disease it has (if any)
- A plain-English treatment recommendation powered by an LLM

---

## How It Works

1. User uploads a leaf photo on the website
2. The image is sent to a FastAPI inference server running on Render
3. The server runs the image through a custom-trained CNN (exported to ONNX format)
4. The predicted disease class is returned to the Next.js frontend
5. The frontend calls the Groq API to generate a treatment recommendation
6. Results are displayed: plant type, condition, confidence score, and what to do about it

---

## The Machine Learning Model

### Dataset
The model was trained on the [PlantVillage dataset](https://www.kaggle.com/datasets/abdallahalidev/plantvillage-dataset) — 54,303 images of healthy and diseased plant leaves across 38 classes covering 14 crop species. Classes are structured as `Plant___Disease` (e.g. `Tomato___Early_blight`, `Corn___healthy`).

### Architecture
A custom CNN built from scratch in PyTorch — no pretrained weights. The architecture consists of 4 convolutional blocks followed by a fully connected classifier head:

```
Input (224x224 RGB image)
    ↓
Conv Block 1: Conv2d(3→32) + BatchNorm + ReLU + MaxPool → 112x112
    ↓
Conv Block 2: Conv2d(32→64) + BatchNorm + ReLU + MaxPool → 56x56
    ↓
Conv Block 3: Conv2d(64→128) + BatchNorm + ReLU + MaxPool → 28x28
    ↓
Conv Block 4: Conv2d(128→256) + BatchNorm + ReLU + MaxPool → 14x14
    ↓
Flatten → Linear(25088→512) + ReLU + Dropout(0.5)
    ↓
Linear(512→38) → 38 class predictions
```

**Total parameters:** 26,099,494

Each conv block doubles the number of filters while halving the spatial dimensions via MaxPool. BatchNorm stabilizes training and Dropout(0.5) prevents overfitting on the classifier head.

### Training
- **Environment:** Google Colab (T4 GPU)
- **Optimizer:** Adam (lr=1e-3)
- **Loss:** Cross-Entropy
- **Scheduler:** StepLR (halves learning rate every 5 epochs)
- **Epochs:** 40
- **Data split:** 70% train / 15% validation / 15% test

### Results
| Metric | Score |
|--------|-------|
| Test Accuracy | **95%** |
| Weighted F1 | **0.95** |
| Macro F1 | **0.92** |

Notable per-class performance:
- Orange Haunglongbing: F1 = 0.99
- Corn healthy: F1 = 1.00
- Squash Powdery Mildew: F1 = 0.99
- Corn Cercospora leaf spot: F1 = 0.40 (weakest class — noted in UI)

One important caveat: the PlantVillage dataset was collected in controlled lab settings with plain backgrounds. Real-world field photos may reduce accuracy. For best results, upload a clear close-up of a single leaf.

### Export
The trained model was exported to ONNX format using PyTorch's legacy TorchScript exporter (`dynamo=False`) to produce a single 99.6MB `.onnx` file (rather than the split `.onnx` + `.onnx.data` format produced by newer exporters). The model and class labels are hosted on Hugging Face.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Model Training | PyTorch (Google Colab, T4 GPU) |
| Model Format | ONNX |
| Model Hosting | Hugging Face |
| Inference Server | FastAPI + onnxruntime (Python) |
| Inference Hosting | Render (free tier) |
| Frontend | Next.js + Tailwind CSS + TypeScript |
| Frontend Hosting | Vercel |
| Treatment Recommendations | Groq API (llama-3.3-70b-versatile) |

---

## Project Structure

```
PlantDiseaseDetection/
├── model/
│   ├── PlantDiseaseDetectionColab.ipynb   # Full training notebook
│   ├── labels.json                         # 38 class label mappings
│   └── plant_model_v2.onnx                 # Exported ONNX model
│
├── api/
│   ├── main.py                             # FastAPI inference server
│   ├── requirements.txt                    # Python dependencies
│   └── render.yaml                         # Render deployment config
│
└── web/
    ├── app/
    │   ├── page.tsx                        # Homepage
    │   └── api/classify/route.ts           # API route (forwards to Render + calls Groq)
    ├── components/
    │   ├── UploadBox.tsx                   # Drag and drop image upload
    │   └── ResultCard.tsx                  # Classification results display
    └── lib/
        └── labels.ts                       # Label mappings for frontend
```

---

## How to Run Locally

### Prerequisites
- Node.js 20+
- Python 3.10+
- A Groq API key (free at console.groq.com)

### 1. Clone the repo
```bash
git clone https://github.com/vgonur2/PlantDiseaseDetection
cd PlantDiseaseDetection
```

### 2. Start the inference server
```bash
cd api
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
On first run, it will automatically download the ONNX model from Hugging Face (~100MB). This only happens once.

### 3. Start the web app
```bash
cd web
npm install
```

Create a `.env.local` file:
```
GROQ_API_KEY=your_groq_api_key_here
INFERENCE_API_URL=http://localhost:8000/classify
```

Then:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment Architecture

```
User Browser
     ↓ uploads image
Vercel (Next.js frontend)
     ↓ forwards image
Render (FastAPI + ONNX inference)
     ↓ returns plant + condition + confidence
Vercel (Next.js API route)
     ↓ sends plant/condition to Groq
Groq API (llama-3.3-70b-versatile)
     ↓ returns treatment recommendation
User Browser ← displays all results
```

The frontend and inference are intentionally decoupled. This is because ONNX inference requires native binaries or WASM files that don't work in Vercel's serverless environment. Running inference on a dedicated Python server on Render is the correct production architecture for ML models.

---

## Limitations & Future Work

- **Lab vs. field images:** The model was trained on controlled backgrounds. Adding data augmentation with real field images would improve real-world accuracy
- **38 classes only:** The model can only classify plant/disease combinations present in PlantVillage. Uncommon crops or novel diseases won't be recognized
- **Cold starts:** The Render free tier spins down after inactivity, causing a ~50 second delay on the first request after a period of no use
- **Weak classes:** Corn Cercospora leaf spot and Tomato Early Blight have lower recall (~27% and ~55% respectively) — worth noting when interpreting results for those crops

---

## About

Built by **Vishruth Gonur** — Data Science & Information Sciences student at UIUC.  
Incoming Tech Consulting (AI & Data) Intern at EY | Incoming Customer Success Engineer Intern at IBM.

[LinkedIn](https://linkedin.com/in/vishruth-gonur) · [GitHub](https://github.com/vgonur2)

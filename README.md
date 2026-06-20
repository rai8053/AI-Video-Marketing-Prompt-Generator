# AI Video Marketing Prompt Generator 🎬🚀

An elite, full-stack intelligence application that crawls public website URLs (or ingests custom brand assets) and leverages the native power of Gemini models to programmatically output high-fidelity video campaign blueprints, structured visuals, visual direction cues, and majestic **Single Unified Master Prompts** optimized directly for state-of-the-art open-source text-to-video diffusion models (such as HunyuanVideo, CogVideoX, and Stable Video Diffusion).

---

## 🌟 Key Application Highlights

* **Automated Website Scraping & Extraction**: Direct extraction of brand messaging, target aesthetics, and value propositions from active landing page contexts or custom seed details.
* **Curated Storytelling Hook Matrix**: Select from 6 unique creative cinematic styles:
  * 🎬 **Cinematic Story** (high-production value narratives)
  * 🔎 **Macro Product** (intimate closeup detailing & crisp focus)
  * ⚡ **High Energy** (fast cuts, kinetic camera paths, dynamic pacing)
  * 🌌 **Surreal Art** (dreamlike atmospheres & abstract forms)
  * 📼 **Vintage VHS** (retro nostalgia, analogue textures, VHS lens coloring)
  * ☀️ **Sleek Minimal** (understated, spacious, bright and modern layouts)
* **Custom AI Temperature Scaling**: Dynamically tune output temperature profiles:
  * *Precise* (0.3) for consistent, literal brand translations.
  * *Balanced* (0.7) for standard commercial layout.
  * *High-Creative* (1.15) for experimental and unique visual metaphors.
* **Deterministic Variation Engine**: Instantly iterate and compare creative outputs with the "Regenerate Variation" control. Uses incremental seed states (`#variationSeed`) and semantic modifiers to steer camera directions without losing core brand structure.
* **Integrated Local Video Synthesis Tutorials**: Step-by-step setup checklists and guides for local developer pipelines including ComfyUI node setup, Python diffusers code, and hardware requirements.

---

## 🛠️ The Tech Stack

### Client-Side SPA (React + TypeScript)
* **Framework**: React 18 / Vite
* **Styling**: Tailwind CSS (Utility-First modern layout)
* **Motion & Animations**: `motion/react` lightweight UI transitions
* **Icons**: `lucide-react` high-contrast vector assets

### High-Performance Server-Side API
* **Backend**: Node.js Express Server
* **AI Orchestration**: Modern `@google/genai` TypeScript SDK
* **Scraping Subsystem**: Server-side parsing and sanitization architecture
* **Local Production Build**: Bundled using `esbuild` to produce optimized, self-contained `dist/server.cjs` modules for smooth container deployment.

---

## 🚀 Quick Setup & Local Execution

Follow these steps to run the application locally on your workstation:

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/)

### 1. Clone & Install Dependencies
```bash
# Clone your repository
git clone <your-github-repo-url>
cd ai-video-marketing-prompt-generator

# Install dependencies
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Server secret for LLM generation
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Dev Server Port (Automatic fallback to 3000)
PORT=3000
```

### 3. Start Development Server
```bash
# Runs the Vite dev environment alongside the Express backend API
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser of choice.

### 4. Build for Production
To bundle the frontend assets and compile the TypeScript backend down into a single optimized server file:
```bash
# Build static client paths and CJS backend server
npm run build

# Start production-ready container instance
npm run start
```

---

## 🌐 Production Cloud Deployment Guidelines

This full-stack application is optimized to run smoothly on contemporary cloud platforms such as **Render**, **Railway**, **Google Cloud Run**, or **fly.io** as a unified Node.js service.

### General Environment Setup
When configuring your production service, make sure the following variables are defined within your developer dashboard:
1. **`GEMINI_API_KEY`** (Required): Your private Google Gemini AI Studio key.
2. **`NODE_ENV`**: Set to `production` (this ensures asset caching is enabled and optimization switches are active).
3. **`PORT`**: Set automatically by most providers, or defaulted to `3000`.

---

## 🚀 Step-by-Step Hosting Deployments

### Option A: Render (Web Service)
1. **Create Web Service**: Click **New +** > **Web Service** on Render and connect your GitHub repository.
2. **Runtime**: Select **Node**.
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm run start` (this runs the optimized, compiled `dist/server.cjs` master script).
5. **Environment Variables**: Add your `GEMINI_API_KEY` under the service's Environment panel.

### Option B: Railway
1. **New Project**: Connect your GitHub repository directly to your Railway dashboard.
2. **Automatic Detection**: Railway will automatically detect the `package.json` file.
3. **Variables**: Click **Variables** > **New Variable** and add `GEMINI_API_KEY`.
4. **Deploy**: Railway runs `npm run build` and boots the production start sequence out of the box.

### Option C: Google Cloud Run & Docker
We ship an optimized multi-stage build structure. To deploy instantly on Cloud Run with your custom container build:
```bash
# Build & deploy to GCP Container Registry
gcloud run deploy ai-video-prompts \
  --source . \
  --set-env-vars="GEMINI_API_KEY=your_key_here" \
  --allow-unauthenticated
```

---

## 🌌 Connecting to Local Open-Source AI Video Generators

Once you generate your unified Master Prompts within the app, deploy them into local generator configurations:

### Option A: ComfyUI Node Setup
1. Clone the repository: `git clone https://github.com/comfyanonymous/ComfyUI.git`
2. Download weights (e.g., `hunyuan_video_720p_bf16.safetensors`) and move them directly into your `models/checkpoints/` directory.
3. Start ComfyUI with optimal VRAM budget switches: `python main.py --highvram` or `--lowvram`.
4. Import the **Single Unified Master Prompt** string output from the app straight into your positive Text Conditioning source node.

### Option B: Python Diffusers Pipeline
```python
import torch
from diffusers import HunyuanVideoPipeline

# Load the transformer backend
pipe = HunyuanVideoPipeline.from_pretrained(
    "hunyuanvideo/HunyuanVideo", 
    torch_dtype=torch.float16
).to("cuda")

# Copy the grand cinematic narrative setup generated by the web app
prompt = "[PASTE COPIED NARRATIVE MASTER PROMPT]"

# Synthesize video sequence frame arrays
video = pipe(
    prompt, 
    num_frames=61, 
    width=1280, 
    height=720
).frames[0]
```

---

## 📝 License
This project is open-source and available under the MIT License.

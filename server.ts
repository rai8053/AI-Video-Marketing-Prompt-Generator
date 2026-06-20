import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, GenerateVideosOperation } from "@google/genai";
import { exec, execFile } from "child_process";
import "dotenv/config";

// Kick off background installation of Scrapling so it's ready when needed
exec("python3 -m pip install scrapling --quiet", (err) => {
  if (err) {
    console.warn("Warm-up installation of Scrapling python library logged:", err.message);
  } else {
    console.log("Scrapling pre-installed successfully for fast campaigns.");
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Let users pass rich manual copy
  app.use(express.json({ limit: "5mb" }));

  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!aiClient) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error("GEMINI_API_KEY environment variable is not configured in Settings > Secrets.");
      }
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  }

  // --- API Routes ---

  // Healthcheck
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Scrapes the provided website URL
  app.post("/api/scrape", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      new URL(url);
    } catch (_) {
      return res.status(400).json({ error: "Invalid URL structure. Please double-check formatting (including http:// or https://)." });
    }

    try {
      const text = await scrapeUrlText(url);
      res.json({ text });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to parse website" });
    }
  });

  // Generates video cues, visual prompts, and marketing descriptions via Gemini
  app.post("/api/generate", async (req, res) => {
    const {
      content,
      videoType = "shorts",
      videoLength = "30s",
      targetAudience = "General Audience",
      tonePreference = "energetic & compelling",
      creativeHook = "cinematic_story",
      creativityLevel = 0.7,
      variationSeed = 1
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Extracted website content is required." });
    }

    try {
      const ai = getGeminiClient();

      const systemInstruction = 
        `You are a master advertising director and elite AI prompt engineer for high-end text-to-video systems (like Google Veo, Runway Gen-3, Luma Dream Machine, Kling, and Sora). ` +
        `Your job is to analyze website, brand, or product copy, extract its key value propositions, ` +
        `and synthesize a single unified, elite AI Video Master Prompt & Campaign Blueprint. ` +
        `The user prefers a single, highly structured, comprehensive master prompt layout combining overall metadata and a sequential timeline, rather than multiple isolated mini-prompts. ` +
        `You must output a beautifully structured JSON object containing detailed style guides, aspect ratios, environment details, negative prompts, camera setups, and a timeline progression sequence. ` +
        `We will also compile a single copy-pasteable text string representing the ultimate unified prompt.`;

      const promptText = 
        `Create a unified, premium master video campaign prompt from this scraped website text:\n\n` +
        `[WEBSITE CONTENT]\n${content}\n\n` +
        `[STRATEGY OPTIONS]\n` +
        `- Campaign Video Format: ${videoType}\n` +
        `- Targeted Duration: ${videoLength}\n` +
        `- Ideal Demographic group: ${targetAudience}\n` +
        `- Brand Accent/Tone: ${tonePreference}\n` +
        `- Creative Hook Style Focus: ${creativeHook}\n` +
        `- Random Seed / Variation Angle: ${variationSeed}\n\n` +
        `Instructions:\n` +
        `Create a structured video campaign blueprint. Frame it around the product or brand scraped. ` +
        `Make sure to produce an elite, single multi-stage timeline sequence mirroring the website's primary message, with visual styles, camera instructions, key elements, and soundscapes.\n` +
        `IMPORTANT: Target creative hook focus flavor is "${creativeHook}". Use variation modifier identifier #${variationSeed} to inject a totally distinct conceptual twist, different camera movements, and scenery. Ensure this iteration feels fresh, visually distinct, and creatively unique compared to standard runs.\n` +
        `Also formulate 'singleUnifiedMasterPrompt' as a majestic, multi-sentence high-fidelity paragraph that compiles all these styles, timeline instructions, negative constraints, and camera setups into ONE single master block that a user can paste into an AI Video Generator to command the entire scene!`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          systemInstruction,
          temperature: parseFloat(creativityLevel.toString()) || 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              brandName: { type: Type.STRING, description: "Name of the brand or web service" },
              campaignConcept: { type: Type.STRING, description: "Dynamic creative tagline/concept of this promotional video" },
              metadata: {
                type: Type.OBJECT,
                properties: {
                  promptName: { type: Type.STRING, description: "Title of the video prompt blueprint" },
                  baseStyle: { type: Type.STRING, description: "Style guidelines, e.g. cinematic, photorealistic, 4K, moody atmospheric" },
                  aspectRatio: { type: Type.STRING, description: "Aspect ratio descriptor, e.g. 16:9, 9:16" },
                  environmentDescription: { type: Type.STRING, description: "Detailed look of the initial scene environment or setting" },
                  cameraSetup: { type: Type.STRING, description: "Camera movement and lens guideline (e.g. static wide angle, slow push, macro-dolly)" },
                  keyElements: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Initial props or products visible in the scene"
                  },
                  assembledElements: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Features, items, or visual assets that emerge, assemble, or reveal themselves throughout the video"
                  },
                  negativePrompts: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Visual components to exclude, e.g. no people, no text overlay, raw shadows, etc."
                  }
                },
                required: [
                  "promptName",
                  "baseStyle",
                  "aspectRatio",
                  "environmentDescription",
                  "cameraSetup",
                  "keyElements",
                  "assembledElements",
                  "negativePrompts"
                ]
              },
              timeline: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sequence: { type: Type.INTEGER },
                    timestamp: { type: Type.STRING, description: "Timestamp, e.g., '00:00-00:02'" },
                    action: { type: Type.STRING, description: "Complete, visually clear description of what occurs in this segment of the shot" },
                    audio: { type: Type.STRING, description: "Audio effects, ambient noise, or spoken cues during this segment" }
                  },
                  required: ["sequence", "timestamp", "action", "audio"]
                }
              },
              singleUnifiedMasterPrompt: { 
                type: Type.STRING, 
                description: "The complete compiled unified master text block containing the full sequence guide, negative prompts, camera specs, and aesthetics, designed for pasting as a single massive prompt." 
              },
              suggestedPostCopy: { type: Type.STRING, description: "High-affinity copy for video captioning (Tik Tok, YouTube Reels, YouTube Shorts, LinkedIn CTA)" },
              suggestedHashtags: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              marketingTip: { type: Type.STRING, description: "Expert advice on using this specific output structure in generators like Kling or Veo" }
            },
            required: [
              "brandName",
              "campaignConcept",
              "metadata",
              "timeline",
              "singleUnifiedMasterPrompt",
              "suggestedPostCopy",
              "suggestedHashtags",
              "marketingTip"
            ]
          }
        }
      });

      const textOutput = response.text;
      if (!textOutput) {
        throw new Error("No response was returned from the Gemini AI model.");
      }

      const marketingPackage = JSON.parse(textOutput.trim());
      res.json({ success: true, package: marketingPackage });
    } catch (err: any) {
      console.error("Gemini model prompt creation error:", err);
      res.status(500).json({ error: err.message || "An issue was encountered communicating with the AI service." });
    }
  });

  // Generates high-fidelity keyframe image for free simulation using Imagen 4
  app.post("/api/generate-image", async (req, res) => {
    const { prompt, aspectRatio = "16:9" } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9",
        },
      });

      if (response && response.generatedImages?.[0]?.image?.imageBytes) {
        res.json({ 
          success: true, 
          imageUrl: `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}` 
        });
      } else {
        throw new Error("No image data returned from Google Imagen.");
      }
    } catch (err: any) {
      console.warn("Imagen generation failed, falling back gracefully to client dynamic simulation:", err.message);
      res.json({ 
        success: false, 
        fallback: true,
        error: err.message || "Failed to generate AI keyframe image."
      });
    }
  });

  // 1. Start Veo video generation
  app.post("/api/generate-video", async (req, res) => {
    const { prompt, aspectRatio = "16:9" } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    try {
      const ai = getGeminiClient();
      const operation = await ai.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9"
        }
      });
      res.json({ success: true, operationName: operation.name });
    } catch (err: any) {
      console.error("Veo video generation initiation error:", err);
      res.status(500).json({ error: err.message || "Failed to start AI Video generation." });
    }
  });

  // 2. Poll Veo video status
  app.post("/api/video-status", async (req, res) => {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: "Operation name is required" });
    }

    try {
      const ai = getGeminiClient();
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      res.json({ success: true, done: updated.done });
    } catch (err: any) {
      console.error("Veo video status query error:", err);
      res.status(500).json({ error: err.message || "Failed to check video status." });
    }
  });

  // 3. Download / Stream Veo video
  app.post("/api/video-download", async (req, res) => {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: "Operation name is required" });
    }

    try {
      const ai = getGeminiClient();
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error("GEMINI_API_KEY environment variable is not configured.");
      }
      
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) {
        return res.status(404).json({ error: "Video URI not found or video is not completed yet." });
      }

      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': key },
      });

      res.setHeader('Content-Type', 'video/mp4');
      videoRes.body!.pipeTo(
        new WritableStream({
          write(chunk) { res.write(chunk); },
          close() { res.end(); },
        })
      );
    } catch (err: any) {
      console.error("Veo video download streaming error:", err);
      res.status(500).json({ error: err.message || "Failed to download generated video." });
    }
  });

  // Scraping using Scrapling (via Python), with full fallback logic
  async function scrapeUrlText(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const pythonPath = "python3";
      const scriptPath = path.join(process.cwd(), "scraper.py");

      execFile(pythonPath, [scriptPath, url], (error, stdout, stderr) => {
        if (error) {
          console.warn("Python execution failed, falling back to request crawler:", stderr || error.message);
          fallbackNativeScrape(url).then(resolve).catch(reject);
          return;
        }

        try {
          const result = JSON.parse(stdout.trim());
          if (result.error) {
            console.warn("Python scraper reported internal warning, falling back:", result.error);
            fallbackNativeScrape(url).then(resolve).catch(reject);
          } else {
            console.log(`Scraped successfully using method: ${result.method}`);
            resolve(result.text || "");
          }
        } catch (jsonErr) {
          console.warn("Could not parse Python output, utilizing recovery scraper:", jsonErr);
          fallbackNativeScrape(url).then(resolve).catch(reject);
        }
      });
    });
  }

  // Backup native crawler method
  async function fallbackNativeScrape(url: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second limit

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to access the website. Server replied with status code ${response.status}.`);
      }

      const html = await response.text();

      // Simple DOM node cleaner
      let cleaned = html
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
        .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
        .replace(/<svg[^>]*>([\s\S]*?)<\/svg>/gi, "")
        .replace(/<noscript[^>]*>([\s\S]*?)<\/noscript>/gi, "")
        .replace(/<iframe[^>]*>([\s\S]*?)<\/iframe>/gi, "")
        .replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, "")
        .replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, "")
        .replace(/<header[^>]*>([\s\S]*?)<\/header>/gi, "")
        .replace(/<!--[\s\S]*?-->/g, "");

      // Eliminate structural wrapper elements
      cleaned = cleaned.replace(/<[^>]+>/g, " ");
      // Squash spacing
      cleaned = cleaned.replace(/\s+/g, " ").trim();

      if (cleaned.length < 100) {
        throw new Error("Extracted text block was too short.");
      }

      // Cap size to reasonable payload length
      return cleaned.substring(0, 45000);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error("The request to scrape the target website timed out. You can copy the brand's text manually instead!");
      }
      throw err;
    }
  }

  // Vite development integration or static middleware standard production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express microservice running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((e) => {
  console.error("Failed to startup Express server:", e);
});

import React, { useState } from "react";
import {
  Globe,
  Sparkles,
  Layers,
  Clock,
  Volume2,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  FileText,
  MousePointerClick,
  Music,
  Share2,
  Video,
  Clapperboard,
  Sliders,
  ChevronDown,
  Inbox,
  Sparkle
} from "lucide-react";

// Types matching updated server.ts response
interface TimelineSequence {
  sequence: number;
  timestamp: string;
  action: string;
  audio: string;
}

interface PromptMetadata {
  promptName: string;
  baseStyle: string;
  aspectRatio: string;
  environmentDescription: string;
  cameraSetup: string;
  keyElements: string[];
  assembledElements: string[];
  negativePrompts: string[];
}

interface CampaignPackage {
  brandName: string;
  campaignConcept: string;
  metadata: PromptMetadata;
  timeline: TimelineSequence[];
  singleUnifiedMasterPrompt: string;
  suggestedPostCopy: string;
  suggestedHashtags: string[];
  marketingTip: string;
}

const BRAND_PRESETS = [
  {
    name: "IKEA Scandinavian Concept",
    url: "https://ikea-interior.com/scandi-living",
    content: "An empty spacious sunlit Scandinavian living room with pure white walls and soft pale wood floors. Designed to represent the signature IKEA minimalism, quiet serene morning light, and modular self-assembly furniture experience."
  },
  {
    name: "L'Horizon Luxury Chrono",
    url: "https://lhorizon-luxurywatches.com/bezel",
    content: "L'Horizon Sombre Luxury Timepieces. Custom obsidian-grade black titanium alloy casing with elegant matte finish. Chronograph functionality for deep ocean floor diving. Established in 1924, representing extreme elite Swiss craftsmanship of Brutalist watches."
  },
  {
    name: "Elixir Organic Botanicals",
    url: "https://elixir-botanics.co/hydra-serum",
    content: "Elixir Botanics Hydra-Glow Serum. Experience zero-chemical advanced skin hydration. Formulated with cold-pressed rosehip seed extract, organic blue tansy oil, and active hyaluronic plant nodes. Restores natural glow and locks key nutrients."
  },
  {
    name: "Aether Cybernetic Hyper-EV",
    url: "https://aether-ev.io/spectre",
    content: "Aether Spectre Hyper-EV. The silent titanium powerhouse of intelligent electric propulsion. Four solid-state motors throwing 1,400 horsepower. Biomimetic active spoilers adapting instantly to speed and road wind parameters."
  }
];

export default function App() {
  const [url, setUrl] = useState("");
  const [manualText, setManualText] = useState("");
  const [isManualInput, setIsManualInput] = useState(false);
  const [videoType, setVideoType] = useState("Cinema (16:9)");
  const [videoLength, setVideoLength] = useState("30s");
  const [tonePreference, setTonePreference] = useState("epic cinematic trailer style");
  const [targetAudience, setTargetAudience] = useState("Modern tech & minimal lifestyle buyers");
  const [creativeHook, setCreativeHook] = useState("cinematic_story");
  const [creativityLevel, setCreativityLevel] = useState(0.7);
  const [variationSeed, setVariationSeed] = useState(1);

  // System states
  const [scraping, setScraping] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<"idle" | "scraping" | "scraped" | "generating" | "complete">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isRawTextExpanded, setIsRawTextExpanded] = useState(false);

  // Payload result
  const [marketingPackage, setMarketingPackage] = useState<CampaignPackage | null>(null);
  
  // Prompt mode tab state selector ("yaml" or "cinematic")
  const [promptTab, setPromptTab] = useState<"yaml" | "cinematic">("yaml");

  // Local Video Model Setup instructions states
  const [localInstructionsOpen, setLocalInstructionsOpen] = useState(true);
  const [localTab, setLocalTab] = useState<"comfyui" | "python" | "models">("comfyui");

  const buildYamlPrompt = (pkg: CampaignPackage): string => {
    if (!pkg || !pkg.metadata) return "";
    const meta = pkg.metadata;
    const keyElementsYaml = (meta.keyElements || []).map(el => `    - "${el.replace(/"/g, '\\"')}"`).join("\n");
    const assembledElementsYaml = (meta.assembledElements || []).map(el => `    - "${el.replace(/"/g, '\\"')}"`).join("\n");
    const negativePromptsYaml = (meta.negativePrompts || []).map(el => `    - "${el.replace(/"/g, '\\"')}"`).join("\n");
    
    const timelineYaml = (pkg.timeline || []).map(item => `  - sequence: ${item.sequence}
    timestamp: "${item.timestamp}"
    action: "${item.action.replace(/"/g, '\\"')}"
    audio: "${item.audio.replace(/"/g, '\\"')}"`).join("\n\n");

    return `metadata:
  prompt_name: "${(meta.promptName || "").replace(/"/g, '\\"')}"
  base_style: "${(meta.baseStyle || "").replace(/"/g, '\\"')}"
  aspect_ratio: "${(meta.aspectRatio || "").replace(/"/g, '\\"')}"
  room_description: "${(meta.environmentDescription || "").replace(/"/g, '\\"')}"
  camera_setup: "${(meta.cameraSetup || "").replace(/"/g, '\\"')}"
  key_elements:
${keyElementsYaml}
  assembled_elements:
${assembledElementsYaml}
  negative_prompts:
${negativePromptsYaml}

timeline:
${timelineYaml}`;
  };

  const handleApplyPreset = (preset: typeof BRAND_PRESETS[0]) => {
    setUrl(preset.url);
    setManualText(preset.content);
    setExtractedText(preset.content);
    setIsManualInput(false);
    setErrorMsg("");
    setCurrentStep("scraped");
  };

  const copyString = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setMarketingPackage(null);

    if (isManualInput) {
      if (!manualText.trim()) {
        setErrorMsg("Please paste some brand or product description first.");
        return;
      }
      setExtractedText(manualText);
      setCurrentStep("scraped");
      return;
    }

    if (!url.trim()) {
      setErrorMsg("Please provide a website link to scrape first.");
      return;
    }

    setScraping(true);
    setCurrentStep("scraping");

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch. Server reported error.");
      }
      setExtractedText(data.text);
      setCurrentStep("scraped");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to crawl target. Try copy pasting content manually instead!");
      setCurrentStep("idle");
    } finally {
      setScraping(false);
    }
  };

  const handleGenerate = async (forceNewSeed = false) => {
    if (!extractedText.trim()) {
      setErrorMsg("Missing starting brand text parameters.");
      return;
    }

    setGenerating(true);
    setCurrentStep("generating");
    setErrorMsg("");

    const nextSeed = forceNewSeed ? variationSeed + 1 : variationSeed;
    if (forceNewSeed) {
      setVariationSeed(nextSeed);
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: extractedText,
          videoType,
          videoLength,
          tonePreference,
          targetAudience,
          creativeHook,
          creativityLevel,
          variationSeed: nextSeed
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gemini engine returned error synthesis.");
      }
      setMarketingPackage(data.package);
      setCurrentStep("complete");
    } catch (err: any) {
      setErrorMsg(err.message || "AI model connection failed. Double-check your GEMINI_API_KEY settings.");
      setCurrentStep("scraped");
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setUrl("");
    setManualText("");
    setExtractedText("");
    setMarketingPackage(null);
    setVariationSeed(1);
    setCurrentStep("idle");
    setErrorMsg("");
  };

  return (
    <div id="visionary-app" className="min-h-screen bg-[#080808] text-[#e0e0e0] font-sans flex flex-col selection:bg-[#c4a661]/40 selection:text-white">
      
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-5 md:px-10 border-b border-[#1a1a1a] bg-[#050505]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-[#c4a661] to-[#e8d5a7] rounded flex items-center justify-center shadow-lg shadow-[#c4a661]/10">
            <span className="text-[#080808] font-bold text-lg italic">V</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg tracking-widest uppercase font-light text-white leading-none">
              Visionary<span className="text-[#c4a661] font-bold italic">.ai</span>
            </span>
            <span className="text-[9px] text-[#808080] uppercase tracking-widest mt-1">
              PRODUCER SUITE
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-xs text-[#808080] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>SCRAPER: READY</span>
          </div>
          <div className="hidden md:block w-px h-4 bg-[#222]"></div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c4a661]"></span>
            <span className="text-[10px] font-mono text-[#c4a661] uppercase tracking-wider">
              Veo Master Synthesis Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left pane: input controls & parameters */}
        <section className="lg:col-span-5 space-y-6">

          {/* Crawler Scraper Console */}
          <div id="crawler-scaffolder" className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-6 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#c4a661]/40 to-transparent"></div>
            
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#c4a661]" />
                <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-white">Source Integrator</h2>
              </div>
              
              {(extractedText || url || manualText) && (
                <button
                  onClick={handleReset}
                  className="text-[10px] text-[#808080] hover:text-[#c4a661] uppercase tracking-wider font-mono flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>

            {/* Toggle Modes */}
            <div className="grid grid-cols-2 gap-1 bg-[#121212] p-1 rounded-lg border border-[#222] mb-4">
              <button
                onClick={() => setIsManualInput(false)}
                className={`py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all ${
                  !isManualInput ? "bg-[#c4a661] text-[#080808] font-bold" : "text-[#808080] hover:text-white"
                }`}
              >
                Crawl Website
              </button>
              <button
                onClick={() => setIsManualInput(true)}
                className={`py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all ${
                  isManualInput ? "bg-[#c4a661] text-[#080808] font-bold" : "text-[#808080] hover:text-white"
                }`}
              >
                Paste Manually
              </button>
            </div>

            <form onSubmit={handleScrape} className="space-y-4">
              {!isManualInput ? (
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#808080] font-bold mb-1.5">
                    Website Address Link
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="e.g., https://ikea-interior.com/brand-spec"
                      className="w-full bg-[#121212] border border-[#222] focus:border-[#c4a661] rounded-lg px-3 py-3 text-xs text-white placeholder-[#505050] focus:ring-1 focus:ring-[#c4a661]/30 focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-[#808080] font-bold mb-1.5">
                    Raw Copied Copy / Sales Statement
                  </label>
                  <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    rows={4}
                    placeholder="Paste the target website contents, landing slogans, features sheet, or product descriptions..."
                    className="w-full bg-[#121212] border border-[#222] focus:border-[#c4a661] rounded-lg p-3 text-xs text-white placeholder-[#505050] focus:outline-none focus:ring-1 focus:ring-[#c4a661]/30 transition-all font-mono"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={scraping}
                className="w-full bg-[#151515] hover:bg-[#1a1a1a] text-white hover:text-[#c4a661] border border-[#222] hover:border-[#c4a661]/40 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {scraping ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#c4a661]" />
                    <span>Scraping System Content...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 text-[#c4a661]" />
                    <span>{isManualInput ? "Lock Text Content" : "Analyze page link"}</span>
                  </>
                )}
              </button>
            </form>

            {/* Extracted Output Segment state indicator */}
            {extractedText && (
              <div className="mt-4 p-3.5 bg-[#121212] border border-[#222] rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
                    ✓ LOCKED PAYLOAD
                  </span>
                  <span className="text-[9px] text-[#505050] font-mono">
                    {extractedText.length} bytes
                  </span>
                </div>
                <p className="text-[11px] text-[#a0a0a0] font-mono line-clamp-2 italic">
                  "{extractedText}"
                </p>
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => setIsRawTextExpanded(!isRawTextExpanded)}
                    className="text-[9px] uppercase tracking-wider text-[#c4a661] hover:underline"
                  >
                    {isRawTextExpanded ? "Hide Full payload" : "Expand Full payload"}
                  </button>
                </div>
                {isRawTextExpanded && (
                  <div className="mt-2 p-2.5 bg-[#080808] border border-[#222] rounded text-[10px] text-gray-400 leading-relaxed max-h-40 overflow-y-auto font-mono">
                    {extractedText}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prompting Options Configuration */}
          <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#c4a661]" />
              <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-white">Cinematic Variables</h2>
            </div>

            {/* Layout type picker */}
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#808080] font-bold mb-1.5">
                Video Crop & Target Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "16:9", label: "Widescreen Cinema (16:9)" },
                  { id: "9:16", label: "Reels / TikTok (9:16)" },
                  { id: "1:1", label: "Square Social (1:1)" },
                  { id: "4:5", label: "Professional Feed (4:5)" }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setVideoType(item.id)}
                    className={`p-2 rounded-lg text-xs text-left border transition-all ${
                      videoType === item.id || videoType.includes(item.id)
                        ? "bg-[#c4a661]/10 border-[#c4a661] text-[#c4a661]"
                        : "bg-[#121212] border-[#222] hover:border-[#333] text-[#808080]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign length */}
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#808080] font-bold mb-1.5 flex justify-between">
                <span>Total targeted Length duration</span>
                <span className="text-[#c4a661] font-mono text-[9px]">{videoLength}</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["15s", "30s", "60s"].map((len) => (
                  <button
                    key={len}
                    onClick={() => setVideoLength(len)}
                    className={`py-1.5 rounded-lg text-xs font-mono border transition-all ${
                      videoLength === len
                        ? "bg-[#c4a661]/10 border-[#c4a661] text-[#c4a661]"
                        : "bg-[#121212] border-[#222] hover:border-[#333] text-[#808080]"
                    }`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone Preference */}
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#808080] font-bold mb-1.5">
                Brand Mood / Art Direction Style
              </label>
              <select
                value={tonePreference}
                onChange={(e) => setTonePreference(e.target.value)}
                className="w-full bg-[#121212] border border-[#222] focus:border-[#c4a661] rounded-lg px-3 py-2 text-xs text-white uppercase tracking-wider font-mono outline-none"
              >
                <option value="cinematic, ultra-photorealistic, style: Scandinavian sleek luxury">
                  Scandinavian Sleek minimal
                </option>
                <option value="epic cinematic trailer style, dramatic backlighting, dark moody theme">
                  Epic Cinematic Trailer
                </option>
                <option value="modern neo-brutalist tech aesthetic, hyper-detailed render">
                  Sleek Brutalist Cyberpunk
                </option>
                <option value="vibrant organic warm natural lighting, cozy and aesthetic feel">
                  Warm Friendly Organic
                </option>
                <option value="luxury commercial style, volumetric shadows, slow graceful pans">
                  Luxury Velvet Commercial
                </option>
              </select>
            </div>

            {/* Creative Hook Style Focus */}
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#808080] font-bold mb-1.5 flex justify-between">
                <span>Creative Storytelling Hook</span>
                <span className="text-[#c4a661] text-[9px] font-mono font-bold uppercase">{creativeHook.replace("_", " ")}</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: "cinematic_story", name: "🎬 Cinematic Story" },
                  { id: "product_focus", name: "🔎 Macro Product" },
                  { id: "high_energy", name: "⚡ High Energy" },
                  { id: "surreal_abstract", name: "🌌 Surreal Art" },
                  { id: "vintage_retro", name: "📼 Vintage VHS" },
                  { id: "sleek_minimal", name: "☀️ Sleek Minimal" }
                ].map((hook) => (
                  <button
                    key={hook.id}
                    type="button"
                    onClick={() => setCreativeHook(hook.id)}
                    className={`py-2 px-2.5 rounded-lg text-[10.5px] text-left border transition-all ${
                      creativeHook === hook.id
                        ? "bg-[#c4a661]/10 border-[#c4a661] text-white font-medium"
                        : "bg-[#121212] border-[#222] hover:border-[#333] text-[#808080] hover:text-[#c4a661]"
                    }`}
                  >
                    {hook.name}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Creativity Angle */}
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#808080] font-bold mb-1.5 flex justify-between">
                <span>AI Creativity Scale (Temperature)</span>
                <span className="text-[#c4a661] text-[9px] font-mono font-bold">
                  {creativityLevel === 0.3 ? "Focused / Consistent (0.3)" : creativityLevel === 0.7 ? "Balanced / Multi-route (0.7)" : "Wild / Experimental (1.15)"}
                </span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: 0.3, label: "Precise" },
                  { val: 0.7, label: "Balanced" },
                  { val: 1.15, label: "High-Creative" }
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setCreativityLevel(item.val)}
                    className={`py-1.5 rounded-lg text-xs font-mono border transition-all ${
                      creativityLevel === item.val
                        ? "bg-[#c4a661]/10 border-[#c4a661] text-[#c4a661] font-bold"
                        : "bg-[#121212] border-[#222] hover:border-[#333] text-[#808080]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Demographics */}
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#808080] font-bold mb-1.5">
                Target Demographic Audience
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Gen Z high fashion influencers, tech buyers"
                className="w-full bg-[#121212] border border-[#222] focus:border-[#c4a661] p-2.5 rounded-lg text-xs text-white placeholder-[#505050] outline-none"
              />
            </div>

            {/* Large Generate Campaign Action */}
            <div className="pt-2">
              <button
                type="button"
                disabled={generating || !extractedText}
                onClick={() => handleGenerate(false)}
                className={`w-full py-4 rounded-xl text-xs uppercase tracking-widest font-black transition-all duration-300 flex items-center justify-center gap-2 ${
                  extractedText
                    ? "bg-gradient-to-r from-[#c4a661] to-[#e8d5a7] text-[#080808] hover:scale-[1.01] hover:shadow-[#c4a661]/10"
                    : "bg-[#161616] text-[#505050] cursor-not-allowed border border-[#222]"
                }`}
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#080808]" />
                    <span>Assembling Single Master Prompt...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#080808] fill-current" />
                    <span>Generate Video campaign plan</span>
                  </>
                )}
              </button>
              {!extractedText && (
                <p className="text-[10px] text-[#606060] text-center mt-2 italic">
                  * Extract website link parameters or click a preset to enable generator
                </p>
              )}
            </div>
          </div>

          {/* Operational Errors */}
          {errorMsg && (
            <div className="p-4 bg-orange-950/20 border border-orange-900/40 rounded-xl flex gap-3 text-orange-200">
              <AlertCircle className="w-5 h-5 shrink-0 text-orange-400" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">Scraper Warning</p>
                <p className="text-xs text-orange-200/90 leading-relaxed font-mono mt-1">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Local Video Model Setup Guide */}
          <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl overflow-hidden shadow-xl">
            <button
              type="button"
              onClick={() => setLocalInstructionsOpen(!localInstructionsOpen)}
              className="w-full flex items-center justify-between p-4 bg-[#121212]/50 hover:bg-[#121212] transition-colors border-b border-[#1a1a1a]"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#c4a661]" />
                <span className="text-[11px] uppercase tracking-wider font-bold text-white">Local Run / Setup Tutorials</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#808080] transition-transform duration-300 ${localInstructionsOpen ? "rotate-180" : ""}`} />
            </button>

            {localInstructionsOpen && (
              <div className="p-4 space-y-4">
                <p className="text-[10.5px] text-[#808080] leading-relaxed">
                  Ready to deploy these generated prompts? Run cinematic AI video synthesis locally on your workstation using open-source architectures:
                </p>

                {/* Local Nav Tabs */}
                <div className="grid grid-cols-3 gap-1 bg-[#121212] p-1 rounded-lg border border-[#222]">
                  <button
                    type="button"
                    onClick={() => setLocalTab("comfyui")}
                    className={`py-1 rounded text-[9px] font-mono uppercase tracking-wider transition-all ${
                      localTab === "comfyui" ? "bg-[#c4a661]/15 text-[#c4a661] font-bold" : "text-[#707070] hover:text-[#c4a661]"
                    }`}
                  >
                    ComfyUI
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocalTab("python")}
                    className={`py-1 rounded text-[9px] font-mono uppercase tracking-wider transition-all ${
                      localTab === "python" ? "bg-[#c4a661]/15 text-[#c4a661] font-bold" : "text-[#707070] hover:text-[#c4a661]"
                    }`}
                  >
                    Python Script
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocalTab("models")}
                    className={`py-1 rounded text-[9px] font-mono uppercase tracking-wider transition-all ${
                      localTab === "models" ? "bg-[#c4a661]/15 text-[#c4a661] font-bold" : "text-[#707070] hover:text-[#c4a661]"
                    }`}
                  >
                    Model Index
                  </button>
                </div>

                {/* Tab Contents */}
                {localTab === "comfyui" && (
                  <div className="space-y-3.5 text-xs text-gray-300">
                    <div className="bg-[#050505] border border-[#222] p-2.5 rounded font-mono text-[10px] space-y-1 text-[#a0a0a0]">
                      <div className="text-[#c4a661] font-bold"># Terminal Prep</div>
                      <div>$ git clone https://github.com/comfyanonymous/ComfyUI.git</div>
                      <div>$ cd ComfyUI && pip install -r requirements.txt</div>
                    </div>
                    <ol className="list-decimal pl-4.5 space-y-2 text-[11px] leading-relaxed text-[#a0a0a0]">
                      <li>
                        Place downloaded weights (SVD/Hunyuan) into your <code className="text-[#c4a661] font-mono bg-[#111] px-1 rounded">models/checkpoints/</code> directory.
                      </li>
                      <li>
                        Run using optimized command line parameters to preserve VRAM budget: <code className="text-[#c4a661] font-mono bg-[#111] px-1 rounded">python main.py --highvram</code> or <code className="text-[#c4a661] font-mono bg-[#111] px-1 rounded">--lowvram</code>.
                      </li>
                      <li>
                        Connect your generated majestic <strong className="text-white">Narrative Paragraph Prompt</strong> to a text conditioning node to command motion!
                      </li>
                    </ol>
                  </div>
                )}

                {localTab === "python" && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono text-[#505050] uppercase">huanVideo Pipeline Script</span>
                      <button
                        type="button"
                        onClick={() => {
                          const scriptText = `import torch\nfrom diffusers import HunyuanVideoPipeline, HunyuanVideoTransformer3DModel\n\n# 1. Load transformer backend\ntransformer = HunyuanVideoTransformer3DModel.from_pretrained(\n    "hunyuanvideo/HunyuanVideo", subfolder="transformer", torch_dtype=torch.bfloat16\n)\npipe = HunyuanVideoPipeline.from_pretrained(\n    "hunyuanvideo/HunyuanVideo", transformer=transformer, torch_dtype=torch.float16\n).to("cuda")\n\nprompt = "Paste generated majestic singleUnifiedMasterPrompt here"\n\n# 2. Run synthesis\nvideo = pipe(prompt=prompt, num_frames=61, width=1280, height=720).frames[0]`;
                          navigator.clipboard.writeText(scriptText);
                          setCopiedText("py_script");
                          setTimeout(() => setCopiedText(null), 1500);
                        }}
                        className="text-[9px] text-[#c4a661] uppercase tracking-wider font-mono hover:underline"
                      >
                        {copiedText === "py_script" ? "✓ Copied" : "Copy Code"}
                      </button>
                    </div>
                    <pre className="text-[9.5px] leading-relaxed font-mono text-gray-400 bg-[#060606] border border-[#222] p-3 rounded-lg overflow-x-auto whitespace-pre block max-h-[160px]">
                      {`import torch
from diffusers import HunyuanVideoPipeline

pipe = HunyuanVideoPipeline.from_pretrained(
  "hunyuanvideo/HunyuanVideo", 
  torch_dtype=torch.float16
).to("cuda")

# Copy the grand cinematic narrative setup
prompt = "[PASTE COPIED NARRATIVE MASTER PROMPT]"

video = pipe(
  prompt, 
  num_frames=61, 
  width=1280, 
  height=720
).frames[0]`}
                    </pre>
                  </div>
                )}

                {localTab === "models" && (
                  <div className="space-y-3.5 text-[11px] leading-relaxed text-[#a0a0a0]">
                    <div className="space-y-1.5 border-b border-[#1a1a1a] pb-2">
                      <p className="text-white text-xs font-semibold flex items-center justify-between">
                        <span>HunyuanVideo (T2V)</span>
                        <span className="text-[#808080] font-mono text-[9px]">~12GB-24GB VRAM</span>
                      </p>
                      <p className="text-[10.5px]">Open-source transformer setting state-of-the-art textual coherence. Perfect for our generated multi-sentence camera blueprint paragraph.</p>
                    </div>
                    <div className="space-y-1.5 border-b border-[#1a1a1a] pb-2">
                      <p className="text-white text-xs font-semibold flex items-center justify-between">
                        <span>CogVideoX (5B/2B)</span>
                        <span className="text-[#808080] font-mono text-[9px]">~16GB VRAM</span>
                      </p>
                      <p className="text-[10.5px]">Exceptional cinematic flow, slow-motion rendering capability, and physical landscape authenticity.</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-white text-xs font-semibold flex items-center justify-between">
                        <span>SVD / SVD-XT</span>
                        <span className="text-[#808080] font-mono text-[9px]">~10GB VRAM</span>
                      </p>
                      <p className="text-[10.5px]">Ideal for rendering rich macro product motion and visual lighting focus loops from simple product statements.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </section>

        {/* Right pane: Outputs space */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Default Hero Presentation */}
          {currentStep === "idle" && (
            <div className="flex-1 min-h-[500px] bg-[#0c0c0c] border border-[#1a1a1a] rounded-2xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(196,166,97,0.03),transparent_70%)]"></div>
              
              <div className="w-14 h-14 rounded-full bg-[#121212] border border-[#222] flex items-center justify-center mb-6 text-[#505050] shadow-xl">
                <Video className="w-6 h-6" />
              </div>

              <h2 className="text-3xl font-serif italic text-white mb-3 tracking-wide">
                Translate Reality into Cinematic Vision
              </h2>
              
              <p className="text-sm text-[#808080] max-w-lg mb-8 leading-relaxed">
                Paste any destination web link or landing pages to instantly scrape brand copy, extract design parameters, and synthesize a <strong className="text-[#c4a661]">single, robust high-fidelity AI video blueprint and sequence timeline</strong> ready for professional promotion tools.
              </p>

              {/* Showcase visual card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-lg">
                <div className="bg-[#121212]/50 border border-[#222] p-4 rounded-xl text-left">
                  <span className="text-[10px] font-mono text-[#c4a661] block mb-1">01 / DISCOVERY</span>
                  <p className="text-xs font-serif italic text-white mb-1">Crawl Page copy</p>
                  <p className="text-[10px] text-[#606060] leading-normal font-sans">Eliminates source telemetry, styles, and extracts real sales features.</p>
                </div>
                <div className="bg-[#121212]/50 border border-[#222] p-4 rounded-xl text-left">
                  <span className="text-[10px] font-mono text-[#c4a661] block mb-1">02 / UNIFIED</span>
                  <p className="text-xs font-serif italic text-white mb-1">Single Master Prompt</p>
                  <p className="text-[10px] text-[#606060] leading-normal font-sans">Compiles a cohesive timeline storyboard paragraph for high-end AI engines.</p>
                </div>
                <div className="bg-[#121212]/50 border border-[#222] p-4 rounded-xl text-left">
                  <span className="text-[10px] font-mono text-[#c4a661] block mb-1">03 / STORYBOARD</span>
                  <p className="text-xs font-serif italic text-white mb-1">Dynamic Sequence</p>
                  <p className="text-[10px] text-[#606060] leading-normal font-sans">Outlines micro-actions, soundscapes, audio cues, and corresponding timing.</p>
                </div>
              </div>
            </div>
          )}

          {/* Active Scraping Loading state */}
          {currentStep === "scraping" && (
            <div className="flex-1 min-h-[500px] bg-[#0c0c0c] border border-[#1a1a1a] rounded-2xl p-8 flex flex-col items-center justify-center text-center">
              <div className="space-y-6 max-w-xs">
                <div className="w-16 h-16 rounded-full border border-dashed border-[#c4a661] flex items-center justify-center animate-spin mx-auto">
                  <Globe className="w-6 h-6 text-[#c4a661]" />
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-[#808080] font-black">Connecting Web Server</h3>
                  <p className="text-[10px] font-mono text-[#c4a661] truncate mt-1">
                    {url || "Initiating crawler..."}
                  </p>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed font-serif italic">
                  Parsing DOM nodes, removing navigational headers, footer links, and filtering core vocabulary attributes...
                </p>
              </div>
            </div>
          )}

          {/* Scraped State view */}
          {currentStep === "scraped" && (
            <div className="flex-1 min-h-[500px] bg-[#0c0c0c] border border-[#1a1a1a] rounded-2xl p-8 flex flex-col items-center justify-center text-center relative">
              <div className="w-14 h-14 rounded-full bg-[#121212] border-2 border-dashed border-emerald-500/50 flex items-center justify-center mb-6 text-emerald-400 animate-pulse">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif italic text-white mb-2">Web Content Stored Successfully</h3>
              <p className="text-xs text-gray-400 max-w-sm mb-6 leading-relaxed">
                Brand features extracted. Adjust target parameters on the left and trigger the AI blueprint manager below!
              </p>
              <button
                onClick={handleGenerate}
                className="bg-[#c4a661] text-[#080808] px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest shadow-xl hover:bg-white transition-all transform hover:scale-[1.01]"
              >
                Assemble AI Video Prompt Strategy
              </button>
            </div>
          )}

          {/* Active Generation AI model spinner */}
          {currentStep === "generating" && (
            <div className="flex-1 min-h-[500px] bg-[#0c0c0c] border border-[#1a1a1a] rounded-2xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden bg-gradient-to-b from-transparent to-[#12110c]">
              <div className="space-y-6 max-w-xs">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full bg-[#c4a661]/10 animate-ping"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#c4a661] animate-spin"></div>
                  <div className="absolute inset-2 bg-[#121212] rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#c4a661] animate-pulse" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-white font-bold">Synthesizing Creative Blueprint</h3>
                  <span className="text-[9px] font-mono text-[#808080] block mt-1">Using Gemini models/gemini-3.5-flash</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed font-mono bg-[#121212] p-3 rounded border border-[#222]">
                  Formulating style layers, camera directions, chronological sequences, and audio cues...
                </p>
              </div>
            </div>
          )}

          {/* ACTIVE HIGH-FIDELITY CAMPAIGN GENERATOR RESULTS */}
          {currentStep === "complete" && marketingPackage && (
            <div className="space-y-6">
              
              {/* BRAND IDENTIFIER CARD */}
              <div className="bg-[#0c0c0c] border border-[#1e1c15] rounded-xl p-6 bg-gradient-to-r from-[#0c0c0c] to-[#12110c] relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#c4a661]/5 rounded-full blur-2xl"></div>
                
                <div className="flex justify-between items-start mb-4 pb-3 border-b border-[#222]">
                  <div>
                    <span className="text-[9px] tracking-widest font-mono text-[#c4a661] block mb-1">
                      ACTIVE BUSINESS CAMPAIGN CONCEPT
                    </span>
                    <h2 className="text-xl font-serif italic text-white flex items-center gap-2">
                      <span>{marketingPackage.brandName}</span>
                      <span className="text-xs text-[#808080] font-normal not-italic">—</span>
                      <span className="text-sm font-light text-[#c4a661] font-sans tracking-wide uppercase">
                        "{marketingPackage.campaignConcept}"
                      </span>
                    </h2>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={generating}
                      onClick={() => handleGenerate(true)}
                      className="text-[10px] bg-gradient-to-r from-[#c4a661]/10 to-[#c4a661]/25 hover:from-[#c4a661]/20 hover:to-[#c4a661]/35 text-[#e8d5a7] border border-[#c4a661]/30 hover:border-[#c4a661]/60 px-3 py-1.5 rounded font-mono tracking-wider transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-[#c4a661] ${generating ? "animate-spin" : ""}`} />
                      <span>Regenerate Variation</span>
                    </button>
                    <button
                      onClick={() => copyString(JSON.stringify(marketingPackage, null, 2), "rawjson")}
                      className="text-[10px] bg-[#121212] hover:bg-[#181818] text-[#c4a661] border border-[#222] px-3 py-1.5 rounded font-mono tracking-wider transition-all flex items-center gap-1.5"
                    >
                      {copiedText === "rawjson" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Raw JSON</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleReset}
                      className="text-[10px] bg-[#1a1711] hover:bg-[#221e16] text-[#e8d5a7] border border-[#302b1f] px-3 py-1.5 rounded uppercase tracking-wider font-mono transition-colors"
                    >
                      New
                    </button>
                  </div>
                </div>

                {/* THE UNIFIED CINEMATIC MASTER PROMPT BLOCK (AS REQUESTED TO GENERATE ONE COMPLETE PROMPT AS OPPOSED TO SCENES) */}
                <div className="bg-[#12110c] border border-[#242116] p-5 rounded-lg relative group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-[#242116] pb-3">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#c4a661] fill-[#c4a661]/20" />
                      <span className="text-[10px] tracking-wider uppercase font-mono text-[#c4a661] font-bold">
                        UNIFIED MASTER AI VIDEO PROMPT
                      </span>
                    </div>

                    {/* Mode Tabs */}
                    <div className="flex bg-[#080808] p-0.5 rounded border border-[#222]">
                      <button
                        onClick={() => setPromptTab("yaml")}
                        className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider rounded transition-all ${
                          promptTab === "yaml"
                            ? "bg-[#c4a661] text-[#080808] font-bold"
                            : "text-[#808080] hover:text-white"
                        }`}
                      >
                        YAML Blueprint Spec
                      </button>
                      <button
                        onClick={() => setPromptTab("cinematic")}
                        className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider rounded transition-all ${
                          promptTab === "cinematic"
                            ? "bg-[#c4a661] text-[#080808] font-bold"
                            : "text-[#808080] hover:text-white"
                        }`}
                      >
                        Narrative Paragraph
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] font-mono text-[#606060]">
                      {promptTab === "yaml" ? "SINGLE UNIFIED CAMPAIGN CONFIGURATION (PASTE INTO VEO / KLING)" : "HIGH-FIDELITY SCENIC PARAGRAPH DESCRIPTION"}
                    </span>

                    <button
                      onClick={() => {
                        const copyText = promptTab === "yaml" 
                          ? buildYamlPrompt(marketingPackage) 
                          : marketingPackage.singleUnifiedMasterPrompt;
                        copyString(copyText, "unifiedprompt");
                      }}
                      className="bg-[#c4a661] hover:bg-white text-[#080808] text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded transition-colors flex items-center gap-1 shrink-0"
                    >
                      {copiedText === "unifiedprompt" ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Active Prompt</span>
                        </>
                      )}
                    </button>
                  </div>

                  {promptTab === "yaml" ? (
                    <pre className="text-[11px] text-gray-300 font-mono bg-[#080808] p-4 rounded border border-[#1a1a1a] overflow-x-auto whitespace-pre-wrap select-all cursor-pointer hover:border-[#c4a661]/40 transition-colors leading-relaxed">
                      {buildYamlPrompt(marketingPackage)}
                    </pre>
                  ) : (
                    <p className="text-xs text-white leading-relaxed italic font-serif bg-[#080808] p-4 rounded border border-[#1a1a1a] select-all cursor-pointer hover:border-[#c4a661]/40 transition-colors">
                      "{marketingPackage.singleUnifiedMasterPrompt}"
                    </p>
                  )}
                  
                  <div className="mt-3 flex flex-wrap items-center justify-between text-[9px] text-[#606060] font-mono gap-y-2">
                    <span>Target format: {videoType} | Art Focus: {creativeHook.replace("_", " ").toUpperCase()}</span>
                    <span className="text-[#c4a661] font-bold">Variation Iteration: #{variationSeed}</span>
                  </div>
                </div>
              </div>

              {/* TIMELINE METADATA DETAILED HIERARCHY GRID (SOPHISTICATED DARK DESIGN STYLE) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Visual Settings card */}
                <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4 border-b border-[#121212] pb-2">
                    <span className="w-1.5 h-1.5 bg-[#c4a661] rounded-full"></span>
                    <h4 className="text-[10px] tracking-widest uppercase font-bold text-[#808080]">Campaign Visual Metadata</h4>
                  </div>
                  
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-[10px] text-[#505050] uppercase tracking-wider font-bold block">Prompt Blueprint Name</span>
                      <p className="text-white font-serif italic mt-0.5">{marketingPackage.metadata.promptName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#505050] uppercase tracking-wider font-bold block">Base Aesthetic Preset Style</span>
                      <p className="text-gray-300 font-mono text-[11px] mt-0.5">{marketingPackage.metadata.baseStyle}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#505050] uppercase tracking-wider font-bold block">Physical Scene Environment Setting</span>
                      <p className="text-[#a0a0a0] leading-relaxed mt-0.5">{marketingPackage.metadata.environmentDescription}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#505050] uppercase tracking-wider font-bold block">Cinematography & Lens Spec</span>
                      <p className="text-[#e2d7c5] leading-relaxed mt-0.5 font-sans italic">{marketingPackage.metadata.cameraSetup}</p>
                    </div>
                  </div>
                </div>

                {/* Strategy tags element */}
                <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4 border-b border-[#121212] pb-2">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                      <h4 className="text-[10px] tracking-widest uppercase font-bold text-[#808080]">Key Subject Elements</h4>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] text-[#505050] uppercase tracking-wider font-bold block">Starting Elements visible</span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {marketingPackage.metadata.keyElements.map((el, i) => (
                            <span key={i} className="bg-[#121212] border border-[#222] text-white px-2.5 py-1 rounded text-[10px] font-mono">
                              • {el}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#505050] uppercase tracking-wider font-bold block">Emerging Assembled Elements</span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {marketingPackage.metadata.assembledElements.map((el, i) => (
                            <span key={i} className="bg-[#1e1a12] border border-[#332e22] text-[#e8d5a7] px-2.5 py-1 rounded text-[10px] font-serif italic">
                              ✦ {el}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#505050] uppercase tracking-wider font-bold block">Negative Constraint parameters</span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {marketingPackage.metadata.negativePrompts?.map((el, i) => (
                            <span key={i} className="bg-[#110e0e] border border-[#2d1b1b] text-red-300 px-2 py-0.5 rounded text-[9px] font-mono">
                              🚫 {el}
                            </span>
                          )) || <span className="text-[10px] text-[#404040]">None requested</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#121212] text-[10px] text-[#707070] italic">
                    Aspect Ratio: {marketingPackage.metadata.aspectRatio || videoType}
                  </div>
                </div>
              </div>

              {/* TIMELINE PROGRESSION SEQUENCE AS REQUESTED */}
              <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-6">
                <div className="flex justify-between items-center mb-4 border-b border-[#121212] pb-3">
                  <div className="flex items-center gap-2">
                    <Clapperboard className="w-4 h-4 text-[#c4a661]" />
                    <h4 className="text-xs tracking-widest uppercase font-bold text-white">Visual Timeline Progression ({videoLength})</h4>
                  </div>
                  <span className="text-[10px] bg-[#12110c] text-[#c4a661] border border-[#242116] px-2 py-0.5 rounded font-mono">
                    {marketingPackage.timeline?.length || 0} SECTIONS
                  </span>
                </div>

                <div className="space-y-4">
                  {marketingPackage.timeline.map((item, idx) => (
                    <div key={idx} className="bg-[#121212] border border-[#222] rounded-lg p-4 flex flex-col md:flex-row md:items-start gap-4 hover:border-[#c4a661]/20 transition-all">
                      
                      {/* Sequence label column */}
                      <div className="md:w-28 shrink-0 flex items-center md:flex-col md:items-start gap-2 md:gap-1.5">
                        <span className="w-6 h-6 rounded-full bg-[#1e1a12] border border-[#c4a661]/40 text-[#c4a661] text-[11px] font-mono font-bold flex items-center justify-center">
                          {item.sequence}
                        </span>
                        <div>
                          <span className="text-[10px] text-[#606060] uppercase block leading-none md:mt-1">timestamp</span>
                          <span className="text-xs text-white font-mono font-bold">{item.timestamp}</span>
                        </div>
                      </div>

                      {/* Details block */}
                      <div className="flex-1 space-y-2">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-[#505050] block tracking-wider">Screen Visual Action</span>
                          <p className="text-xs text-white leading-relaxed mt-0.5 font-sans font-medium">{item.action}</p>
                        </div>
                        <div className="pt-1.5 border-t border-[#1a1a1a] flex items-center gap-2 text-[10px] text-gray-400">
                          <span className="text-[9px] font-mono uppercase text-[#c4a661] shrink-0 font-bold">🔉 Audio FX Cue:</span>
                          <span className="italic">{item.audio}</span>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              {/* SOCIAL MEDIA AND DISTRIBUTION COPY CARD */}
              <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded-xl p-6 relative">
                <div className="flex items-center gap-2 mb-4 border-b border-[#121212] pb-3">
                  <Share2 className="w-4 h-4 text-[#c4a661]" />
                  <h4 className="text-xs tracking-widest uppercase font-bold text-white">Social Campaign Post copy & Tags</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  <div className="md:col-span-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-[#505050] uppercase tracking-wider font-bold">Caption Copy (Auto-generated)</span>
                      <button
                        onClick={() => copyString(marketingPackage.suggestedPostCopy, "postcopy")}
                        className="text-[10px] text-[#c4a661] hover:underline uppercase tracking-wider font-mono flex items-center gap-1"
                      >
                        {copiedText === "postcopy" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Copy Caption
                      </button>
                    </div>
                    <div className="bg-[#121212] border border-[#222] p-3 rounded-lg leading-relaxed text-gray-300 font-serif italic text-xs select-all">
                      "{marketingPackage.suggestedPostCopy}"
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] text-[#505050] uppercase tracking-wider font-bold block mb-1">Hashtags</span>
                      <div className="flex flex-wrap gap-1">
                        {marketingPackage.suggestedHashtags.map((tag, idx) => (
                          <span key={idx} className="bg-[#121212] border border-[#222] text-[#c4a661] text-[10px] font-mono px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#505050] uppercase tracking-wider font-bold block mb-1">Expert Marketing Tip</span>
                      <p className="text-[11px] text-gray-400 leading-relaxed italic bg-[#15130e] p-2.5 rounded border border-[#2d2719] text-[#e2d7c5]">
                        💡 {marketingPackage.marketingTip}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </section>

      </main>

      {/* Footer */}
      <footer className="mt-auto px-6 py-4 border-t border-[#1a1a1a] bg-[#050505] flex flex-col md:flex-row justify-between items-center gap-2 text-[#505050] text-[10px] tracking-widest uppercase">
        <div>
          STATUS: <span className="text-emerald-500 opacity-60">ENGINES ACTIVE</span> &bull; CONSTRAINTS: 45K CHAR MAX
        </div>
        <div>
          &copy; {new Date().getFullYear()} VISIONARY STUDIO LABS INC &bull; LICENSED IN AI PREVIEWS
        </div>
      </footer>

    </div>
  );
}

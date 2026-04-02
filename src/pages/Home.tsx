import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Search, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Loader2, 
  AlertCircle, 
  ExternalLink, 
  CheckCircle2,
  ChevronRight,
  Ghost,
  History,
  Mic2,
  ChevronDown,
  CloudUpload,
  CloudOff,
  Copy,
  Check,
  Download,
  Plus,
  X,
  BarChart3,
  Settings as SettingsIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";
import { storage } from "../lib/storage";
import { generateTrueCrimeContent, generateExtendedScript, VISUAL_STORYTELLING_RULES } from "../services/geminiService";
import { GenerationResponse, ImageryStyle, ScriptStyle, Generation, ImagePrompt, ContentStyle } from "../types";
import { useAuth } from "../context/AuthContext";
import { db, handleFirestoreError, OperationType, uploadImage } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { 
  getUserPreferences, 
  saveUserPreferences, 
  getContentStyles, 
  saveContentStyle, 
  getVisualPresets 
} from "../services/userService";
import ImagePromptCard from "../components/ImagePromptCard";
import CharacterReference from "../components/CharacterReference";

export default function Home() {
  const { user, login } = useAuth();
  const [topic, setTopic] = useState("");
  const [scriptStyle, setScriptStyle] = useState<ScriptStyle>("storytelling");
  const [imageryStyle, setImageryStyle] = useState<ImageryStyle>("realistic");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"research" | "script" | "prompts" | "extended" | "seo">("research");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isGeneratingExtended, setIsGeneratingExtended] = useState(false);
  const [extendedScript, setExtendedScript] = useState<string | null>(null);
  const [extendedImagePrompts, setExtendedImagePrompts] = useState<any[] | null>(null);
  const [characterReferenceUrl, setCharacterReferenceUrl] = useState<string | null>(null);
  const [characterDescription, setCharacterDescription] = useState("");

  // Cloud Settings State
  const [customStyles, setCustomStyles] = useState<ContentStyle[]>([]);
  const [visualRules, setVisualRules] = useState(VISUAL_STORYTELLING_RULES);
  const [isAddingStyle, setIsAddingStyle] = useState(false);
  const [styleForm, setStyleForm] = useState({ name: "", prompt: "" });

  // Load from IndexedDB on mount
  useEffect(() => {
    const loadSaved = async () => {
      const savedResult = await storage.getItem<any>('truecrime_current_generation');
      if (savedResult) {
        try {
          setResult(savedResult.result);
          setExtendedScript(savedResult.extendedScript || null);
          setExtendedImagePrompts(savedResult.extendedImagePrompts || null);
          setCharacterReferenceUrl(savedResult.characterReferenceUrl || null);
          setCharacterDescription(savedResult.characterDescription || "");
          setTopic(savedResult.topic || "");
          setScriptStyle(savedResult.scriptStyle || "storytelling");
          setImageryStyle(savedResult.imageryStyle || "realistic");
        } catch (e) {
          console.error("Failed to load saved generation", e);
        }
      }
    };
    loadSaved();
  }, []);

  // Load cloud settings
  useEffect(() => {
    const loadCloudSettings = async () => {
      if (!user) return;
      try {
        const [prefs, styles, presets] = await Promise.all([
          getUserPreferences(user.uid),
          getContentStyles(user.uid),
          getVisualPresets(user.uid)
        ]);
        
        // Find active preset
        const activePreset = presets.find(p => p.isActive);
        if (activePreset) {
          setVisualRules(activePreset.prompt);
        } else {
          // Fallback to system default
          setVisualRules(VISUAL_STORYTELLING_RULES);
        }
        
        setCustomStyles(styles);
      } catch (err) {
        console.error("Error loading cloud settings in Home:", err);
      }
    };
    loadCloudSettings();
  }, [user]);

  // Save to IndexedDB whenever state changes
  useEffect(() => {
    storage.setItem('truecrime_current_generation', {
      result,
      extendedScript,
      extendedImagePrompts,
      characterReferenceUrl,
      characterDescription,
      topic,
      scriptStyle,
      imageryStyle
    });
  }, [result, extendedScript, extendedImagePrompts, topic, scriptStyle, imageryStyle, characterReferenceUrl, characterDescription]);

  const saveToCloud = useCallback(async (
    data: GenerationResponse, 
    currentTopic: string = topic, 
    currentScriptStyle: ScriptStyle = scriptStyle, 
    currentImageryStyle: ImageryStyle = imageryStyle, 
    currentExtendedScript: string | null = extendedScript, 
    currentExtendedImagePrompts: any[] | null = extendedImagePrompts,
    currentCharacterReferenceUrl: string | null = characterReferenceUrl,
    currentCharacterDescription: string = characterDescription
  ) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // 1. Upload character reference if it's base64
      let characterRefUrl = currentCharacterReferenceUrl;
      if (characterRefUrl && characterRefUrl.startsWith('data:')) {
        const path = `generations/${user.uid}/${Date.now()}_character.png`;
        characterRefUrl = await uploadImage(characterRefUrl, path);
      }

      // 2. Upload main image prompts if they are base64
      const processedImagePrompts = await Promise.all(
        data.imagePrompts.map(async (p, idx) => {
          if (p.generatedImageUrl && p.generatedImageUrl.startsWith('data:')) {
            const path = `generations/${user.uid}/${Date.now()}_scene_${idx}.png`;
            const url = await uploadImage(p.generatedImageUrl, path);
            return { ...p, generatedImageUrl: url };
          }
          return p;
        })
      );

      // 3. Upload extended image prompts if they are base64
      let processedExtendedImagePrompts = currentExtendedImagePrompts;
      if (processedExtendedImagePrompts) {
        processedExtendedImagePrompts = await Promise.all(
          processedExtendedImagePrompts.map(async (p, idx) => {
            if (p.generatedImageUrl && p.generatedImageUrl.startsWith('data:')) {
              const path = `generations/${user.uid}/${Date.now()}_extended_${idx}.png`;
              const url = await uploadImage(p.generatedImageUrl, path);
              return { ...p, generatedImageUrl: url };
            }
            return p;
          })
        );
      }

      const generationData: any = {
        uid: user.uid,
        topic: currentTopic,
        scriptStyle: currentScriptStyle,
        imageryStyle: currentImageryStyle,
        research: data.research,
        script: data.script,
        imagePrompts: processedImagePrompts,
        characterReferenceUrl: characterRefUrl,
        characterDescription: currentCharacterDescription,
        createdAt: serverTimestamp()
      };

      const finalExtendedScript = currentExtendedScript || data.extendedScript;
      if (finalExtendedScript) {
        generationData.extendedScript = finalExtendedScript;
      }

      if (processedExtendedImagePrompts) {
        generationData.extendedImagePrompts = processedExtendedImagePrompts;
      }

      await addDoc(collection(db, 'generations'), generationData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'generations');
    } finally {
      setIsSaving(false);
    }
  }, [user, topic, scriptStyle, imageryStyle, extendedScript, extendedImagePrompts, characterReferenceUrl, characterDescription]);

  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleImageGenerated = (index: number, url: string, isExtended: boolean = false) => {
    if (isExtended && extendedImagePrompts) {
      const newPrompts = [...extendedImagePrompts];
      newPrompts[index] = { ...newPrompts[index], generatedImageUrl: url };
      setExtendedImagePrompts(newPrompts);
      if (user) {
        saveToCloud(result!, topic, scriptStyle, imageryStyle, extendedScript, newPrompts, characterReferenceUrl, characterDescription);
      }
    } else if (!isExtended && result) {
      const newPrompts = [...result.imagePrompts];
      newPrompts[index] = { ...newPrompts[index], generatedImageUrl: url };
      const updatedResult = { ...result, imagePrompts: newPrompts };
      setResult(updatedResult);
      if (user) {
        saveToCloud(updatedResult, topic, scriptStyle, imageryStyle, extendedScript, extendedImagePrompts, characterReferenceUrl, characterDescription);
      }
    }
  };

  const handlePromptEdit = (index: number, newPrompt: string, isExtended: boolean = false) => {
    if (isExtended && extendedImagePrompts) {
      const newPrompts = [...extendedImagePrompts];
      newPrompts[index] = { ...newPrompts[index], imagePrompt: newPrompt };
      setExtendedImagePrompts(newPrompts);
      if (user) {
        saveToCloud(result!, topic, scriptStyle, imageryStyle, extendedScript, newPrompts, characterReferenceUrl, characterDescription);
      }
    } else if (!isExtended && result) {
      const newPrompts = [...result.imagePrompts];
      newPrompts[index] = { ...newPrompts[index], imagePrompt: newPrompt };
      const updatedResult = { ...result, imagePrompts: newPrompts };
      setResult(updatedResult);
      if (user) {
        saveToCloud(updatedResult, topic, scriptStyle, imageryStyle, extendedScript, extendedImagePrompts, characterReferenceUrl, characterDescription);
      }
    }
  };

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(sectionId);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  };

  const getFullContentString = () => {
    if (!result) return "";
    let content = `CASE INVESTIGATION: ${result.research.suspectName}\n\n`;
    content += `WHO THEY WERE:\n${result.research.whoTheyWere}\n\n`;
    content += `THE INCIDENT:\n${result.research.whatHappened}\n\n`;
    content += `THE OUTCOME:\n${result.research.howTheyEndedUpThere}\n\n`;
    content += `KEY FACTS:\n${result.research.keyFacts.map(f => `- ${f}`).join('\n')}\n\n`;
    content += `SCRIPT:\n${result.script}\n\n`;
    content += `STORYBOARD:\n`;
    result.imagePrompts.forEach(p => {
      content += `Scene ${p.sceneNumber}:\n`;
      content += `Image Prompt: ${p.imagePrompt}\n`;
      content += `Animation: ${p.animationPrompt}\n`;
      content += `Script Line: ${p.scriptLine}\n\n`;
    });
    
    if (extendedScript) {
      content += `EXTENDED SCRIPT:\n${extendedScript}\n\n`;
      if (extendedImagePrompts) {
        content += `EXTENDED STORYBOARD:\n`;
        extendedImagePrompts.forEach(p => {
          content += `Scene ${p.sceneNumber}:\n`;
          content += `Image Prompt: ${p.imagePrompt}\n`;
          content += `Animation: ${p.animationPrompt}\n`;
          content += `Script Line: ${p.scriptLine}\n\n`;
        });
      }
    }
    return content;
  };

  const handleAddStyle = async () => {
    if (!user || !styleForm.name || !styleForm.prompt) return;
    try {
      const id = await saveContentStyle(user.uid, {
        name: styleForm.name,
        prompt: styleForm.prompt,
        isDefault: false
      });
      const newStyle: ContentStyle = {
        id,
        uid: user.uid,
        name: styleForm.name,
        prompt: styleForm.prompt,
        isDefault: false,
        createdAt: new Date()
      };
      setCustomStyles([newStyle, ...customStyles]);
      setScriptStyle(styleForm.name); // Select the new style
      setIsAddingStyle(false);
      setStyleForm({ name: "", prompt: "" });
    } catch (err) {
      console.error("Failed to add style from Home:", err);
      setError("Failed to save custom style.");
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setExtendedScript(null);
    setExtendedImagePrompts(null);
    setSaveSuccess(false);

    try {
      // Find custom style prompt if applicable
      const customStyle = customStyles.find(s => s.name === scriptStyle);
      const customStylePrompt = customStyle?.prompt;

      // Add a 60-second timeout to the generation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request timed out. The research is taking longer than expected. Please try again with a more specific topic.")), 60000)
      );

      const data = await Promise.race([
        generateTrueCrimeContent(
          topic, 
          scriptStyle, 
          imageryStyle, 
          characterDescription,
          customStylePrompt,
          visualRules
        ),
        timeoutPromise
      ]) as GenerationResponse;
      
      setResult(data);
      if (data.characterDescription) {
        setCharacterDescription(data.characterDescription);
      }
      setActiveTab("research");
      setIsLoading(false);
      
      // Auto-save to cloud if user is logged in (don't block UI)
      if (user) {
        saveToCloud(data, topic, scriptStyle, imageryStyle, null, null, characterReferenceUrl, data.characterDescription || characterDescription);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate content. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateExtended = async () => {
    if (!result) return;
    setIsGeneratingExtended(true);
    try {
      const customStyle = customStyles.find(s => s.name === scriptStyle);
      const customStylePrompt = customStyle?.prompt;

      // Add a 90-second timeout for extended script as it's much longer
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Extended generation timed out. The script is very long and may have hit a limit. Please try again.")), 90000)
      );

      const { script, imagePrompts } = await Promise.race([
        generateExtendedScript(
          result.research, 
          scriptStyle, 
          imageryStyle, 
          characterDescription,
          customStylePrompt,
          visualRules
        ),
        timeoutPromise
      ]) as { script: string, imagePrompts: ImagePrompt[] };
      
      setExtendedScript(script);
      setExtendedImagePrompts(imagePrompts);
      setActiveTab("extended");
      setIsGeneratingExtended(false);
      
      // Update cloud if user is logged in
      if (user) {
        saveToCloud(result, topic, scriptStyle, imageryStyle, script, imagePrompts, characterReferenceUrl, characterDescription);
      }
    } catch (err: any) {
      console.error("Failed to generate extended script", err);
      setError(err.message || "Failed to generate the 5-minute script and prompts. Please try again.");
    } finally {
      setIsGeneratingExtended(false);
    }
  };

  const loadingMessages = [
    "Scouring the dark corners of the web...",
    "Verifying suspect details and timelines...",
    "Crafting a gripping 90-second narrative...",
    "Generating 15 cinematic scenery prompts...",
    "Ensuring character and style consistency...",
    "Finalizing animation vibes for each scene...",
  ];

  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  const scriptOptions = useMemo(() => {
    const baseOptions: { value: string; label: string }[] = [
      { value: "storytelling", label: "Storytelling" },
      { value: "journalist", label: "Journalist" },
      { value: "narrator", label: "Narrator" },
      { value: "incident reporting", label: "Incident Reporting" },
      { value: "newsroom", label: "Newsroom" },
    ];
    
    const customOptions = customStyles.map(s => ({
      value: s.name,
      label: s.name
    }));

    return [...baseOptions, ...customOptions];
  }, [customStyles]);

  const imageryOptions: { value: ImageryStyle; label: string }[] = [
    { value: "realistic", label: "Realistic" },
    { value: "anime", label: "Anime" },
    { value: "3d", label: "3D Render" },
  ];

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="max-w-3xl mx-auto text-center mb-8 md:mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6 tracking-tight leading-tight">
            Research. Script. <span className="text-[#ff4e00]">Visualize.</span>
          </h2>
          <p className="text-white/60 text-base md:text-lg mb-6 md:mb-8 leading-relaxed">
            The ultimate tool for faceless True Crime & Mystery creators. 
            Rigorous research, high-engaging scripts, and consistent AI imagery prompts in seconds.
          </p>
        </motion.div>

        {/* Search Form */}
        <form onSubmit={handleGenerate} className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#ff4e00] to-[#ff8c00] rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex flex-col gap-3 p-2 bg-[#151515] border border-white/10 rounded-2xl shadow-2xl">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="text"
                placeholder="Enter a crime, mystery, or suspect's name..."
                className="w-full bg-transparent border-none focus:ring-0 pl-12 pr-4 py-3 md:py-4 text-base md:text-lg placeholder:text-white/20"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-2 pb-2 sm:pb-0">
              <div className="flex gap-2 flex-1">
                <div className="flex-1 flex gap-1">
                  <CustomSelect
                    value={scriptStyle}
                    onChange={(val) => setScriptStyle(val as ScriptStyle)}
                    options={scriptOptions}
                    disabled={isLoading}
                  />
                  {user && (
                    <button
                      type="button"
                      onClick={() => setIsAddingStyle(true)}
                      className="p-2 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-[#ff4e00] hover:bg-[#ff4e00]/10 transition-all shrink-0"
                      title="Add Custom Style"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <CustomSelect
                  value={imageryStyle}
                  onChange={(val) => setImageryStyle(val as ImageryStyle)}
                  options={imageryOptions}
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !topic.trim()}
                className={cn(
                  "px-6 md:px-8 py-3 md:py-4 bg-[#ff4e00] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2",
                  isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-[#ff6a00] hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Ghost className="w-5 h-5" />}
                {isLoading ? "Researching..." : "Generate"}
              </button>
            </div>
          </div>
        </form>

        {/* Style Modal */}
        <AnimatePresence>
          {isAddingStyle && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddingStyle(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-[#151515] border border-white/10 rounded-[2rem] p-8 shadow-2xl text-left"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-white">Create New Style</h3>
                  <button onClick={() => setIsAddingStyle(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-5 h-5 text-white/40" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Style Name</label>
                    <input 
                      type="text"
                      value={styleForm.name}
                      onChange={(e) => setStyleForm({ ...styleForm, name: e.target.value })}
                      placeholder="e.g., Dramatic Narrator, News Anchor..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-[#ff4e00] focus:border-[#ff4e00] transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Style Prompt</label>
                    <textarea 
                      value={styleForm.prompt}
                      onChange={(e) => setStyleForm({ ...styleForm, prompt: e.target.value })}
                      placeholder="Describe the tone, vocabulary, and flow of this style..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-[#ff4e00] focus:border-[#ff4e00] transition-all min-h-[150px] resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-10">
                  <button 
                    onClick={() => setIsAddingStyle(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-white/60 hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddStyle}
                    disabled={!styleForm.name || !styleForm.prompt}
                    className="flex-1 py-4 bg-[#ff4e00] text-white font-bold rounded-2xl hover:shadow-[0_0_20px_rgba(255,78,0,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Style
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {isLoading && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-[#ff4e00] font-mono text-sm animate-pulse"
          >
            {loadingMessages[loadingMsgIndex]}
          </motion.p>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </motion.div>
        )}
      </div>

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Sidebar Tabs */}
            <div className="lg:col-span-3 space-y-2">
              <button
                onClick={() => setActiveTab("research")}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all text-left group",
                  activeTab === "research" ? "bg-[#ff4e00] text-white shadow-lg shadow-[#ff4e00]/20" : "bg-white/5 hover:bg-white/10 text-white/60"
                )}
              >
                <Search className="w-5 h-5" />
                <div className="flex-1">
                  <p className="font-bold text-sm">Research Data</p>
                  <p className="text-[10px] opacity-60 uppercase tracking-wider">Suspect & Facts</p>
                </div>
                <ChevronRight className={cn("w-4 h-4 transition-transform", activeTab === "research" ? "rotate-90" : "group-hover:translate-x-1")} />
              </button>
              <button
                onClick={() => setActiveTab("script")}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all text-left group",
                  activeTab === "script" ? "bg-[#ff4e00] text-white shadow-lg shadow-[#ff4e00]/20" : "bg-white/5 hover:bg-white/10 text-white/60"
                )}
              >
                <FileText className="w-5 h-5" />
                <div className="flex-1">
                  <p className="font-bold text-sm">90s Script</p>
                  <p className="text-[10px] opacity-60 uppercase tracking-wider">{scriptStyle} style</p>
                </div>
                <ChevronRight className={cn("w-4 h-4 transition-transform", activeTab === "script" ? "rotate-90" : "group-hover:translate-x-1")} />
              </button>
              <button
                onClick={() => setActiveTab("prompts")}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all text-left group",
                  activeTab === "prompts" ? "bg-[#ff4e00] text-white shadow-lg shadow-[#ff4e00]/20" : "bg-white/5 hover:bg-white/10 text-white/60"
                )}
              >
                <ImageIcon className="w-5 h-5" />
                <div className="flex-1">
                  <p className="font-bold text-sm">Visual Prompts</p>
                  <p className="text-[10px] opacity-60 uppercase tracking-wider">15 Scenes • {imageryStyle}</p>
                </div>
                <ChevronRight className={cn("w-4 h-4 transition-transform", activeTab === "prompts" ? "rotate-90" : "group-hover:translate-x-1")} />
              </button>

              <button
                onClick={() => setActiveTab("seo")}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all text-left group",
                  activeTab === "seo" ? "bg-[#ff4e00] text-white shadow-lg shadow-[#ff4e00]/20" : "bg-white/5 hover:bg-white/10 text-white/60"
                )}
              >
                <BarChart3 className="w-5 h-5" />
                <div className="flex-1">
                  <p className="font-bold text-sm">SEO & Metadata</p>
                  <p className="text-[10px] opacity-60 uppercase tracking-wider">Title • Desc • Tags</p>
                </div>
                <ChevronRight className={cn("w-4 h-4 transition-transform", activeTab === "seo" ? "rotate-90" : "group-hover:translate-x-1")} />
              </button>

              {/* Extended Script Button */}
              <button
                onClick={activeTab === "extended" ? () => {} : handleGenerateExtended}
                disabled={isGeneratingExtended}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all text-left group mt-4 border border-[#ff4e00]/20",
                  activeTab === "extended" ? "bg-[#ff4e00] text-white shadow-lg shadow-[#ff4e00]/20" : "bg-[#ff4e00]/5 hover:bg-[#ff4e00]/10 text-[#ff4e00]"
                )}
              >
                {isGeneratingExtended ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic2 className="w-5 h-5" />}
                <div className="flex-1">
                  <p className="font-bold text-sm">5m Extended Script</p>
                  <p className="text-[10px] opacity-60 uppercase tracking-wider">{isGeneratingExtended ? "Generating..." : "On Demand • 300s"}</p>
                </div>
                {!isGeneratingExtended && <ChevronRight className={cn("w-4 h-4 transition-transform", activeTab === "extended" ? "rotate-90" : "group-hover:translate-x-1")} />}
              </button>

              <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-2xl">
                <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Cloud Sync</h4>
                <div className="space-y-4">
                  {user ? (
                    <button
                      onClick={() => result && saveToCloud(result, topic, scriptStyle, imageryStyle, extendedScript || undefined, extendedImagePrompts || undefined)}
                      disabled={isSaving || saveSuccess}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all border",
                        saveSuccess 
                          ? "bg-green-500/10 border-green-500/20 text-green-500" 
                          : "bg-[#ff4e00]/10 border-[#ff4e00]/20 text-[#ff4e00] hover:bg-[#ff4e00]/20"
                      )}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : saveSuccess ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <CloudUpload className="w-4 h-4" />
                      )}
                      {isSaving ? "Saving..." : saveSuccess ? "Saved to Cloud" : "Save to Cloud"}
                    </button>
                  ) : (
                    <button
                      onClick={login}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all border bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    >
                      <CloudOff className="w-4 h-4" />
                      Login to Save
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 p-6 bg-white/5 border border-white/10 rounded-2xl">
                <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Quick Stats</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Research Accuracy</span>
                    <span className="text-xs font-mono text-[#ff4e00]">99.8%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Script Duration</span>
                    <span className="text-xs font-mono text-[#ff4e00]">~92s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Scene Prompts</span>
                    <span className="text-xs font-mono text-[#ff4e00]">15/15</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-9">
              <div className="bg-[#151515] border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[600px]">
                <AnimatePresence mode="wait">
                  {activeTab === "research" && (
                    <motion.div
                      key="research-tab"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-8 md:p-12"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <History className="w-6 h-6 text-[#ff4e00]" />
                          <h3 className="text-2xl font-bold tracking-tight">Case Investigation</h3>
                        </div>
                        <button
                          onClick={() => copyToClipboard(getFullContentString(), 'research-all')}
                          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white/60 hover:text-white transition-all"
                        >
                          {copiedSection === 'research-all' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          {copiedSection === 'research-all' ? "Copied All" : "Copy All Data"}
                        </button>
                      </div>

                      <CharacterReference 
                        topic={topic}
                        imageryStyle={imageryStyle}
                        characterDescription={characterDescription}
                        onReferenceChange={(url) => {
                          setCharacterReferenceUrl(url);
                          if (result) {
                            saveToCloud(result, topic, scriptStyle, imageryStyle, extendedScript, extendedImagePrompts, url, characterDescription);
                          }
                        }}
                        initialUrl={characterReferenceUrl || undefined}
                      />

                      <div className="mb-12">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-4">Character Description (for consistency)</label>
                        <textarea
                          value={characterDescription}
                          onChange={(e) => setCharacterDescription(e.target.value)}
                          placeholder="Describe the character's appearance in full detail: Age range, Ethnicity, Skin tone, Face shape, Hair, Build, Clothing, Accessories..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white/80 placeholder:text-white/20 focus:ring-1 focus:ring-[#ff4e00] focus:border-[#ff4e00] transition-all min-h-[100px]"
                        />
                        <p className="text-[10px] text-white/30 mt-2">
                          This description will be used across ALL scenes to maintain character consistency.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        <div className="space-y-6">
                          <div>
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Suspect Name</label>
                            <p className="text-xl font-bold text-white">{result.research.suspectName}</p>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Who they were</label>
                            <p className="text-white/70 leading-relaxed">{result.research.whoTheyWere}</p>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div>
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">The Incident</label>
                            <p className="text-white/70 leading-relaxed">{result.research.whatHappened}</p>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">The Outcome</label>
                            <p className="text-white/70 leading-relaxed">{result.research.howTheyEndedUpThere}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-12">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-4">Key Evidence & Facts</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {result.research.keyFacts.map((fact, i) => (
                            <div key={i} className="flex gap-3 p-4 bg-white/5 border border-white/5 rounded-xl">
                              <CheckCircle2 className="w-5 h-5 text-[#ff4e00] shrink-0" />
                              <p className="text-sm text-white/80">{fact}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {result.research.sources && result.research.sources.length > 0 && (
                        <div>
                          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-4">Verified Sources</label>
                          <div className="flex flex-wrap gap-3">
                            {result.research.sources.map((source, i) => (
                              <a
                                key={i}
                                href={source.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all"
                              >
                                <ExternalLink className="w-3 h-3" />
                                {source.title}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "script" && (
                    <motion.div
                      key="script-tab"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-8 md:p-12"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <Mic2 className="w-6 h-6 text-[#ff4e00]" />
                          <h3 className="text-2xl font-bold tracking-tight">Production Script</h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => copyToClipboard(getFullContentString(), 'script-all')}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white/60 hover:text-white transition-all"
                          >
                            {copiedSection === 'script-all' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            {copiedSection === 'script-all' ? "Copied All" : "Copy All"}
                          </button>
                          <div className="px-3 py-1 bg-[#ff4e00]/10 border border-[#ff4e00]/20 rounded-full text-[10px] font-bold text-[#ff4e00] uppercase tracking-widest">
                            {scriptStyle} Style
                          </div>
                        </div>
                      </div>

                      <div className="prose prose-invert prose-orange max-w-none prose-p:text-white/80 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-[#ff4e00]">
                        <ReactMarkdown>{result.script}</ReactMarkdown>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "prompts" && (
                    <motion.div
                      key="prompts-tab"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-8 md:p-12"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <Video className="w-6 h-6 text-[#ff4e00]" />
                          <h3 className="text-2xl font-bold tracking-tight">Visual Storyboard</h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => copyToClipboard(getFullContentString(), 'prompts-all')}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white/60 hover:text-white transition-all"
                          >
                            {copiedSection === 'prompts-all' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            {copiedSection === 'prompts-all' ? "Copied All" : "Copy All"}
                          </button>
                          <div className="px-3 py-1 bg-[#ff4e00]/10 border border-[#ff4e00]/20 rounded-full text-[10px] font-bold text-[#ff4e00] uppercase tracking-widest">
                            {imageryStyle} Style
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {result.imagePrompts && result.imagePrompts.length > 0 ? (
                          result.imagePrompts.map((prompt, i) => (
                            <ImagePromptCard 
                              key={`standard-${i}`}
                              prompt={prompt}
                              onImageGenerated={(url) => handleImageGenerated(i, url, false)}
                              onPromptEdited={(newPrompt) => handlePromptEdit(i, newPrompt, false)}
                              referenceImageBase64={characterReferenceUrl}
                            />
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Ghost className="w-12 h-12 text-white/10 mb-4" />
                            <p className="text-white/40 font-medium">No visual prompts generated.</p>
                            <p className="text-white/20 text-xs mt-1">This can happen if the AI fails to structure the storyboard correctly.</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "seo" && result && (
                    <motion.div
                      key="seo-tab"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-8 md:p-12"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <BarChart3 className="w-6 h-6 text-[#ff4e00]" />
                          <h3 className="text-2xl font-bold tracking-tight">SEO Optimization</h3>
                        </div>
                      </div>

                      <div className="space-y-10">
                        {/* Title Section */}
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl relative group">
                          <div className="flex items-center justify-between mb-4">
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Controversial Title</label>
                            <button 
                              onClick={() => copyToClipboard(result.seo.title, 'seo-title')}
                              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                            >
                              {copiedSection === 'seo-title' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-white/40" />}
                            </button>
                          </div>
                          <p className="text-xl font-bold text-white leading-tight">{result.seo.title}</p>
                        </div>

                        {/* Description Sections */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl relative group">
                            <div className="flex items-center justify-between mb-4">
                              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Short Form (Shorts/Reels/TikTok)</label>
                              <button 
                                onClick={() => copyToClipboard(result.seo.shortDescription, 'seo-short')}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                              >
                                {copiedSection === 'seo-short' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-white/40" />}
                              </button>
                            </div>
                            <p className="text-sm text-white/70 leading-relaxed">{result.seo.shortDescription}</p>
                          </div>

                          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl relative group">
                            <div className="flex items-center justify-between mb-4">
                              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Long Form (YouTube Video)</label>
                              <button 
                                onClick={() => copyToClipboard(result.seo.longDescription || result.seo.shortDescription, 'seo-long')}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                              >
                                {copiedSection === 'seo-long' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-white/40" />}
                              </button>
                            </div>
                            <p className="text-sm text-white/70 leading-relaxed">
                              {result.seo.longDescription || "Generate the 5-minute script to unlock long-form description."}
                            </p>
                          </div>
                        </div>

                        {/* Tags Section */}
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl relative group">
                          <div className="flex items-center justify-between mb-4">
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">SEO Tags</label>
                            <button 
                              onClick={() => copyToClipboard(result.seo.tags.join(', '), 'seo-tags')}
                              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                            >
                              {copiedSection === 'seo-tags' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-white/40" />}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {result.seo.tags.map((tag, i) => (
                              <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white/60">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "extended" && (
                    <motion.div
                      key="extended-tab"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-8 md:p-12"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <Mic2 className="w-6 h-6 text-[#ff4e00]" />
                          <h3 className="text-2xl font-bold tracking-tight">Extended 5m Script</h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => copyToClipboard(getFullContentString(), 'extended-all')}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white/60 hover:text-white transition-all"
                          >
                            {copiedSection === 'extended-all' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            {copiedSection === 'extended-all' ? "Copied All" : "Copy All"}
                          </button>
                          <div className="px-3 py-1 bg-[#ff4e00]/10 border border-[#ff4e00]/20 rounded-full text-[10px] font-bold text-[#ff4e00] uppercase tracking-widest">
                            Investigative Special
                          </div>
                        </div>
                      </div>

                      {!extendedScript && !isGeneratingExtended ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-white/5 border border-white/5 rounded-3xl">
                          <Mic2 className="w-12 h-12 text-[#ff4e00]/20 mb-4" />
                          <h4 className="text-lg font-bold text-white/60 mb-2">Generate Extended Script</h4>
                          <p className="text-white/30 text-sm max-w-md mb-8">
                            Need more depth? Generate a full 5-minute investigative script and 30 visual prompts based on the research data.
                          </p>
                          <button
                            onClick={handleGenerateExtended}
                            className="px-8 py-3 bg-[#ff4e00] text-white font-bold rounded-xl hover:shadow-[0_0_20px_rgba(255,78,0,0.4)] transition-all flex items-center gap-2"
                          >
                            <Mic2 className="w-5 h-5" />
                            Generate Now
                          </button>
                        </div>
                      ) : isGeneratingExtended ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <Loader2 className="w-12 h-12 text-[#ff4e00] animate-spin mb-6" />
                          <h4 className="text-xl font-bold text-white mb-2">Crafting your special report...</h4>
                          <p className="text-white/40 text-sm animate-pulse">This can take up to 45 seconds due to the script length and 30 visual prompts.</p>
                        </div>
                      ) : (
                        <div className="space-y-12">
                          <div className="prose prose-invert prose-orange max-w-none prose-p:text-white/80 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-[#ff4e00]">
                            <ReactMarkdown>{extendedScript || ""}</ReactMarkdown>
                          </div>

                          {extendedImagePrompts && extendedImagePrompts.length > 0 && (
                            <div className="pt-12 border-t border-white/10">
                              <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
                                <Video className="w-6 h-6 text-[#ff4e00]" />
                                Extended Storyboard <span className="text-xs font-normal text-white/40">(30 Scenes)</span>
                              </h3>
                              <div className="space-y-6">
                                {extendedImagePrompts.map((prompt, i) => (
                                  <ImagePromptCard 
                                    key={`extended-${i}`}
                                    prompt={prompt}
                                    onImageGenerated={(url) => handleImageGenerated(i, url, true)}
                                    onPromptEdited={(newPrompt) => handlePromptEdit(i, newPrompt, true)}
                                    referenceImageBase64={characterReferenceUrl}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!result && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-24 text-center"
        >
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
            <History className="w-10 h-10 text-white/20" />
          </div>
          <h3 className="text-xl font-bold text-white/40">No investigation active</h3>
          <p className="text-white/20 text-sm mt-2">Enter a topic above to begin your research.</p>
        </motion.div>
      )}
    </main>
  );
}

function CustomSelect<T extends string>({ 
  value, 
  onChange, 
  options, 
  disabled 
}: { 
  value: T, 
  onChange: (val: T) => void, 
  options: { value: T, label: string }[],
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || value;

  return (
    <div className="relative flex-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-full flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-[#ff4e00] transition-colors cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        <span className="truncate text-white/80 group-hover:text-white transition-colors">{selectedLabel}</span>
        <ChevronDown className={cn("w-4 h-4 text-white/30 transition-transform shrink-0", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full mb-2 left-0 w-full bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl backdrop-blur-xl"
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 text-xs md:text-sm transition-all",
                    value === opt.value 
                      ? "bg-[#ff4e00] text-white font-bold" 
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { 
  Calendar, 
  Search, 
  Loader2, 
  AlertCircle, 
  ChevronRight,
  User,
  Skull,
  Play,
  FileText,
  Image as ImageIcon,
  History,
  Mic2,
  CheckCircle2,
  ExternalLink,
  Video,
  Ghost,
  Globe,
  Plus,
  CloudUpload,
  CloudOff,
  Copy,
  Check,
  ChevronDown,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { cn } from "../lib/utils";
import { storage } from "../lib/storage";
import { fetchCasesByDecade, generateTrueCrimeContent, generateExtendedScript, refineStoryboard } from "../services/geminiService";
import { CaseSummary, GenerationResponse, ImageryStyle, ScriptStyle, Generation, ImagePrompt } from "../types";
import { useAuth } from "../context/AuthContext";
import { db, handleFirestoreError, OperationType, uploadImage } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import ImagePromptCard from "../components/ImagePromptCard";
import CharacterReference from "../components/CharacterReference";

const decades = [
  { label: "1950 - 1960", start: 1950, end: 1960 },
  { label: "1960 - 1970", start: 1960, end: 1970 },
  { label: "1970 - 1980", start: 1970, end: 1980 },
  { label: "1980 - 1990", start: 1980, end: 1990 },
  { label: "1990 - 2000", start: 1990, end: 2000 },
  { label: "2000 - 2010", start: 2000, end: 2010 },
  { label: "2010 - 2020", start: 2010, end: 2020 },
  { label: "2020 - 2026", start: 2020, end: 2026 },
];

const continents = ["All", "North America", "South America", "Europe", "Asia", "Africa", "Australia", "Oceania"];

const continentCountries: Record<string, string[]> = {
  "North America": ["USA", "Canada", "Mexico", "Cuba", "Jamaica", "Haiti", "Dominican Republic", "Guatemala", "Honduras", "El Salvador", "Nicaragua", "Costa Rica", "Panama"],
  "South America": ["Brazil", "Argentina", "Colombia", "Chile", "Peru", "Venezuela", "Ecuador", "Bolivia", "Paraguay", "Uruguay", "Guyana", "Suriname"],
  "Europe": ["UK", "France", "Germany", "Italy", "Spain", "Russia", "Ukraine", "Poland", "Romania", "Netherlands", "Belgium", "Greece", "Czech Republic", "Portugal", "Sweden", "Hungary", "Austria", "Switzerland", "Norway", "Denmark", "Finland", "Ireland"],
  "Asia": ["Japan", "China", "India", "South Korea", "Thailand", "Vietnam", "Indonesia", "Philippines", "Malaysia", "Singapore", "Pakistan", "Bangladesh", "Iran", "Iraq", "Turkey", "Saudi Arabia", "Israel", "UAE"],
  "Africa": ["South Africa", "Egypt", "Nigeria", "Kenya", "Morocco", "Ethiopia", "Ghana", "Algeria", "Tanzania", "Uganda", "Sudan", "Angola", "Ivory Coast", "Madagascar", "Cameroon"],
  "Australia": ["Australia", "New Zealand", "Fiji", "Papua New Guinea", "Solomon Islands", "Vanuatu"],
  "Oceania": ["Fiji", "Papua New Guinea", "Samoa", "Tonga", "Vanuatu", "Kiribati", "Tuvalu"]
};

export default function CaseExplorer() {
  const { user, login } = useAuth();
  const [selectedDecade, setSelectedDecade] = useState<typeof decades[0] | null>(null);
  const [selectedContinent, setSelectedContinent] = useState<string>("All");
  const [selectedCountry, setSelectedCountry] = useState<string>("All Countries");
  const [isCountriesVisible, setIsCountriesVisible] = useState(false);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseSummary | null>(null);
  
  const [scriptStyle, setScriptStyle] = useState<ScriptStyle>("storytelling");
  const [imageryStyle, setImageryStyle] = useState<ImageryStyle>("realistic");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
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

  // Load from IndexedDB on mount
  useEffect(() => {
    const loadSaved = async () => {
      const savedResult = await storage.getItem<any>('truecrime_explorer_generation');
      if (savedResult) {
        try {
          setResult(savedResult.result || null);
          setExtendedScript(savedResult.extendedScript || null);
          setExtendedImagePrompts(savedResult.extendedImagePrompts || null);
          setCharacterReferenceUrl(savedResult.characterReferenceUrl || null);
          setCharacterDescription(savedResult.characterDescription || "");
          setSelectedCase(savedResult.selectedCase || null);
          setScriptStyle(savedResult.scriptStyle || "storytelling");
          setImageryStyle(savedResult.imageryStyle || "realistic");
          setSelectedDecade(savedResult.selectedDecade || null);
          setSelectedContinent(savedResult.selectedContinent || "All");
          setSelectedCountry(savedResult.selectedCountry || "All Countries");
          
          // Use saved cases if available, otherwise fetch
          if (savedResult.cases && savedResult.cases.length > 0) {
            setCases(savedResult.cases);
          } else if (savedResult.selectedDecade) {
            const data = await fetchCasesByDecade(
              savedResult.selectedDecade.start, 
              savedResult.selectedDecade.end, 
              savedResult.selectedContinent || "All", 
              [], 
              savedResult.selectedCountry || "All Countries"
            );
            setCases(data);
          }
        } catch (e) {
          console.error("Failed to load saved explorer generation", e);
        }
      }
    };
    loadSaved();
  }, []);

  // Save to IndexedDB whenever state changes
  useEffect(() => {
    storage.setItem('truecrime_explorer_generation', {
      result,
      extendedScript,
      extendedImagePrompts,
      characterReferenceUrl,
      characterDescription,
      selectedCase,
      scriptStyle,
      imageryStyle,
      selectedDecade,
      selectedContinent,
      selectedCountry,
      cases
    });
  }, [result, extendedScript, extendedImagePrompts, selectedCase, scriptStyle, imageryStyle, characterReferenceUrl, characterDescription, selectedDecade, selectedContinent, selectedCountry, cases]);

  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleImageGenerated = (index: number, url: string, isExtended: boolean = false) => {
    if (isExtended && extendedImagePrompts) {
      const newPrompts = [...extendedImagePrompts];
      newPrompts[index] = { ...newPrompts[index], generatedImageUrl: url };
      setExtendedImagePrompts(newPrompts);
      if (user) {
        saveToCloud(result!, selectedCase, scriptStyle, imageryStyle, extendedScript, newPrompts, characterReferenceUrl, characterDescription);
      }
    } else if (!isExtended && result) {
      const newPrompts = [...result.imagePrompts];
      newPrompts[index] = { ...newPrompts[index], generatedImageUrl: url };
      const updatedResult = { ...result, imagePrompts: newPrompts };
      setResult(updatedResult);
      if (user) {
        saveToCloud(updatedResult, selectedCase, scriptStyle, imageryStyle, extendedScript, extendedImagePrompts, characterReferenceUrl, characterDescription);
      }
    }
  };

  const handlePromptEdit = (index: number, newPrompt: string, isExtended: boolean = false) => {
    if (isExtended && extendedImagePrompts) {
      const newPrompts = [...extendedImagePrompts];
      newPrompts[index] = { ...newPrompts[index], imagePrompt: newPrompt };
      setExtendedImagePrompts(newPrompts);
      if (user) {
        saveToCloud(result!, selectedCase, scriptStyle, imageryStyle, extendedScript, newPrompts, characterReferenceUrl, characterDescription);
      }
    } else if (!isExtended && result) {
      const newPrompts = [...result.imagePrompts];
      newPrompts[index] = { ...newPrompts[index], imagePrompt: newPrompt };
      const updatedResult = { ...result, imagePrompts: newPrompts };
      setResult(updatedResult);
      if (user) {
        saveToCloud(updatedResult, selectedCase, scriptStyle, imageryStyle, extendedScript, extendedImagePrompts, characterReferenceUrl, characterDescription);
      }
    }
  };

  const scriptOptions: { value: ScriptStyle; label: string }[] = [
    { value: "storytelling", label: "Storytelling" },
    { value: "journalist", label: "Journalist" },
    { value: "narrator", label: "Narrator" },
    { value: "incident reporting", label: "Incident Reporting" },
    { value: "newsroom", label: "Newsroom" },
  ];

  const imageryOptions: { value: ImageryStyle; label: string }[] = [
    { value: "realistic", label: "Realistic" },
    { value: "anime", label: "Anime" },
    { value: "3d", label: "3D Render" },
  ];

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
    if (result.seo) {
      content += `SEO DATA:\n`;
      content += `Title: ${result.seo.title}\n`;
      content += `Short Description: ${result.seo.shortDescription}\n`;
      if (result.seo.longDescription) {
        content += `Long Description: ${result.seo.longDescription}\n`;
      }
      content += `Tags: ${result.seo.tags.join(', ')}\n\n`;
    }

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

  const handleGenerateExtended = async () => {
    if (!result) return;
    setIsGeneratingExtended(true);
    try {
      const { script, imagePrompts } = await generateExtendedScript(result.research, scriptStyle, imageryStyle, characterDescription);
      setExtendedScript(script);
      setExtendedImagePrompts(imagePrompts);
      setActiveTab("extended");
      setIsGeneratingExtended(false);
      
      // Update cloud if user is logged in
      if (user && selectedCase) {
        saveToCloud(result, selectedCase, scriptStyle, imageryStyle, script, imagePrompts, characterReferenceUrl, characterDescription);
      }
    } catch (err: any) {
      console.error("Failed to generate extended script", err);
      setError(err.message || "Failed to generate the 5-minute script and prompts. Please try again.");
    } finally {
      setIsGeneratingExtended(false);
    }
  };

  const handleRefineStoryboard = async () => {
    if (!result || !result.script) return;
    
    setIsRefining(true);
    setError(null);
    try {
      const refinedPrompts = await refineStoryboard(
        result.script,
        result.imagePrompts,
        characterDescription,
        imageryStyle
      );
      
      const updatedResult = {
        ...result,
        imagePrompts: refinedPrompts
      };
      
      setResult(updatedResult);
      saveToCloud(updatedResult, selectedCase, scriptStyle, imageryStyle, extendedScript, extendedImagePrompts, characterReferenceUrl, characterDescription);
    } catch (err: any) {
      setError(err.message || "Failed to refine storyboard");
    } finally {
      setIsRefining(false);
    }
  };

  const saveToCloud = useCallback(async (
    data: GenerationResponse, 
    currentCase: CaseSummary | null = selectedCase, 
    currentScriptStyle: ScriptStyle = scriptStyle, 
    currentImageryStyle: ImageryStyle = imageryStyle, 
    currentExtendedScript: string | null = extendedScript, 
    currentExtendedImagePrompts: any[] | null = extendedImagePrompts,
    currentCharacterReferenceUrl: string | null = characterReferenceUrl,
    currentCharacterDescription: string = characterDescription
  ) => {
    if (!user || !currentCase) return;
    
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
        topic: currentCase.suspectName,
        scriptStyle: currentScriptStyle,
        imageryStyle: currentImageryStyle,
        research: data.research,
        script: data.script,
        imagePrompts: processedImagePrompts,
        characterReferenceUrl: characterRefUrl,
        characterDescription: currentCharacterDescription,
        seo: data.seo,
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
  }, [user, selectedCase, scriptStyle, imageryStyle, extendedScript, extendedImagePrompts, characterReferenceUrl, characterDescription]);

  const handleDecadeSelect = async (decade: typeof decades[0], continent: string = selectedContinent, country: string = "All Countries") => {
    setSelectedDecade(decade);
    setSelectedContinent(continent);
    setSelectedCountry(country);
    setSelectedCase(null);
    setResult(null);
    setIsLoadingCases(true);
    setError(null);
    try {
      const data = await fetchCasesByDecade(decade.start, decade.end, continent, [], country);
      setCases(data);
    } catch (err) {
      setError("Failed to fetch cases for this decade.");
    } finally {
      setIsLoadingCases(false);
    }
  };

  const handleCountrySelect = (country: string) => {
    setSelectedCountry(country);
    if (selectedDecade) {
      handleDecadeSelect(selectedDecade, selectedContinent, country);
    }
    setIsCountriesVisible(false);
  };

  const handleLoadMore = async () => {
    if (!selectedDecade) return;
    
    setIsLoadingMore(true);
    try {
      const excludeNames = cases.map(c => c.suspectName);
      const moreData = await fetchCasesByDecade(selectedDecade.start, selectedDecade.end, selectedContinent, excludeNames, selectedCountry);
      if (moreData.length > 0) {
        setCases(prev => [...prev, ...moreData]);
      }
    } catch (err) {
      console.error("Failed to load more cases", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedCase) return;

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setExtendedScript(null);
    setSaveSuccess(false);

    try {
      const data = await generateTrueCrimeContent(selectedCase.suspectName, scriptStyle, imageryStyle, characterDescription);
      setResult(data);
      if (data.characterDescription) {
        setCharacterDescription(data.characterDescription);
      }
      setActiveTab("research");
      setIsGenerating(false);

      // Auto-save to cloud if user is logged in
      if (user) {
        saveToCloud(data, selectedCase, scriptStyle, imageryStyle, null, null, characterReferenceUrl, data.characterDescription || characterDescription);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h2 className="text-4xl font-bold mb-4 tracking-tight">
          Case <span className="text-[#ff4e00]">Explorer</span>
        </h2>
        <p className="text-white/60">
          Browse historical true crime incidents by decade and generate deep-dive content.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Decade & Case Selection */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-[#151515] border border-white/10 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Select Continent
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 mb-4">
              {continents.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    if (selectedDecade) {
                      handleDecadeSelect(selectedDecade, c, "All Countries");
                    } else {
                      setSelectedContinent(c);
                      setSelectedCountry("All Countries");
                    }
                    setIsCountriesVisible(false);
                  }}
                  className={cn(
                    "px-3 py-2 rounded-lg text-[10px] sm:text-xs font-medium transition-all border",
                    selectedContinent === c 
                      ? "bg-[#ff4e00]/20 border-[#ff4e00] text-[#ff4e00]" 
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {selectedContinent !== "All" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <button
                    onClick={() => setIsCountriesVisible(!isCountriesVisible)}
                    className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] uppercase tracking-widest font-bold text-white/40 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Search className="w-3 h-3" />
                    {isCountriesVisible ? "Hide Countries" : `Explore ${selectedContinent} Countries`}
                  </button>

                  <AnimatePresence>
                    {isCountriesVisible && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-2 gap-2 mt-3 p-3 bg-white/5 rounded-xl border border-white/5 max-h-[200px] overflow-y-auto custom-scrollbar"
                      >
                        <button
                          onClick={() => handleCountrySelect("All Countries")}
                          className={cn(
                            "px-2 py-1.5 rounded-md text-[9px] font-bold transition-all border",
                            selectedCountry === "All Countries"
                              ? "bg-[#ff4e00] border-[#ff4e00] text-white"
                              : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                          )}
                        >
                          All Countries
                        </button>
                        {continentCountries[selectedContinent]?.map((country) => (
                          <button
                            key={country}
                            onClick={() => handleCountrySelect(country)}
                            className={cn(
                              "px-2 py-1.5 rounded-md text-[9px] font-bold transition-all border",
                              selectedCountry === country
                                ? "bg-[#ff4e00] border-[#ff4e00] text-white"
                                : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                            )}
                          >
                            {country}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Select Decade
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
              {decades.map((d) => (
                <button
                  key={d.label}
                  onClick={() => handleDecadeSelect(d)}
                  className={cn(
                    "px-3 py-2.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all border",
                    selectedDecade?.label === d.label 
                      ? "bg-[#ff4e00] border-[#ff4e00] text-white shadow-lg shadow-[#ff4e00]/20" 
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-[#151515] border border-white/10 rounded-2xl p-6 min-h-[300px] flex flex-col">
            <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Skull className="w-4 h-4" />
              Criminals & Cases
            </h3>
            
            {isLoadingCases ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/40">
                <Loader2 className="w-8 h-8 animate-spin text-[#ff4e00]" />
                <p className="text-xs animate-pulse">Retrieving historical records...</p>
              </div>
            ) : cases.length > 0 ? (
              <div className="space-y-2 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                {cases.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedCase(c)}
                    className={cn(
                      "w-full p-4 rounded-xl text-left transition-all border group",
                      selectedCase?.suspectName === c.suspectName
                        ? "bg-white/10 border-[#ff4e00] text-white"
                        : "bg-white/5 border-transparent text-white/60 hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-sm group-hover:text-[#ff4e00] transition-colors">{c.suspectName}</p>
                      <span className="text-[10px] font-mono opacity-40">{c.year}</span>
                    </div>
                    <p className="text-[10px] leading-relaxed line-clamp-2 opacity-60 mb-2">{c.crime}</p>
                    <div className="flex items-center gap-2 text-[9px] font-mono text-white/30">
                      <Globe className="w-3 h-3" />
                      <span>{c.location}</span>
                    </div>
                  </button>
                ))}
                
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="w-full py-3 mt-4 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {isLoadingMore ? "Loading More..." : "Load More Results"}
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-white/20">
                <Search className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-xs">Select a decade to view prominent cases.</p>
              </div>
            )}
          </section>

          {selectedCase && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#151515] border border-white/10 rounded-2xl p-6 space-y-4"
            >
              <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Play className="w-4 h-4" />
                Generation Options
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Presentation Style</label>
                  <CustomSelect
                    value={scriptStyle}
                    onChange={(val) => setScriptStyle(val as ScriptStyle)}
                    options={scriptOptions}
                    disabled={isGenerating}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Visual Style</label>
                  <CustomSelect
                    value={imageryStyle}
                    onChange={(val) => setImageryStyle(val as ImageryStyle)}
                    options={imageryOptions}
                    disabled={isGenerating}
                  />
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={cn(
                  "w-full py-4 bg-[#ff4e00] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2",
                  isGenerating ? "opacity-50 cursor-not-allowed" : "hover:bg-[#ff6a00] hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Skull className="w-5 h-5" />}
                {isGenerating ? "Generating..." : "Generate Script"}
              </button>
            </motion.section>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-[#151515] border border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center min-h-[600px] text-center"
              >
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-[#ff4e00] blur-2xl opacity-20 animate-pulse"></div>
                  <Loader2 className="w-16 h-16 animate-spin text-[#ff4e00] relative z-10" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Investigating {selectedCase?.suspectName}</h3>
                <p className="text-white/40 max-w-md">Our AI is currently researching the case details, drafting the script, and preparing visual prompts.</p>
              </motion.div>
            ) : result ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Tabs & Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl w-full sm:w-fit">
                    <button
                      onClick={() => setActiveTab("research")}
                      className={cn(
                        "flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2",
                        activeTab === "research" ? "bg-[#ff4e00] text-white" : "text-white/40 hover:text-white"
                      )}
                    >
                      <Search className="w-4 h-4" /> Research
                    </button>
                    <button
                      onClick={() => setActiveTab("script")}
                      className={cn(
                        "flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2",
                        activeTab === "script" ? "bg-[#ff4e00] text-white" : "text-white/40 hover:text-white"
                      )}
                    >
                      <FileText className="w-4 h-4" /> Script
                    </button>
                    <button
                      onClick={() => setActiveTab("prompts")}
                      className={cn(
                        "flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2",
                        activeTab === "prompts" ? "bg-[#ff4e00] text-white" : "text-white/40 hover:text-white"
                      )}
                    >
                      <ImageIcon className="w-4 h-4" /> Prompts
                    </button>
                    <button
                      onClick={() => setActiveTab("seo")}
                      className={cn(
                        "flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2",
                        activeTab === "seo" ? "bg-[#ff4e00] text-white" : "text-white/40 hover:text-white"
                      )}
                    >
                      <Globe className="w-4 h-4" /> SEO
                    </button>
                    <button
                      onClick={extendedScript ? () => setActiveTab("extended") : handleGenerateExtended}
                      disabled={isGeneratingExtended}
                      className={cn(
                        "flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 border",
                        activeTab === "extended" 
                          ? "bg-[#ff4e00] border-[#ff4e00] text-white" 
                          : "bg-[#ff4e00]/5 border-[#ff4e00]/20 text-[#ff4e00] hover:bg-[#ff4e00]/10"
                      )}
                    >
                      {isGeneratingExtended ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic2 className="w-4 h-4" />}
                      {isGeneratingExtended ? "Generating..." : extendedScript ? "5m Script" : "Generate 5m Script"}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {user ? (
                      <button
                        onClick={() => saveToCloud(result, selectedCase!, scriptStyle, imageryStyle, extendedScript || undefined)}
                        disabled={isSaving || saveSuccess}
                        className={cn(
                          "flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border",
                          saveSuccess 
                            ? "bg-green-500/20 border-green-500/50 text-green-500" 
                            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
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
                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                      >
                        <CloudOff className="w-4 h-4" />
                        Login to Save
                      </button>
                    )}
                      <button
                        onClick={() => {
                          setResult(null);
                          setSelectedCase(null);
                          storage.removeItem('truecrime_explorer_generation');
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                      >
                        Clear
                      </button>
                  </div>
                </div>

                <div className="bg-[#151515] border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[600px]">
                  <AnimatePresence mode="wait">
                    {activeTab === "seo" && (
                      <motion.div
                        key="seo-tab"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="p-8 md:p-12"
                      >
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-3">
                            <Globe className="w-6 h-6 text-[#ff4e00]" />
                            <h3 className="text-2xl font-bold tracking-tight">SEO Optimization</h3>
                          </div>
                        </div>

                        {result.seo ? (
                          <div className="space-y-8">
                            <section>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">Controversial Title</h4>
                                <button 
                                  onClick={() => copyToClipboard(result.seo!.title, 'seo-title')}
                                  className="text-white/20 hover:text-white transition-colors"
                                >
                                  {copiedSection === 'seo-title' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                                <p className="text-lg font-bold text-[#ff4e00] leading-tight">{result.seo.title}</p>
                              </div>
                            </section>

                            <section>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">Short-Form Description (Shorts/TikTok/Reels)</h4>
                                <button 
                                  onClick={() => copyToClipboard(result.seo!.shortDescription, 'seo-short')}
                                  className="text-white/20 hover:text-white transition-colors"
                                >
                                  {copiedSection === 'seo-short' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{result.seo.shortDescription}</p>
                              </div>
                            </section>

                            {result.seo.longDescription && (
                              <section>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">Long-Form Description (5m Script)</h4>
                                  <button 
                                    onClick={() => copyToClipboard(result.seo!.longDescription!, 'seo-long')}
                                    className="text-white/20 hover:text-white transition-colors"
                                  >
                                    {copiedSection === 'seo-long' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                                  <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{result.seo.longDescription}</p>
                                </div>
                              </section>
                            )}

                            <section>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">SEO Tags</h4>
                                <button 
                                  onClick={() => copyToClipboard(result.seo!.tags.join(' '), 'seo-tags')}
                                  className="text-white/20 hover:text-white transition-colors"
                                >
                                  {copiedSection === 'seo-tags' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {result.seo.tags.map((tag, i) => (
                                  <span key={i} className="px-3 py-1 bg-[#ff4e00]/10 border border-[#ff4e00]/20 rounded-full text-[10px] font-bold text-[#ff4e00]">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </section>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-20 text-white/20">
                            <Globe className="w-12 h-12 mb-4 opacity-10" />
                            <p className="text-sm">No SEO data available for this generation.</p>
                          </div>
                        )}
                      </motion.div>
                    )}

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
                          topic={selectedCase?.suspectName || ""}
                          imageryStyle={imageryStyle}
                          characterDescription={characterDescription}
                          onReferenceChange={(url) => {
                            setCharacterReferenceUrl(url);
                            if (result) {
                              saveToCloud(result, selectedCase, scriptStyle, imageryStyle, extendedScript, extendedImagePrompts, url, characterDescription);
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12">
                          <div className="space-y-6">
                            <div>
                              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Suspect Name</label>
                              <p className="text-lg md:text-xl font-bold text-white">{result.research.suspectName}</p>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Who they were</label>
                              <p className="text-sm md:text-base text-white/70 leading-relaxed">{result.research.whoTheyWere}</p>
                            </div>
                          </div>
                          <div className="space-y-6">
                            <div>
                              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">The Incident</label>
                              <p className="text-sm md:text-base text-white/70 leading-relaxed">{result.research.whatHappened}</p>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">The Outcome</label>
                              <p className="text-sm md:text-base text-white/70 leading-relaxed">{result.research.howTheyEndedUpThere}</p>
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

                        <div className="prose prose-invert prose-orange max-w-none">
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
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                          <div className="flex items-center gap-3">
                            <Video className="w-6 h-6 text-[#ff4e00]" />
                            <h3 className="text-2xl font-bold tracking-tight">Visual Storyboard</h3>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={handleRefineStoryboard}
                              disabled={isRefining || !result}
                              className="flex items-center gap-2 px-4 py-2 bg-[#ff4e00]/10 hover:bg-[#ff4e00]/20 border border-[#ff4e00]/20 rounded-xl text-xs font-bold text-[#ff4e00] transition-all disabled:opacity-50"
                            >
                              {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                              Refine Storyboard (AI Context)
                            </button>
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
                          {result.imagePrompts.map((prompt, i) => (
                            <ImagePromptCard 
                              key={`standard-${i}`}
                              prompt={prompt}
                              onImageGenerated={(url) => handleImageGenerated(i, url, false)}
                              onPromptEdited={(newPrompt) => handlePromptEdit(i, newPrompt, false)}
                              referenceImageBase64={characterReferenceUrl}
                            />
                          ))}
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
              </motion.div>
            ) : (
              <div className="bg-[#151515] border border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center min-h-[600px] text-center text-white/20">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                  <Skull className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white/40">No case selected</h3>
                <p className="text-sm mt-2 max-w-xs">Select a decade and a criminal from the explorer to generate their story.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
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

import { useState, useEffect } from "react";
import { 
  Settings2, 
  Save, 
  RotateCcw, 
  ShieldAlert, 
  Search, 
  Mic2, 
  Video, 
  BookOpen, 
  Users,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Loader2,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { AppSettings, ContentStyle, UserPreferences, VisualPreset } from "../types";
import { useAuth } from "../context/AuthContext";
import { 
  getUserPreferences, 
  saveUserPreferences, 
  getContentStyles, 
  saveContentStyle, 
  deleteContentStyle,
  getVisualPresets,
  saveVisualPreset,
  deleteVisualPreset,
  setActiveVisualPreset
} from "../services/userService";
import { VISUAL_STORYTELLING_RULES } from "../services/geminiService";
import { cn } from "../lib/utils";

const DEFAULT_SETTINGS: AppSettings = {
  researchDepth: 'standard',
  scriptComplexity: 'balanced',
  promptDetail: 'medium',
};

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Custom Styles State
  const [customStyles, setCustomStyles] = useState<ContentStyle[]>([]);
  const [isAddingStyle, setIsAddingStyle] = useState(false);
  const [editingStyle, setEditingStyle] = useState<ContentStyle | null>(null);
  const [styleForm, setStyleForm] = useState({ name: "", prompt: "" });

  // Visual Presets State
  const [visualPresets, setVisualPresets] = useState<VisualPreset[]>([]);
  const [isAddingVisualPreset, setIsAddingVisualPreset] = useState(false);
  const [editingVisualPreset, setEditingVisualPreset] = useState<VisualPreset | null>(null);
  const [visualPresetForm, setVisualPresetForm] = useState({ name: "", prompt: "" });

  useEffect(() => {
    // Load local settings
    const saved = localStorage.getItem('truecrime_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    }

    // Load cloud data if user is logged in
    const loadCloudData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const [prefs, styles, presets] = await Promise.all([
          getUserPreferences(user.uid),
          getContentStyles(user.uid),
          getVisualPresets(user.uid)
        ]);

        if (prefs) {
          // Backward compatibility: if no presets exist but visualStorytellingRules does, 
          // we could potentially create a default preset from it.
          // For now, just load presets.
        }
        setCustomStyles(styles);
        setVisualPresets(presets);
      } catch (err) {
        console.error("Error loading cloud settings:", err);
        setError("Failed to load cloud settings. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadCloudData();
  }, [user]);

  const handleSave = async () => {
    localStorage.setItem('truecrime_settings', JSON.stringify(settings));
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all settings to defaults? This will not delete your custom styles or visual presets.")) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem('truecrime_settings', JSON.stringify(DEFAULT_SETTINGS));
    }
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
      setIsAddingStyle(false);
      setStyleForm({ name: "", prompt: "" });
    } catch (err) {
      setError("Failed to save custom style.");
    }
  };

  const handleUpdateStyle = async () => {
    if (!user || !editingStyle || !styleForm.name || !styleForm.prompt) return;

    try {
      await saveContentStyle(user.uid, {
        name: styleForm.name,
        prompt: styleForm.prompt,
        isDefault: editingStyle.isDefault
      }, editingStyle.id);

      setCustomStyles(customStyles.map(s => 
        s.id === editingStyle.id 
          ? { ...s, name: styleForm.name, prompt: styleForm.prompt } 
          : s
      ));
      setEditingStyle(null);
      setStyleForm({ name: "", prompt: "" });
    } catch (err) {
      setError("Failed to update custom style.");
    }
  };

  const handleDeleteStyle = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this custom style?")) return;

    try {
      await deleteContentStyle(id);
      setCustomStyles(customStyles.filter(s => s.id !== id));
    } catch (err) {
      setError("Failed to delete custom style.");
    }
  };

  const handleAddVisualPreset = async () => {
    if (!user || !visualPresetForm.name || !visualPresetForm.prompt) return;

    try {
      const id = await saveVisualPreset(user.uid, {
        name: visualPresetForm.name,
        prompt: visualPresetForm.prompt,
        isActive: visualPresets.length === 0 // Make active if it's the first one
      });

      const newPreset: VisualPreset = {
        id,
        uid: user.uid,
        name: visualPresetForm.name,
        prompt: visualPresetForm.prompt,
        isActive: visualPresets.length === 0,
        createdAt: new Date()
      };

      setVisualPresets([newPreset, ...visualPresets]);
      setIsAddingVisualPreset(false);
      setVisualPresetForm({ name: "", prompt: "" });
      
      if (newPreset.isActive) {
        await setActiveVisualPreset(user.uid, id);
      }
    } catch (err) {
      setError("Failed to save visual preset.");
    }
  };

  const handleUpdateVisualPreset = async () => {
    if (!user || !editingVisualPreset || !visualPresetForm.name || !visualPresetForm.prompt) return;

    try {
      await saveVisualPreset(user.uid, {
        name: visualPresetForm.name,
        prompt: visualPresetForm.prompt,
        isActive: editingVisualPreset.isActive
      }, editingVisualPreset.id);

      setVisualPresets(visualPresets.map(p => 
        p.id === editingVisualPreset.id 
          ? { ...p, name: visualPresetForm.name, prompt: visualPresetForm.prompt } 
          : p
      ));
      setEditingVisualPreset(null);
      setVisualPresetForm({ name: "", prompt: "" });
    } catch (err) {
      setError("Failed to update visual preset.");
    }
  };

  const handleDeleteVisualPreset = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this visual preset?")) return;

    try {
      await deleteVisualPreset(id);
      setVisualPresets(visualPresets.filter(p => p.id !== id));
    } catch (err) {
      setError("Failed to delete visual preset.");
    }
  };

  const handleSetActivePreset = async (id: string) => {
    if (!user) return;
    try {
      // If id is empty, it means we are switching to System Default (deactivating all presets)
      await setActiveVisualPreset(user.uid, id);
      setVisualPresets(visualPresets.map(p => ({
        ...p,
        isActive: p.id === id
      })));
    } catch (err) {
      setError("Failed to update active visual preset.");
    }
  };

  const handleCloneDefaultVisual = async () => {
    if (!user) return;
    try {
      const id = await saveVisualPreset(user.uid, {
        name: "My Cinematic Style",
        prompt: VISUAL_STORYTELLING_RULES,
        isActive: false
      });
      
      const newPreset: VisualPreset = {
        id,
        uid: user.uid,
        name: "My Cinematic Style",
        prompt: VISUAL_STORYTELLING_RULES,
        isActive: false,
        createdAt: new Date()
      };
      
      setVisualPresets([newPreset, ...visualPresets]);
    } catch (err) {
      setError("Failed to clone default visual preset.");
    }
  };

  if (isLoading && user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#ff4e00] animate-spin mb-4" />
        <p className="text-white/40 font-mono text-sm">Synchronizing settings...</p>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <div className="max-w-3xl mx-auto text-center mb-10 md:mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
          Advanced <span className="text-[#ff4e00]">Configuration</span>
        </h2>
        <p className="text-white/60 text-sm md:text-base">
          Fine-tune the AI's behavior to match your channel's unique voice and aesthetic.
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            {/* Research Depth */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#151515] border border-white/10 rounded-3xl p-6"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-[#ff4e00]/10 rounded-xl flex items-center justify-center">
                  <Search className="w-5 h-5 text-[#ff4e00]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Research Depth</h3>
                  <p className="text-xs text-white/40">How thoroughly should the AI investigate?</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['standard', 'deep', 'exhaustive'] as const).map((depth) => (
                  <button
                    key={depth}
                    onClick={() => setSettings({ ...settings, researchDepth: depth })}
                    className={`py-3 px-2 rounded-xl text-xs font-medium transition-all border ${
                      settings.researchDepth === depth 
                        ? "bg-[#ff4e00] border-[#ff4e00] text-white shadow-[0_0_15px_rgba(255,78,0,0.2)]" 
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    {depth.charAt(0).toUpperCase() + depth.slice(1)}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Script Complexity */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#151515] border border-white/10 rounded-3xl p-6"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-[#ff4e00]/10 rounded-xl flex items-center justify-center">
                  <Mic2 className="w-5 h-5 text-[#ff4e00]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Script Complexity</h3>
                  <p className="text-xs text-white/40">Adjust vocabulary and narrative structure.</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['simple', 'balanced', 'complex'] as const).map((complexity) => (
                  <button
                    key={complexity}
                    onClick={() => setSettings({ ...settings, scriptComplexity: complexity })}
                    className={`py-3 px-2 rounded-xl text-xs font-medium transition-all border ${
                      settings.scriptComplexity === complexity 
                        ? "bg-[#ff4e00] border-[#ff4e00] text-white shadow-[0_0_15px_rgba(255,78,0,0.2)]" 
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    {complexity.charAt(0).toUpperCase() + complexity.slice(1)}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Prompt Detail */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#151515] border border-white/10 rounded-3xl p-6"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-[#ff4e00]/10 rounded-xl flex items-center justify-center">
                  <Video className="w-5 h-5 text-[#ff4e00]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Prompt Detail Level</h3>
                  <p className="text-xs text-white/40">Detail in generated visual prompts.</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setSettings({ ...settings, promptDetail: level })}
                    className={`py-3 px-2 rounded-xl text-xs font-medium transition-all border ${
                      settings.promptDetail === level 
                        ? "bg-[#ff4e00] border-[#ff4e00] text-white shadow-[0_0_15px_rgba(255,78,0,0.2)]" 
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="space-y-8">
            {/* Visual Presets Management */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#151515] border border-white/10 rounded-3xl p-6 h-full flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#ff4e00]/10 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#ff4e00]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Visual Scenery Presets</h3>
                    <p className="text-xs text-white/40">Manage your visual storytelling styles.</p>
                  </div>
                </div>
                {user && (
                  <div className="flex items-center gap-2">
                    {visualPresets.length === 0 && (
                      <button 
                        onClick={handleCloneDefaultVisual}
                        className="p-2 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-white transition-all"
                        title="Clone System Default to Preset"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setIsAddingVisualPreset(true);
                        setEditingVisualPreset(null);
                        setVisualPresetForm({ name: "", prompt: "" });
                      }}
                      className="p-2 bg-[#ff4e00]/10 border border-[#ff4e00]/20 rounded-xl text-[#ff4e00] hover:bg-[#ff4e00]/20 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                {/* System Default Option */}
                <div 
                  className={cn(
                    "p-4 rounded-2xl border transition-all group",
                    !visualPresets.some(p => p.isActive)
                      ? "bg-[#ff4e00]/5 border-[#ff4e00]/30" 
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className={cn("font-bold text-sm", !visualPresets.some(p => p.isActive) ? "text-[#ff4e00]" : "text-white")}>
                        System Default
                      </h4>
                      {!visualPresets.some(p => p.isActive) && (
                        <span className="px-2 py-0.5 bg-[#ff4e00] text-white text-[8px] font-bold uppercase rounded-full">Active</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {visualPresets.some(p => p.isActive) && (
                        <button 
                          onClick={() => handleSetActivePreset("")}
                          className="p-1.5 bg-white/5 hover:bg-[#ff4e00]/20 rounded-lg text-white/40 hover:text-[#ff4e00] transition-all"
                          title="Switch to System Default"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-white/40 line-clamp-2 leading-relaxed italic">
                    The original cinematic rules that come with the app.
                  </p>
                </div>

                {visualPresets.map((preset) => (
                  <div 
                    key={preset.id}
                    className={cn(
                      "p-4 rounded-2xl border transition-all group",
                      preset.isActive 
                        ? "bg-[#ff4e00]/5 border-[#ff4e00]/30" 
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className={cn("font-bold text-sm", preset.isActive ? "text-[#ff4e00]" : "text-white")}>
                          {preset.name}
                        </h4>
                        {preset.isActive && (
                          <span className="px-2 py-0.5 bg-[#ff4e00] text-white text-[8px] font-bold uppercase rounded-full">Active</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!preset.isActive && (
                          <button 
                            onClick={() => preset.id && handleSetActivePreset(preset.id)}
                            className="p-1.5 bg-white/5 hover:bg-[#ff4e00]/20 rounded-lg text-white/40 hover:text-[#ff4e00] transition-all"
                            title="Set as Active"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setEditingVisualPreset(preset);
                            setVisualPresetForm({ name: preset.name, prompt: preset.prompt });
                            setIsAddingVisualPreset(true);
                          }}
                          className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => preset.id && handleDeleteVisualPreset(preset.id)}
                          className="p-1.5 bg-white/5 hover:bg-red-500/10 rounded-lg text-white/40 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/40 line-clamp-2 leading-relaxed">
                      {preset.prompt}
                    </p>
                  </div>
                ))}

                {visualPresets.length === 0 && (
                  <div className="py-12 text-center border border-dashed border-white/10 rounded-2xl">
                    <Sparkles className="w-8 h-8 text-white/10 mx-auto mb-3" />
                    <p className="text-xs text-white/30">No visual presets created yet.</p>
                  </div>
                )}
              </div>
              
              <p className="text-[10px] text-white/30 mt-4 leading-relaxed">
                Only the active preset will be used during content generation.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Custom Content Styles */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#151515] border border-white/10 rounded-3xl p-6 md:p-8"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#ff4e00]/10 rounded-xl flex items-center justify-center">
                <Mic2 className="w-5 h-5 text-[#ff4e00]" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Custom Content Styles</h3>
                <p className="text-xs text-white/40">Create your own unique script styles and prompts.</p>
              </div>
            </div>
            {!user ? (
              <span className="text-xs text-white/30">Login to create styles</span>
            ) : (
              <button 
                onClick={() => {
                  setIsAddingStyle(true);
                  setEditingStyle(null);
                  setStyleForm({ name: "", prompt: "" });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#ff4e00]/10 border border-[#ff4e00]/20 rounded-xl text-xs font-bold text-[#ff4e00] hover:bg-[#ff4e00]/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Style
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customStyles.map((style) => (
              <div 
                key={style.id}
                className="p-5 bg-white/5 border border-white/10 rounded-2xl group hover:border-[#ff4e00]/30 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-bold text-white">{style.name}</h4>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingStyle(style);
                        setStyleForm({ name: style.name, prompt: style.prompt });
                        setIsAddingStyle(true);
                      }}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => style.id && handleDeleteStyle(style.id)}
                      className="p-2 bg-white/5 hover:bg-red-500/10 rounded-lg text-white/40 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-white/40 line-clamp-3 leading-relaxed italic">
                  "{style.prompt}"
                </p>
              </div>
            ))}

            {customStyles.length === 0 && (
              <div className="md:col-span-2 py-12 text-center border border-dashed border-white/10 rounded-3xl">
                <Mic2 className="w-10 h-10 text-white/10 mx-auto mb-4" />
                <p className="text-sm text-white/30">No custom styles created yet.</p>
              </div>
            )}
          </div>
        </motion.div>

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
                className="relative w-full max-w-lg bg-[#151515] border border-white/10 rounded-[2rem] p-8 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold">
                    {editingStyle ? "Edit Style" : "Create New Style"}
                  </h3>
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
                    onClick={editingStyle ? handleUpdateStyle : handleAddStyle}
                    disabled={!styleForm.name || !styleForm.prompt}
                    className="flex-1 py-4 bg-[#ff4e00] text-white font-bold rounded-2xl hover:shadow-[0_0_20px_rgba(255,78,0,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingStyle ? "Update Style" : "Create Style"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Visual Preset Modal */}
        <AnimatePresence>
          {isAddingVisualPreset && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddingVisualPreset(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-[#151515] border border-white/10 rounded-[2rem] p-8 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold">
                    {editingVisualPreset ? "Edit Visual Preset" : "Create Visual Preset"}
                  </h3>
                  <button onClick={() => setIsAddingVisualPreset(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-5 h-5 text-white/40" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Preset Name</label>
                    <input 
                      type="text"
                      value={visualPresetForm.name}
                      onChange={(e) => setVisualPresetForm({ ...visualPresetForm, name: e.target.value })}
                      placeholder="e.g., Cinematic Dark, Noir Mystery..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-[#ff4e00] focus:border-[#ff4e00] transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Visual Prompt</label>
                    <textarea 
                      value={visualPresetForm.prompt}
                      onChange={(e) => setVisualPresetForm({ ...visualPresetForm, prompt: e.target.value })}
                      placeholder="Define the visual style, lighting, and composition..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-[#ff4e00] focus:border-[#ff4e00] transition-all min-h-[150px] resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-10">
                  <button 
                    onClick={() => setIsAddingVisualPreset(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-white/60 hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={editingVisualPreset ? handleUpdateVisualPreset : handleAddVisualPreset}
                    disabled={!visualPresetForm.name || !visualPresetForm.prompt}
                    className="flex-1 py-4 bg-[#ff4e00] text-white font-bold rounded-2xl hover:shadow-[0_0_20px_rgba(255,78,0,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingVisualPreset ? "Update Preset" : "Create Preset"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaved}
            className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all ${
              isSaved 
                ? "bg-green-500 text-white" 
                : "bg-[#ff4e00] text-white hover:shadow-[0_0_20px_rgba(255,78,0,0.4)]"
            }`}
          >
            {isSaved ? "Settings Saved!" : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link 
            to="/docs"
            className="p-6 bg-white/5 border border-white/10 rounded-3xl flex items-center gap-4 hover:bg-white/10 transition-all group"
          >
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Documentation</h4>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Guides & API</p>
            </div>
          </Link>
          <Link 
            to="/community"
            className="p-6 bg-white/5 border border-white/10 rounded-3xl flex items-center gap-4 hover:bg-white/10 transition-all group"
          >
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Community</h4>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Discord & Forum</p>
            </div>
          </Link>
        </div>

        <div className="mt-12 p-6 bg-white/5 border border-white/10 rounded-3xl flex items-start gap-4">
          <ShieldAlert className="w-5 h-5 text-[#ff4e00] shrink-0 mt-1" />
          <p className="text-xs text-white/40 leading-relaxed">
            Standard settings are stored locally, while custom styles and visual rules are synced to your cloud account if you are logged in.
          </p>
        </div>
      </div>
    </main>
  );
}

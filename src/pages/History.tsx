import { useState, useEffect } from "react";
import { 
  History as HistoryIcon, 
  Search, 
  Trash2, 
  ChevronRight, 
  Calendar, 
  FileText, 
  Image as ImageIcon,
  Video,
  Loader2,
  Ghost,
  LogIn,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { Generation } from "../types";
import { cn } from "../lib/utils";
import ReactMarkdown from "react-markdown";
import Modal from "../components/ui/Modal";

export default function History() {
  const { user, login, loading: authLoading } = useAuth();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"research" | "script" | "extended" | "prompts" | "character" | "seo">("research");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setGenerations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "generations"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Generation[];
      setGenerations(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "generations");
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setIdToDelete(id);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!idToDelete) return;
    
    try {
      await deleteDoc(doc(db, "generations", idToDelete));
      if (selectedId === idToDelete) setSelectedId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `generations/${idToDelete}`);
    } finally {
      setIdToDelete(null);
    }
  };

  const selectedGen = generations.find(g => g.id === selectedId);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#ff4e00] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-[#ff4e00]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#ff4e00]/20">
          <LogIn className="w-10 h-10 text-[#ff4e00]" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Login to View History</h2>
        <p className="text-white/60 mb-8 max-w-md mx-auto">
          Your generation history is stored securely in the cloud. Login with your Google account to access your past research and scripts.
        </p>
        <button 
          onClick={login}
          className="px-8 py-4 bg-[#ff4e00] text-white font-bold rounded-2xl hover:shadow-[0_0_20px_rgba(255,78,0,0.4)] transition-all flex items-center gap-2 mx-auto"
        >
          <LogIn className="w-5 h-5" />
          Login with Google
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Generation <span className="text-[#ff4e00]">History</span></h2>
          <p className="text-white/40 text-sm mt-1">Access all your past research, scripts, and visual prompts.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
          <HistoryIcon className="w-4 h-4 text-[#ff4e00]" />
          <span className="text-sm font-mono">{generations.length} Saved Generations</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              type="text" 
              placeholder="Search history..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#ff4e00] transition-colors"
            />
          </div>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 text-[#ff4e00] animate-spin" />
              </div>
            ) : generations.length === 0 ? (
              <div className="text-center py-10 px-4 bg-white/5 border border-dashed border-white/10 rounded-2xl">
                <Ghost className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-sm text-white/30">No generations found yet.</p>
              </div>
            ) : (
              generations.map((gen) => (
                <div
                  key={gen.id}
                  onClick={() => {
                    setSelectedId(gen.id!);
                    setActiveTab("research");
                  }}
                  className={cn(
                    "w-full p-4 rounded-2xl border transition-all text-left group relative overflow-hidden cursor-pointer",
                    selectedId === gen.id 
                      ? "bg-[#ff4e00]/10 border-[#ff4e00] shadow-[0_0_15px_rgba(255,78,0,0.1)]" 
                      : "bg-[#151515] border-white/10 hover:border-white/20"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-[#ff4e00] uppercase tracking-widest">{gen.scriptStyle}</span>
                    <button 
                      onClick={(e) => handleDeleteClick(e, gen.id!)}
                      className="p-1.5 text-white/20 hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="font-bold text-white mb-2 line-clamp-1">{gen.topic}</h4>
                  <div className="flex items-center gap-3 text-[10px] text-white/40">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {gen.createdAt?.toDate ? gen.createdAt.toDate().toLocaleDateString() : 'Recent'}
                    </div>
                    <div className="flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {gen.imageryStyle}
                    </div>
                  </div>
                  {selectedId === gen.id && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-[#ff4e00]" 
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {selectedGen ? (
              <motion.div
                key={selectedGen.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-[#151515] border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[600px]"
              >
                {/* Tabs Header */}
                <div className="flex border-b border-white/10 bg-black/20">
                  <button
                    onClick={() => setActiveTab("research")}
                    className={cn(
                      "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                      activeTab === "research" ? "text-[#ff4e00] border-[#ff4e00] bg-[#ff4e00]/5" : "text-white/40 border-transparent hover:text-white/60"
                    )}
                  >
                    Research
                  </button>
                  <button
                    onClick={() => setActiveTab("script")}
                    className={cn(
                      "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                      activeTab === "script" ? "text-[#ff4e00] border-[#ff4e00] bg-[#ff4e00]/5" : "text-white/40 border-transparent hover:text-white/60"
                    )}
                  >
                    Script
                  </button>
                  {selectedGen.extendedScript && (
                    <button
                      onClick={() => setActiveTab("extended")}
                      className={cn(
                        "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                        activeTab === "extended" ? "text-[#ff4e00] border-[#ff4e00] bg-[#ff4e00]/5" : "text-white/40 border-transparent hover:text-white/60"
                      )}
                    >
                      Extended
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab("prompts")}
                    className={cn(
                      "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                      activeTab === "prompts" ? "text-[#ff4e00] border-[#ff4e00] bg-[#ff4e00]/5" : "text-white/40 border-transparent hover:text-white/60"
                    )}
                  >
                    Prompts
                  </button>
                  {selectedGen.seo && (
                    <button
                      onClick={() => setActiveTab("seo")}
                      className={cn(
                        "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                        activeTab === "seo" ? "text-[#ff4e00] border-[#ff4e00] bg-[#ff4e00]/5" : "text-white/40 border-transparent hover:text-white/60"
                      )}
                    >
                      SEO
                    </button>
                  )}
                  {(selectedGen.characterReferenceUrl || selectedGen.characterDescription) && (
                    <button
                      onClick={() => setActiveTab("character")}
                      className={cn(
                        "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
                        activeTab === "character" ? "text-[#ff4e00] border-[#ff4e00] bg-[#ff4e00]/5" : "text-white/40 border-transparent hover:text-white/60"
                      )}
                    >
                      Character
                    </button>
                  )}
                </div>

                <div className="p-8 md:p-10">
                  <AnimatePresence mode="wait">
                    {activeTab === "seo" && selectedGen.seo && (
                      <motion.div
                        key="history-seo"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="space-y-8"
                      >
                        <section>
                          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Controversial Title</label>
                          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                            <p className="text-lg font-bold text-[#ff4e00] leading-tight">{selectedGen.seo.title}</p>
                          </div>
                        </section>

                        <section>
                          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Short-Form Description</label>
                          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{selectedGen.seo.shortDescription}</p>
                          </div>
                        </section>

                        {selectedGen.seo.longDescription && (
                          <section>
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Long-Form Description</label>
                            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{selectedGen.seo.longDescription}</p>
                            </div>
                          </section>
                        )}

                        <section>
                          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">SEO Tags</label>
                          <div className="flex flex-wrap gap-2">
                            {selectedGen.seo.tags.map((tag, i) => (
                              <span key={i} className="px-3 py-1 bg-[#ff4e00]/10 border border-[#ff4e00]/20 rounded-full text-[10px] font-bold text-[#ff4e00]">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </section>
                      </motion.div>
                    )}

                    {activeTab === "research" && (
                      <motion.div
                        key="history-research"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                          <div className="space-y-6">
                            <div>
                              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Suspect Name</label>
                              <p className="text-xl font-bold text-white">{selectedGen.research.suspectName}</p>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Who they were</label>
                              <p className="text-white/70 leading-relaxed text-sm">{selectedGen.research.whoTheyWere}</p>
                            </div>
                          </div>
                          <div className="space-y-6">
                            <div>
                              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">The Incident</label>
                              <p className="text-white/70 leading-relaxed text-sm">{selectedGen.research.whatHappened}</p>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">The Outcome</label>
                              <p className="text-white/70 leading-relaxed text-sm">{selectedGen.research.howTheyEndedUpThere}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mb-10">
                          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-4">Key Evidence & Facts</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedGen.research.keyFacts.map((fact, i) => (
                              <div key={i} className="flex gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                                <Search className="w-4 h-4 text-[#ff4e00] shrink-0 mt-0.5" />
                                <p className="text-xs text-white/80">{fact}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "script" && (
                      <motion.div
                        key="history-script"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                      >
                        <div className="prose prose-invert prose-orange max-w-none prose-p:text-white/80 prose-p:leading-relaxed prose-p:text-sm prose-headings:text-white prose-strong:text-[#ff4e00]">
                          <ReactMarkdown>{selectedGen.script}</ReactMarkdown>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "extended" && selectedGen.extendedScript && (
                      <motion.div
                        key="history-extended"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                      >
                        <div className="space-y-10">
                          <div className="prose prose-invert prose-orange max-w-none prose-p:text-white/80 prose-p:leading-relaxed prose-p:text-sm prose-headings:text-white prose-strong:text-[#ff4e00]">
                            <ReactMarkdown>{selectedGen.extendedScript}</ReactMarkdown>
                          </div>

                          {selectedGen.extendedImagePrompts && selectedGen.extendedImagePrompts.length > 0 && (
                            <div className="pt-10 border-t border-white/10">
                              <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                                <Video className="w-5 h-5 text-[#ff4e00]" />
                                Extended Storyboard <span className="text-[10px] font-normal text-white/40">(30 Scenes)</span>
                              </h3>
                              <div className="space-y-4">
                                {selectedGen.extendedImagePrompts.map((prompt, i) => (
                                  <div key={i} className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-4">
                                      <span className="w-6 h-6 bg-[#ff4e00] text-white rounded flex items-center justify-center font-bold text-[10px]">
                                        {prompt.sceneNumber}
                                      </span>
                                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Scene {prompt.sceneNumber}</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-[10px] font-bold text-[#ff4e00] uppercase tracking-widest block mb-1">Image</label>
                                        <p className="text-xs text-white/80 leading-relaxed italic">"{prompt.imagePrompt}"</p>
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">Animation</label>
                                        <p className="text-xs text-white/80 leading-relaxed italic">"{prompt.animationPrompt}"</p>
                                      </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-white/5">
                                      <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest block mb-1">Script Line</label>
                                      <p className="text-[10px] text-white/40 italic">"{prompt.scriptLine}"</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "prompts" && (
                      <motion.div
                        key="history-prompts"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="space-y-6"
                      >
                        {selectedGen.imagePrompts.map((prompt, i) => (
                          <div key={i} className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                            <div className="flex items-center gap-3 mb-4">
                              <span className="w-6 h-6 bg-[#ff4e00] text-white rounded flex items-center justify-center font-bold text-[10px]">
                                {prompt.sceneNumber}
                              </span>
                              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Scene {prompt.sceneNumber}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-[10px] font-bold text-[#ff4e00] uppercase tracking-widest block mb-1">Image</label>
                                <p className="text-xs text-white/80 leading-relaxed italic">"{prompt.imagePrompt}"</p>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">Animation</label>
                                <p className="text-xs text-white/80 leading-relaxed italic">"{prompt.animationPrompt}"</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {activeTab === "character" && (
                      <motion.div
                        key="history-character"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="space-y-8"
                      >
                        {selectedGen.characterReferenceUrl && (
                          <div>
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-4">Reference Image</label>
                            <div className="w-full max-w-sm aspect-square rounded-3xl overflow-hidden border border-white/10 bg-black/40">
                              <img 
                                src={selectedGen.characterReferenceUrl} 
                                alt="Character Reference" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        )}
                        {selectedGen.characterDescription && (
                          <div>
                            <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-4">Character Description</label>
                            <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
                              <p className="text-sm text-white/80 leading-relaxed italic">"{selectedGen.characterDescription}"</p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[600px] bg-[#151515] border border-white/10 border-dashed rounded-3xl text-center p-12">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                  <HistoryIcon className="w-8 h-8 text-white/10" />
                </div>
                <h3 className="text-xl font-bold text-white/40 mb-2">Select a generation</h3>
                <p className="text-white/20 text-sm max-w-xs mx-auto">
                  Click on any case from the list on the left to view its full research, script, and visual prompts.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Generation?"
        description="This action cannot be undone. This generation will be permanently removed from your history and the cloud."
        confirmText="Delete"
        variant="danger"
      />
    </main>
  );
}

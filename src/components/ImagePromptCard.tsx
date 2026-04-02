import React, { useState } from 'react';
import { Download, ImageIcon, Loader2, Key } from 'lucide-react';
import { ImagePrompt } from '../types';
import { generateImage, hasApiKey, openKeySelector } from '../services/geminiService';
import { cn } from '../lib/utils';

interface ImagePromptCardProps {
  prompt: ImagePrompt;
  onImageGenerated: (url: string) => void;
  onPromptEdited: (newPrompt: string) => void;
  referenceImageBase64?: string | null;
}

export default function ImagePromptCard({ prompt, onImageGenerated, onPromptEdited, referenceImageBase64 }: ImagePromptCardProps) {
  const [loading, setLoading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16">("1:1");
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt.imagePrompt);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const imageUrl = await generateImage(editedPrompt, aspectRatio, referenceImageBase64 || undefined);
      onImageGenerated(imageUrl);
    } catch (err: any) {
      setError(err.message || "Failed to generate image");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrompt = () => {
    onPromptEdited(editedPrompt);
    setIsEditing(false);
  };

  const handleDownload = () => {
    if (!prompt.generatedImageUrl) return;
    const link = document.createElement('a');
    link.href = prompt.generatedImageUrl;
    link.download = `scene-${prompt.sceneNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-[#ff4e00] uppercase tracking-widest">Scene {prompt.sceneNumber}</span>
          <p className="text-sm text-white/80 leading-relaxed">{prompt.scriptLine}</p>
        </div>
      </div>

      <div className="p-4 bg-black/20 rounded-xl border border-white/5 space-y-2">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white/80 focus:ring-1 focus:ring-[#ff4e00] transition-all min-h-[80px]"
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditedPrompt(prompt.imagePrompt);
                }}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-white/40 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePrompt}
                className="px-3 py-1 bg-[#ff4e00] hover:bg-[#ff6a00] rounded-lg text-[10px] font-bold text-white transition-all"
              >
                Save Prompt
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start gap-4">
            <p className="text-xs text-white/40 italic">"{prompt.imagePrompt}"</p>
            <div className="flex items-center gap-3 shrink-0">
              <button 
                onClick={handleGenerate}
                disabled={loading}
                className="text-[10px] font-bold text-[#ff4e00] hover:text-[#ff6a00] uppercase tracking-widest flex items-center gap-1 disabled:opacity-50 transition-colors"
                title="Regenerate this scene image"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                Regenerate
              </button>
              <button 
                onClick={() => setIsEditing(true)}
                className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          {(["1:1", "16:9", "9:16"] as const).map((ratio) => (
            <button
              key={ratio}
              onClick={() => setAspectRatio(ratio)}
              className={cn(
                "flex-1 py-2 text-[10px] font-bold rounded-lg border transition-all",
                aspectRatio === ratio 
                  ? "bg-[#ff4e00] border-[#ff4e00] text-white" 
                  : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
              )}
            >
              {ratio}
            </button>
          ))}
        </div>

        {prompt.generatedImageUrl ? (
          <div className="relative group">
            <img 
              src={prompt.generatedImageUrl} 
              alt={`Scene ${prompt.sceneNumber}`}
              className={cn(
                "w-full rounded-xl border border-white/10 transition-all duration-500",
                aspectRatio === "1:1" ? "aspect-square object-cover" : 
                aspectRatio === "16:9" ? "aspect-video object-cover" : 
                "aspect-[9/16] object-cover"
              )}
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 rounded-xl">
              <button 
                onClick={handleGenerate}
                disabled={loading}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                title="Regenerate"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
              </button>
              <button 
                onClick={handleDownload}
                className="p-3 bg-[#ff4e00] hover:bg-[#ff6a00] rounded-full text-white transition-all"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
            {/* Always visible download button for better UX */}
            <button 
              onClick={handleDownload}
              className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-[#ff4e00] rounded-lg text-white transition-all backdrop-blur-sm border border-white/10 z-10"
              title="Download Image"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                Generate Scene Image
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-500 text-[10px]">
          <Key className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

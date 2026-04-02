import React, { useState, useRef } from 'react';
import { Upload, ImageIcon, Loader2, User, X, RefreshCw, LayoutGrid, Download } from 'lucide-react';
import { ImageryStyle } from '../types';
import { generateCharacterReference, hasApiKey, openKeySelector } from '../services/geminiService';
import { cn } from '../lib/utils';

interface CharacterReferenceProps {
  topic: string;
  imageryStyle: ImageryStyle;
  onReferenceChange: (url: string | null) => void;
  initialUrl?: string;
  characterDescription?: string;
}

export default function CharacterReference({ 
  topic, 
  imageryStyle, 
  onReferenceChange,
  initialUrl,
  characterDescription
}: CharacterReferenceProps) {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(initialUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16">("1:1");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = await generateCharacterReference(topic, imageryStyle, aspectRatio, characterDescription);
      setImageUrl(url);
      onReferenceChange(url);
    } catch (err: any) {
      setError(err.message || "Failed to generate character reference");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImageUrl(base64String);
      onReferenceChange(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setImageUrl(null);
    onReferenceChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `character-reference-${topic.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 md:p-8 mb-8 overflow-hidden relative group">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#ff4e00]/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
        {/* Image Display / Placeholder */}
        <div className={cn(
          "shrink-0 relative transition-all duration-500 ease-in-out",
          aspectRatio === "1:1" ? "w-48 h-48 md:w-56 md:h-56" : 
          aspectRatio === "16:9" ? "w-64 h-36 md:w-80 md:h-44" : 
          "w-36 h-64 md:w-44 md:h-80"
        )}>
          {imageUrl ? (
            <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-[#ff4e00]/30 group-hover:border-[#ff4e00] transition-all relative shadow-2xl shadow-[#ff4e00]/10">
              <img 
                src={imageUrl} 
                alt="Character Reference" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={handleRemove}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 rounded-full text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <button 
                onClick={handleDownload}
                className="absolute bottom-2 right-2 p-1.5 bg-[#ff4e00] hover:bg-[#ff6a00] rounded-full text-white transition-all shadow-lg"
                title="Download Reference"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-full h-full rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center text-white/20">
              <User className="w-12 h-12 mb-3" />
              <p className="text-[10px] font-bold uppercase tracking-widest">No Reference</p>
            </div>
          )}
          
          {loading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-2xl">
              <Loader2 className="w-8 h-8 text-[#ff4e00] animate-spin" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-6 text-center md:text-left w-full">
          <div>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-center md:justify-start gap-2">
              <User className="w-5 h-5 text-[#ff4e00]" />
              Fictional Character Reference (Actor)
            </h3>
            <p className="text-sm text-white/40 max-w-md">
              Upload or generate a reference image of a fictional character (actor) to maintain visual consistency across all scenes in your script.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Upload Option */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest block">Upload Photo</label>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white/60 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Choose Image
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
            </div>

            {/* Generate Option */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest block">AI Generate</label>
              <div className="flex gap-2 mb-2">
                {(["1:1", "16:9", "9:16"] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={cn(
                      "flex-1 py-1.5 text-[9px] font-bold rounded-lg border transition-all",
                      aspectRatio === ratio 
                        ? "bg-[#ff4e00] border-[#ff4e00] text-white" 
                        : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                    )}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
              <button 
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-3 bg-[#ff4e00]/10 hover:bg-[#ff4e00]/20 border border-[#ff4e00]/30 rounded-xl text-xs font-bold text-[#ff4e00] transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                Generate Reference
              </button>
            </div>
          </div>

          {error && (
            <p className="text-[10px] text-red-500 bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
              {error}
            </p>
          )}

          {imageUrl && (
            <div className="flex items-center gap-2 text-[10px] font-bold text-green-500 uppercase tracking-widest">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Character Consistency Active
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

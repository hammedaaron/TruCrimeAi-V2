import { ShieldAlert, ImageIcon, Video, FileText } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10 py-12 bg-black">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-2 opacity-50">
          <ShieldAlert className="w-5 h-5 text-[#ff4e00]" />
          <span className="text-sm font-bold tracking-tight">TrueCrime AI</span>
        </div>
        <p className="text-xs text-white/30 text-center md:text-left">
          © 2026 TrueCrime AI. Powered by Gemini 3.1 Flash. For content creation purposes only.
        </p>
        <div className="flex gap-6">
          <a href="#" className="text-white/30 hover:text-white transition-colors"><ImageIcon className="w-5 h-5" /></a>
          <a href="#" className="text-white/30 hover:text-white transition-colors"><Video className="w-5 h-5" /></a>
          <a href="#" className="text-white/30 hover:text-white transition-colors"><FileText className="w-5 h-5" /></a>
        </div>
      </div>
    </footer>
  );
}

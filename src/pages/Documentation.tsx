import { FileText, ShieldAlert, Search, Video, Mic2, Settings2 } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";

export default function Documentation() {
  const sections = [
    {
      title: "Getting Started",
      icon: <Search className="w-5 h-5 text-[#ff4e00]" />,
      content: "TrueCrime AI is designed for creators of faceless mystery and true crime YouTube channels. Simply enter a topic or use our Case Explorer to find historical incidents. Our AI will handle the research, scriptwriting, and visual prompt generation."
    },
    {
      title: "Research Engine",
      icon: <ShieldAlert className="w-5 h-5 text-[#ff4e00]" />,
      content: "We use Gemini 3.1 Flash with Google Search grounding to ensure high accuracy. Our system verifies victim details, timelines, and key evidence from multiple sources to provide you with a solid foundation for your content."
    },
    {
      title: "Script Styles",
      icon: <Mic2 className="w-5 h-5 text-[#ff4e00]" />,
      content: "Choose from four distinct styles: Storytelling (narrative-driven), Journalist (factual and objective), Narrator (classic documentary style), or Incident Reporting (urgent and direct). Each script is optimized for a 90-second video."
    },
    {
      title: "Visual Storyboarding",
      icon: <Video className="w-5 h-5 text-[#ff4e00]" />,
      content: "For every script, we generate 15 detailed scene prompts. These include both image generation prompts (for Midjourney/DALL-E) and animation prompts (for Runway/Luma). You can choose between Realistic, Anime, or 3D styles."
    }
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <div className="max-w-3xl mx-auto text-center mb-10 md:mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
          Documentation & <span className="text-[#ff4e00]">Guides</span>
        </h2>
        <p className="text-white/60 text-sm md:text-base">
          Learn how to master TrueCrime AI to create high-quality, engaging content for your audience.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
        {sections.map((section, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#151515] border border-white/10 rounded-3xl p-6 md:p-8 hover:border-[#ff4e00]/30 transition-all group"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 md:mb-6 group-hover:bg-[#ff4e00]/10 transition-colors">
              {section.icon}
            </div>
            <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">{section.title}</h3>
            <p className="text-white/60 leading-relaxed text-xs md:text-sm">
              {section.content}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 md:mt-16 p-6 md:p-8 bg-gradient-to-r from-[#ff4e00]/10 to-transparent border border-[#ff4e00]/20 rounded-3xl max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-[#ff4e00] rounded-2xl flex items-center justify-center shrink-0">
            <Settings2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold mb-2">Advanced Configuration</h3>
            <p className="text-white/60 text-xs md:text-sm leading-relaxed mb-4">
              You can customize the AI's behavior in the Settings panel. Adjust the research depth, script complexity, and prompt detail level to match your specific channel's voice and aesthetic.
            </p>
            <Link to="/settings" className="text-[#ff4e00] text-xs md:text-sm font-bold flex items-center gap-2 hover:gap-3 transition-all">
              Open Settings <FileText className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

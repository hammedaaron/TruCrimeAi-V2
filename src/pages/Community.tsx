import { Users, MessageSquare, Share2, Award, Heart, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";

export default function Community() {
  const stats = [
    { label: "Active Creators", value: "12,400+" },
    { label: "Scripts Generated", value: "85k+" },
    { label: "Community Discord", value: "Join Now" },
  ];

  const features = [
    {
      title: "Creator Showcase",
      icon: <Award className="w-5 h-5 text-[#ff4e00]" />,
      description: "Share your finished videos and get feedback from fellow true crime creators. We feature the best content every week."
    },
    {
      title: "Collaborative Research",
      icon: <Users className="w-5 h-5 text-[#ff4e00]" />,
      description: "Join our research groups to deep-dive into complex cold cases. Share sources and verify facts together."
    },
    {
      title: "Prompt Engineering",
      icon: <MessageSquare className="w-5 h-5 text-[#ff4e00]" />,
      description: "Exchange the best Midjourney and Runway prompts to achieve consistent visual styles across your channel."
    }
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <div className="max-w-3xl mx-auto text-center mb-10 md:mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
          Join the <span className="text-[#ff4e00]">Creator Community</span>
        </h2>
        <p className="text-white/60 text-sm md:text-base">
          Connect with thousands of true crime and mystery enthusiasts. Share tips, tricks, and grow your channel together.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-12 md:mb-16">
        {stats.map((stat, i) => (
          <div key={i} className="bg-[#151515] border border-white/10 rounded-2xl p-6 md:p-8 text-center">
            <p className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-[10px] md:text-xs font-bold text-white/30 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-16">
        {features.map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#151515] border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col items-center text-center group hover:bg-white/5 transition-all"
          >
            <div className="w-12 h-12 md:w-14 md:h-14 bg-white/5 rounded-full flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
              {feature.icon}
            </div>
            <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">{feature.title}</h3>
            <p className="text-white/60 text-xs md:text-sm leading-relaxed">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="bg-[#ff4e00] rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10"><ShieldAlert className="w-16 h-16 md:w-24 md:h-24" /></div>
          <div className="absolute bottom-10 right-10"><Users className="w-20 h-20 md:w-32 md:h-32" /></div>
        </div>
        <div className="relative z-10">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to elevate your content?</h3>
          <p className="text-white/80 mb-6 md:mb-8 text-sm md:text-base max-w-xl mx-auto">
            Join our private Discord server to get early access to new features, participate in monthly challenges, and win exclusive assets.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
            <button className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 bg-white text-[#ff4e00] font-bold rounded-xl hover:bg-white/90 transition-all flex items-center justify-center gap-2 text-sm md:text-base">
              <Share2 className="w-4 h-4 md:w-5 md:h-5" /> Join Discord
            </button>
            <button className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 bg-black/20 text-white font-bold rounded-xl hover:bg-black/30 transition-all flex items-center justify-center gap-2 text-sm md:text-base">
              <Heart className="w-4 h-4 md:w-5 md:h-5" /> Support Us
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

import { useState } from "react";
import { ShieldAlert, Settings2, Menu, X, History, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, login, logout } = useAuth();

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Case Explorer", path: "/explorer" },
    { name: "History", path: "/history" },
  ];

  return (
    <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#ff4e00] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,78,0,0.3)]">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            TrueCrime AI <span className="text-[#ff4e00] text-xs font-mono ml-1">V2.0</span>
          </h1>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "transition-colors hover:text-[#ff4e00] flex items-center gap-1.5",
                location.pathname === item.path ? "text-[#ff4e00]" : "text-white/40"
              )}
            >
              {item.name === "History" && <History className="w-3.5 h-3.5" />}
              {item.name}
            </Link>
          ))}
          
          <div className="h-4 w-[1px] bg-white/10 mx-1" />

          <Link 
            to="/settings"
            className={cn(
              "px-3 py-1 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors flex items-center gap-2",
              location.pathname === "/settings" ? "text-[#ff4e00] border-[#ff4e00]/30" : "text-white/40"
            )}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Settings
          </Link>

          {user ? (
            <div className="flex items-center gap-2 ml-1">
              <div className="flex items-center gap-2 text-white/40">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ""} className="w-5 h-5 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
                <span className="hidden lg:block max-w-[80px] truncate">{user.displayName}</span>
              </div>
              <button 
                onClick={() => logout()}
                className="p-1.5 text-white/20 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => login()}
              className="flex items-center gap-2 px-3 py-1 bg-[#ff4e00]/10 text-[#ff4e00] border border-[#ff4e00]/20 rounded-full hover:bg-[#ff4e00]/20 transition-all font-bold"
            >
              <LogIn className="w-3.5 h-3.5" />
              Login
            </button>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 text-white/60 hover:text-white transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/10 bg-black/95 overflow-hidden"
          >
            <div className="flex flex-col p-4 gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "text-lg font-medium py-2 transition-colors flex items-center gap-3",
                    location.pathname === item.path ? "text-[#ff4e00]" : "text-white/60"
                  )}
                >
                  {item.name === "History" && <History className="w-5 h-5" />}
                  {item.name}
                </Link>
              ))}
              <Link 
                to="/settings"
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  "w-full mt-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2",
                  location.pathname === "/settings" ? "text-[#ff4e00] border-[#ff4e00]/30" : "text-white/60"
                )}
              >
                <Settings2 className="w-5 h-5" />
                Settings
              </Link>

              {user ? (
                <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-3 text-white/60">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || ""} className="w-10 h-10 rounded-full border border-white/10" referrerPolicy="no-referrer" />
                    ) : (
                      <UserIcon className="w-10 h-10" />
                    )}
                    <div>
                      <p className="font-bold text-white">{user.displayName}</p>
                      <p className="text-xs">{user.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { logout(); setIsMenuOpen(false); }}
                    className="w-full px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all font-bold flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => { login(); setIsMenuOpen(false); }}
                  className="w-full mt-4 px-4 py-3 bg-[#ff4e00] text-white rounded-xl hover:shadow-[0_0_20px_rgba(255,78,0,0.4)] transition-all font-bold flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  Login with Google
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

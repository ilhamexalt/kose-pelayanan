"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

interface NavbarProps {
  user: any;
  isMobileOpen: boolean;
  setIsMobileOpen: (val: boolean) => void;
  isDesktopOpen: boolean;
  setIsDesktopOpen: (val: boolean) => void;
}

export default function Navbar({ user, isMobileOpen, setIsMobileOpen, isDesktopOpen, setIsDesktopOpen }: NavbarProps) {
  const router = useRouter();
  const [greeting, setGreeting] = useState("Selamat Datang");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 11) setGreeting("Selamat Pagi");
    else if (hour >= 11 && hour < 15) setGreeting("Selamat Siang");
    else if (hour >= 15 && hour < 18) setGreeting("Selamat Sore");
    else setGreeting("Selamat Malam");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 sm:px-6 transition-colors duration-300">
      <div className="flex items-center gap-4">

        {/* Toggle Button for Mobile */}
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* <img src="/assets/images/header.png" alt="Header" className="h-12 md:h-16 w-auto object-contain hidden sm:block -ml-2" /> */}

        <h1 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 hidden sm:block">
          {greeting}, <span className="uppercase text-[#DA251C]">{user?.nama || user?.nip || 'User'}</span>
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <ThemeToggle />

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-[#DA251C] dark:text-red-400 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </div>
    </header>
  );
}

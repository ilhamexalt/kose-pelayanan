"use client";

import React from "react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      aria-label="Toggle theme"
      className={`relative inline-flex items-center justify-center p-2 rounded-full border transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DA251C] shadow-sm hover:shadow ${
        theme === "dark"
          ? "bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700 hover:border-slate-600 hover:scale-105"
          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-amber-500 hover:scale-105"
      } ${className}`}
    >
      {theme === "dark" ? (
        <svg className="w-5 h-5 transition-transform duration-300 transform rotate-0 hover:rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 transition-transform duration-300 transform -rotate-12 hover:-rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

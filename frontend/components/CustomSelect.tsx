"use client";

import React, { useState, useRef, useEffect } from "react";

export interface OptionItem {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: OptionItem[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  required?: boolean;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "-- Pilih --",
  disabled = false,
  className = "",
  id,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt: OptionItem) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative select-none ${className}`} id={id}>
      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`w-full flex items-center justify-between bg-white dark:bg-slate-800 border ${
          isOpen
            ? "border-[#DA251C] ring-2 ring-[#DA251C]/15 dark:border-red-500"
            : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600"
        } rounded-lg px-4 py-2.5 text-sm transition-all duration-200 ${
          disabled
            ? "bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed border-slate-200 dark:border-slate-800"
            : "cursor-pointer text-slate-800 dark:text-slate-100 shadow-xs"
        }`}
      >
        <span className={`block truncate ${!selectedOption ? "text-slate-400 dark:text-slate-500 font-normal" : "font-medium"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 ml-2 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "transform rotate-180 text-[#DA251C]" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl max-h-60 overflow-y-auto py-1.5 animate-fadeIn backdrop-blur-md">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt)}
                className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  opt.disabled
                    ? "text-slate-300 dark:text-slate-600 cursor-not-allowed bg-slate-50/50 dark:bg-slate-900/30"
                    : isSelected
                    ? "bg-red-50 dark:bg-red-950/50 text-[#DA251C] dark:text-red-400 font-semibold cursor-pointer"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <svg className="w-4 h-4 text-[#DA251C] dark:text-red-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

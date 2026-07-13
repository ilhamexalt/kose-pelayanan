"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-red-100 dark:bg-red-950/50 text-[#DA251C] rounded-full flex items-center justify-center mb-6">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      </div>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">
        Terjadi Kesalahan
      </h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
        Maaf, sistem mengalami gangguan saat memproses permintaan Anda. Silakan coba lagi.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => reset()}
          className="px-6 py-2.5 bg-[#DA251C] hover:bg-red-700 text-white font-medium rounded-lg transition-colors cursor-pointer"
        >
          Coba Lagi
        </button>
        <Link 
          href="/dashboard"
          className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors flex items-center justify-center"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-8 relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-7xl font-black text-slate-300 dark:text-slate-700">
          404
        </div>
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4">
        Halaman Tidak Ditemukan
      </h1>
      <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
        Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan.
      </p>
      <Link 
        href="/dashboard"
        className="inline-flex items-center justify-center px-6 py-3 bg-[#DA251C] hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}

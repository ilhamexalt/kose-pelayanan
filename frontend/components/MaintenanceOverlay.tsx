"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";

export default function MaintenanceOverlay({ children }: { children?: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "general"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setIsMaintenance(data.maintenanceMode === true);
      } else {
        setIsMaintenance(false);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to maintenance status:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 1. Tunggu sampai status maintenance selesai di-fetch dari Firebase
  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-[#090d16]" />;
  }

  // 2. Jika maintenance TIDAK aktif, langsung tampilkan halaman web
  if (!isMaintenance) {
    return <>{children}</>;
  }

  // 3. Maintenance AKTIF. Kita harus cek apakah user ini admin atau bukan.
  // Jika status login (auth) masih loading, tunggu sebentar.
  if (isAuthLoading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-[#090d16]" />;
  }

  // 4. Auth sudah selesai. Jika dia admin, izinkan masuk (bypass).
  const isAdmin = user && String(user.role).toLowerCase() === 'admin';
  if (isAdmin) {
    return <>{children}</>;
  }

  // 5. Bukan admin, tampilkan layar maintenance.

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-[#090d16] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-br from-[#DA251C]/10 via-transparent to-[#F1B434]/10 blur-3xl opacity-50 z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-[#DA251C] dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Under Maintenance</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 font-medium leading-relaxed">
            Mohon maaf, sistem One Portal OJK Provinsi Banten sedang dalam perbaikan rutin. Silakan kembali beberapa saat lagi.
          </p>

          <div className="w-full flex justify-center pb-2">
            <div className="flex space-x-2">
              <div className="w-2.5 h-2.5 bg-[#DA251C] rounded-full animate-bounce"></div>
              <div className="w-2.5 h-2.5 bg-[#DA251C] rounded-full animate-bounce" style={{ animationDelay: "0.15s" }}></div>
              <div className="w-2.5 h-2.5 bg-[#DA251C] rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

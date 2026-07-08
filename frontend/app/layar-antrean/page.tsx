"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function DisplayScreenPage() {
    const [pelayananList, setPelayananList] = useState<any[]>([]);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        const unsubscribe = onSnapshot(collection(db, 'pelayanan'), (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPelayananList(list);
        }, (err) => {
            console.error("Realtime display error:", err);
        });

        return () => {
            clearInterval(timer);
            unsubscribe();
        };
    }, []);

    const diprosesList = pelayananList
        .filter(p => p.status === 'Diproses')
        .sort((a, b) => {
            const numA = parseInt((a.queueNumber || '').replace(/\D/g, ''), 10) || 0;
            const numB = parseInt((b.queueNumber || '').replace(/\D/g, ''), 10) || 0;
            return numA - numB;
        });

    const antreList = pelayananList
        .filter(p => p.status === 'Antre')
        .sort((a, b) => {
            const numA = parseInt((a.queueNumber || '').replace(/\D/g, ''), 10) || 0;
            const numB = parseInt((b.queueNumber || '').replace(/\D/g, ''), 10) || 0;
            return numA - numB;
        });

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
    };

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(date).replace(/\./g, ':');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col justify-between overflow-hidden font-sans select-none">
            {/* Header Bar */}
            <header className="bg-slate-900/80 border-b border-slate-800/80 px-8 py-5 flex items-center justify-between backdrop-blur shadow-xl">
                <div className="flex items-center space-x-4">
                    <div className="bg-white p-2 rounded-xl shadow-lg flex items-center justify-center">
                        <img src="/assets/images/ojk-logo.png" alt="Logo OJK" className="h-10 w-auto" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-wide text-white uppercase">Portal Layanan Konsumen</h1>
                        <p className="text-xs font-semibold text-[#DA251C] tracking-widest uppercase">Otoritas Jasa Keuangan</p>
                    </div>
                </div>

                {currentTime && (
                    <div className="text-right flex items-center space-x-6">
                        <div className="hidden sm:block text-slate-400 text-sm font-medium">
                            {formatDate(currentTime)}
                        </div>
                        <div className="bg-slate-800/90 border border-slate-700/50 px-5 py-2 rounded-xl text-3xl font-extrabold tracking-wider text-amber-400 shadow-inner font-mono">
                            {formatTime(currentTime)}
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content Grid */}
            <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden max-w-[1920px] mx-auto w-full">
                {/* Left / Active Calling Section */}
                <div className="lg:col-span-8 flex flex-col h-full bg-slate-900/50 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#DA251C] via-amber-500 to-[#DA251C]" />

                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
                        <div className="flex items-center space-x-3">
                            <span className="relative flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                            </span>
                            <h2 className="text-2xl font-extrabold tracking-wider uppercase text-slate-100">Sedang Dilayani</h2>
                        </div>
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-3 py-1.5 rounded-full font-bold">
                            {diprosesList.length} LOKET AKTIF
                        </span>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-2 content-start">
                        {diprosesList.length > 0 ? (
                            diprosesList.map((item) => (
                                <div
                                    key={item.id}
                                    className="bg-gradient-to-b from-slate-800/90 to-slate-800/40 border border-slate-700/60 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between group transform hover:scale-[1.02] transition-all duration-300"
                                >
                                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#DA251C]/10 rounded-full blur-2xl pointer-events-none" />

                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Nomor Antrean</span>
                                        <div className="text-6xl xl:text-7xl font-black text-amber-400 tracking-tight font-mono drop-shadow-md py-2">
                                            {item.queueNumber || item.id}
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between bg-slate-900/60 -mx-6 -mb-6 p-4 px-6 rounded-b-2xl">
                                        <div className="flex items-center space-x-3 truncate">
                                            <div className="w-8 h-8 rounded-lg bg-[#DA251C] flex items-center justify-center shrink-0 shadow">
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            </div>
                                            <div className="truncate">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Petugas Layanan</span>
                                                <span className="text-base font-bold text-white truncate block">
                                                    {item.processedBy?.nama || item.processedBy?.nip || 'Petugas'}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="bg-blue-500/20 text-blue-300 text-[11px] font-bold px-2.5 py-1 rounded border border-blue-500/30 shrink-0">
                                            LOKET
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center h-80 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500">
                                <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p className="text-xl font-bold text-slate-400">Belum Ada Antrean Dilayani</p>
                                <p className="text-sm mt-1">Nomor antrean yang dipanggil akan muncul di layar ini</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right / Waiting Queue Section */}
                <div className="lg:col-span-4 flex flex-col h-full bg-slate-900/50 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
                        <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                            <h3 className="text-xl font-extrabold tracking-wider uppercase text-slate-100">Antrean Menunggu</h3>
                        </div>
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-3 py-1 rounded-full font-bold">
                            {antreList.length} NASABAH
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                        {antreList.length > 0 ? (
                            antreList.map((item, idx) => (
                                <div
                                    key={item.id}
                                    className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 rounded-xl p-4 flex items-center justify-between transition-colors"
                                >
                                    <div className="flex items-center space-x-4">
                                        <span className="w-8 h-8 rounded-lg bg-slate-700/50 text-slate-400 font-bold flex items-center justify-center text-sm">
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <span className="text-2xl font-black text-white font-mono tracking-wide">
                                                {item.queueNumber || item.id}
                                            </span>
                                            <span className="text-xs text-slate-400 block truncate max-w-[180px]">
                                                {item.jenis || 'Layanan Konsumen'}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="bg-slate-700/40 text-slate-300 text-xs font-semibold px-3 py-1 rounded-lg">
                                        MENUNGGU
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-center">
                                <p className="text-base font-medium">Tidak ada antrean menunggu</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer Ticker Bar */}
            <footer className="bg-[#DA251C] text-white py-3 px-8 shadow-2xl border-t border-red-600 relative overflow-hidden flex items-center">
                <div className="bg-white text-[#DA251C] font-black px-4 py-1 rounded uppercase tracking-wider text-xs shrink-0 mr-4 shadow">
                    INFO LAYANAN
                </div>
                <div className="overflow-hidden whitespace-nowrap w-full relative flex items-center">
                    <div className="inline-block animate-[marquee_25s_linear_infinite] text-sm font-semibold tracking-wide">
                        Selamat Datang di Portal Pelayanan Konsumen Otoritas Jasa Keuangan (OJK). • Silakan mengambil nomor antrean pada mesin Kiosk yang tersedia. • Pastikan seluruh dokumen kelengkapan Anda telah disiapkan sebelum menuju meja layanan. • Pelayanan ini tidak dipungut biaya (GRATIS).
                    </div>
                </div>
            </footer>

            <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
        </div>
    );
}

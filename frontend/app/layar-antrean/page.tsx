"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

export default function DisplayScreenPage() {
    const [pelayananList, setPelayananList] = useState<any[]>([]);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);

    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        const q = query(
            collection(db, 'pelayanan'),
            where('status', 'in', ['Antre', 'Diproses'])
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
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
            const numA = parseInt((a.queueNumber_raw || '').replace(/\D/g, ''), 10) || 0;
            const numB = parseInt((b.queueNumber_raw || '').replace(/\D/g, ''), 10) || 0;
            return numA - numB;
        });

    const antreList = pelayananList
        .filter(p => p.status === 'Antre')
        .sort((a, b) => {
            const numA = parseInt((a.queueNumber_raw || '').replace(/\D/g, ''), 10) || 0;
            const numB = parseInt((b.queueNumber_raw || '').replace(/\D/g, ''), 10) || 0;
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
        <div className="min-h-screen bg-[#050505] relative text-white flex flex-col justify-between overflow-hidden font-sans select-none">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-red-900/20 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-amber-900/10 blur-[120px] pointer-events-none" />
            
            {/* Header Bar */}
            <header className="relative z-10 bg-white/5 border-b border-white/10 px-8 py-5 flex items-center justify-between backdrop-blur-md shadow-2xl">
                <div className="flex items-center space-x-5">
                    <div className="bg-white p-2.5 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center">
                        <img src="/assets/images/ojk-banten-logo.png" alt="Logo OJK" className="h-11 w-auto" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-wide text-white uppercase">Portal Layanan Konsumen</h1>
                        <p className="text-xs font-semibold text-[#DA251C] tracking-widest uppercase">Otoritas Jasa Keuangan</p>
                    </div>
                </div>

                {currentTime && (
                    <div className="text-right flex items-center space-x-6">
                        <div className="hidden sm:flex flex-col items-end">
                            <div className="text-slate-300 text-sm font-semibold tracking-wide uppercase">
                                {formatDate(currentTime)}
                            </div>
                        </div>
                        <div className="bg-black/40 border border-white/10 px-6 py-2.5 rounded-2xl text-4xl font-black tracking-wider text-amber-400 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] font-mono">
                            {formatTime(currentTime)}
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content Grid */}
            <main className="relative z-10 flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden max-w-[1920px] mx-auto w-full">
                {/* Left / Active Calling Section */}
                <div className="lg:col-span-8 flex flex-col h-full bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 opacity-80" />

                    <div className="flex items-center justify-between mb-8 pb-5 border-b border-white/10">
                        <div className="flex items-center space-x-4">
                            <div className="relative flex h-5 w-5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                                <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></span>
                            </div>
                            <h2 className="text-3xl font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 drop-shadow-sm">Sedang Dilayani</h2>
                        </div>
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-sm px-4 py-1.5 rounded-full font-bold shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                            {diprosesList.length} LOKET AKTIF
                        </span>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto pr-4 content-start custom-scrollbar">
                        {diprosesList.length > 0 ? (
                            diprosesList.map((item) => (
                                <div
                                    key={item.id}
                                    className="bg-black/40 border border-white/10 rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.3)] relative overflow-hidden flex flex-col justify-between transform transition-all duration-500 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(218,37,28,0.15)] hover:border-red-500/30 group/card"
                                >
                                    <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-red-600/10 rounded-full blur-[60px] pointer-events-none group-hover/card:bg-red-600/20 transition-colors duration-500" />
                                    <div className="absolute -left-10 -top-10 w-40 h-40 bg-amber-500/5 rounded-full blur-[40px] pointer-events-none" />

                                    <div className="relative z-10 text-center mb-6">
                                        <span className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] block mb-2">Nomor Antrean</span>
                                        <div className="text-7xl xl:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-500 tracking-tighter font-mono drop-shadow-[0_2px_10px_rgba(245,158,11,0.3)] py-3">
                                            {item.queueNumber_raw || item.queueNumber || item.id}
                                        </div>
                                    </div>

                                    <div className="relative z-10 mt-auto pt-5 border-t border-white/10 flex items-center justify-between bg-white/5 -mx-8 -mb-8 p-6 rounded-b-[2rem] backdrop-blur-md">
                                        <div className="flex items-center space-x-4 truncate">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(218,37,28,0.4)]">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            </div>
                                            <div className="truncate">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Petugas Layanan</span>
                                                <span className="text-lg font-bold text-white truncate block capitalize tracking-wide">
                                                    {item.processedBy?.nama || item.processedBy?.nip || 'Petugas'}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="bg-blue-500/20 text-blue-300 text-xs font-black px-4 py-2 rounded-xl border border-blue-500/30 shrink-0 uppercase tracking-widest shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                                            LOKET
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center h-[50vh] border-2 border-dashed border-white/10 rounded-[2rem] text-slate-500 bg-white/[0.01]">
                                <svg className="w-20 h-20 mb-6 opacity-40 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p className="text-2xl font-black text-slate-400 uppercase tracking-widest">Belum Ada Antrean Dilayani</p>
                                <p className="text-slate-500 mt-2 font-medium">Nomor antrean yang dipanggil akan muncul di sini</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right / Waiting Queue Section */}
                <div className="lg:col-span-4 flex flex-col h-full bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8 pb-5 border-b border-white/10">
                        <div className="flex items-center space-x-3">
                            <div className="w-3.5 h-3.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
                            <h3 className="text-2xl font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">Menunggu</h3>
                        </div>
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-sm px-4 py-1.5 rounded-full font-bold shadow-[0_0_10px_rgba(251,191,36,0.15)]">
                            {antreList.length} NASABAH
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {antreList.length > 0 ? (
                            antreList.map((item, idx) => (
                                <div
                                    key={item.id}
                                    className="bg-black/30 border border-white/5 rounded-2xl p-4.5 flex items-center justify-between transition-all duration-300 hover:bg-white/10 hover:border-white/20 group"
                                >
                                    <div className="flex items-center space-x-4">
                                        <span className="w-10 h-10 rounded-xl bg-white/5 text-slate-400 font-black flex items-center justify-center text-sm border border-white/10 group-hover:bg-amber-500/20 group-hover:text-amber-400 transition-colors">
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <span className="text-3xl font-black text-white font-mono tracking-wider drop-shadow-sm">
                                                {item.queueNumber_raw || item.queueNumber || item.id}
                                            </span>
                                            <span className="text-xs text-slate-400 block truncate max-w-[180px] font-medium tracking-wide uppercase mt-0.5">
                                                {item.jenis || 'Layanan Konsumen'}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="bg-white/5 text-slate-300 text-[10px] font-black px-3 py-1.5 rounded-lg border border-white/10 tracking-widest uppercase">
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
            <footer className="relative z-10 bg-gradient-to-r from-red-800 via-red-600 to-red-800 text-white py-4 px-8 shadow-[0_-10px_30px_rgba(218,37,28,0.2)] border-t border-red-500/50 overflow-hidden flex items-center">
                <div className="bg-white text-red-600 font-black px-5 py-2 rounded-xl uppercase tracking-widest text-xs shrink-0 mr-6 shadow-[0_0_15px_rgba(255,255,255,0.3)] z-10 relative">
                    INFO LAYANAN
                </div>
                <div className="overflow-hidden whitespace-nowrap w-full relative">
                    <div className="inline-block animate-[marquee_25s_linear_infinite] text-base font-bold tracking-widest shrink-0 pl-[100%] uppercase drop-shadow-md">
                        Selamat Datang di Portal Pelayanan Konsumen Otoritas Jasa Keuangan (OJK). • Silakan mengambil nomor antrean pada mesin Kiosk yang tersedia. • Pastikan seluruh dokumen kelengkapan Anda telah disiapkan sebelum menuju meja layanan. • Pelayanan ini tidak dipungut biaya (GRATIS).
                    </div>
                </div>
            </footer>

            <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
        </div>
    );
}

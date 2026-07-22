"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
        <div className="min-h-screen bg-[#0f172a] text-white flex flex-col justify-between font-sans select-none">
            {/* Header Bar */}
            <header className="bg-[#1e293b] border-b border-slate-700 px-8 py-5 flex items-center justify-between shadow-md">
                <div className="flex items-center space-x-5">
                    <div className="bg-white p-2.5 rounded-xl flex items-center justify-center">
                        <Image src="/assets/images/ojk-banten-logo.png" alt="Logo OJK" width={140} height={40} className="h-10 w-auto" priority />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-wide text-white uppercase">Portal Layanan Konsumen</h1>
                        <p className="text-xs font-semibold text-[#DA251C] tracking-widest uppercase">Otoritas Jasa Keuangan</p>
                    </div>
                </div>

                {currentTime && (
                    <div className="text-right flex items-center space-x-6">
                        <div className="hidden sm:flex flex-col items-end">
                            <div className="text-slate-400 text-sm font-medium tracking-wide uppercase">
                                {formatDate(currentTime)}
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-700 px-5 py-2 rounded-xl text-3xl font-bold tracking-wider text-amber-400 font-mono">
                            {formatTime(currentTime)}
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content Grid */}
            <main className="flex-1 p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 max-w-[1920px] mx-auto w-full">
                {/* Left / Active Calling Section */}
                <div className="lg:col-span-8 flex flex-col h-full bg-[#1e293b] border border-slate-700 rounded-3xl p-6 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#DA251C]" />

                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
                        <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 rounded-full bg-emerald-500 animate-pulse"></div>
                            <h2 className="text-2xl font-bold tracking-widest uppercase text-white">Sedang Dilayani</h2>
                        </div>
                        <span className="bg-emerald-500/10 text-emerald-400 text-sm px-4 py-1.5 rounded-full font-semibold">
                            {diprosesList.length} LOKET AKTIF
                        </span>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-2 custom-scrollbar">
                        {diprosesList.length > 0 ? (
                            diprosesList.map((item) => (
                                <div
                                    key={item.id}
                                    className="bg-slate-900 border border-slate-700 rounded-2xl p-6 flex flex-col justify-between shadow-sm"
                                >
                                    <div className="text-center mb-6">
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block mb-2">Nomor Antrean</span>
                                        <div className="text-7xl font-bold text-amber-400 font-mono py-2">
                                            {item.queueNumber_raw || item.queueNumber || item.id}
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-slate-800 flex items-center justify-between bg-slate-800/50 -mx-6 -mb-6 p-5 rounded-b-2xl">
                                        <div className="flex items-center space-x-4 truncate">
                                            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shrink-0">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            </div>
                                            <div className="truncate">
                                                <span className="text-xs font-medium text-slate-400 block mb-0.5">Petugas Layanan</span>
                                                <span className="text-base font-bold text-white truncate block capitalize">
                                                    {item.processedBy?.nama || item.processedBy?.nip || 'Petugas'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center h-[40vh] border-2 border-dashed border-slate-700 rounded-2xl text-slate-500">
                                <p className="text-xl font-bold text-slate-400 uppercase">Belum Ada Antrean Dilayani</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right / Waiting Queue Section */}
                <div className="lg:col-span-4 flex flex-col h-full bg-[#1e293b] border border-slate-700 rounded-3xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
                        <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                            <h3 className="text-xl font-bold tracking-widest uppercase text-white">Menunggu</h3>
                        </div>
                        <span className="bg-amber-500/10 text-amber-400 text-sm px-4 py-1.5 rounded-full font-semibold">
                            {antreList.length} NASABAH
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {antreList.length > 0 ? (
                            antreList.map((item, idx) => (
                                <div
                                    key={item.id}
                                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between"
                                >
                                    <div className="flex items-center space-x-4">
                                        <span className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 font-bold flex items-center justify-center text-sm">
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <span className="text-2xl font-bold text-white font-mono">
                                                {item.queueNumber_raw || item.queueNumber || item.id}
                                            </span>
                                            <span className="text-xs text-slate-400 block truncate max-w-[180px] uppercase mt-0.5">
                                                {item.jenis || 'Layanan'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-center">
                                <p className="text-sm font-medium">Tidak ada antrean menunggu</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer Ticker Bar */}
            <footer className="bg-[#DA251C] text-white py-3 px-6 border-t border-red-700 flex items-center overflow-hidden">
                <div className="bg-white text-red-600 font-bold px-4 py-1.5 rounded-lg text-xs shrink-0 mr-4 z-10 relative shadow-sm">
                    INFO LAYANAN
                </div>
                <div className="overflow-hidden flex-1 flex items-center pt-0.5">
                    {(() => {
                        const Marquee = 'marquee' as any;
                        return (
                            <Marquee className="text-sm font-semibold tracking-wider uppercase text-white" scrollamount="8">
                                Selamat Datang di OJK Provinsi Banten. • Silakan melakukan registrasi dengan scan QR Code yang tersedia. • Pastikan seluruh dokumen kelengkapan Anda telah disiapkan sebelum menuju meja layanan. • Pelayanan ini tidak dipungut biaya (GRATIS).
                            </Marquee>
                        );
                    })()}
                </div>
            </footer>

            <style jsx global>{`
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
        </div>
    );
}

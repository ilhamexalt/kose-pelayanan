"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { message, Modal, Tag, Tooltip } from "antd";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import dayjs from "dayjs";
import 'dayjs/locale/id';

interface Pelayanan {
  id: string;
  status: string;
  createdAt: number;
  noAntrean?: string;
  keperluan?: string;
  nama?: string;
  instansi?: string;
}

interface Peserta {
  jabatan: string;
  jumlah: number;
}

interface Meeting {
  id: string;
  ruangan: string;
  waktuMulai: string;
  waktuSelesai: string;
  tanggal: string;
  pesertaInternal: Peserta[];
  pesertaEksternal: Peserta[];
  instansi?: string;
  keterangan?: string;
}

const ALL_ROOMS = [
  "Tanjung Lesung",
  "Pulau Umang",
  "Karang Bolong",
  "Sawarna",
  "Baduy",
  "Ujung Kulon"
];

export default function OperasionalDashboardPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [pelayananList, setPelayananList] = useState<Pelayanan[]>([]);
  const [meetingList, setMeetingList] = useState<Meeting[]>([]);
  const [jadwalPepkList, setJadwalPepkList] = useState<any[]>([]);

  const [isLoadingPelayanan, setIsLoadingPelayanan] = useState(true);
  const [isLoadingMeeting, setIsLoadingMeeting] = useState(true);
  const [isLoadingJadwalPepk, setIsLoadingJadwalPepk] = useState(true);

  const [currentTime, setCurrentTime] = useState(dayjs());
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkFS = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", checkFS);
    checkFS();

    const docEl = document.documentElement as any;
    const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
    if (requestFS && !document.fullscreenElement) {
      requestFS.call(docEl).catch(() => {});
    }

    const handleFirstTouch = () => {
      if (!document.fullscreenElement && requestFS) {
        requestFS.call(docEl).catch(() => {});
      }
    };
    window.addEventListener("click", handleFirstTouch, { once: true });

    return () => {
      document.removeEventListener("fullscreenchange", checkFS);
      window.removeEventListener("click", handleFirstTouch);
    };
  }, []);

  useEffect(() => {
    if (isAuthLoading || !user) return;
    if (user.update_password === false) {
      router.push('/update-password');
      return;
    }

    const unsubscribePelayanan = onSnapshot(collection(db, 'pelayanan'), () => {
      fetchPelayanan();
    }, (error) => {
      console.error("Realtime fetch pelayanan error:", error);
      fetchPelayanan();
    });

    const unsubscribeMeeting = onSnapshot(collection(db, 'meeting'), () => {
      fetchMeeting();
    }, (error) => {
      console.error("Realtime fetch meeting error:", error);
      fetchMeeting();
    });

    const unsubscribeJadwalPepk = onSnapshot(collection(db, 'jadwal_pepk_lmst'), () => {
      fetchJadwalPepk();
    }, (error) => {
      console.error("Realtime fetch jadwal pepk error:", error);
      fetchJadwalPepk();
    });

    return () => {
      unsubscribePelayanan();
      unsubscribeMeeting();
      unsubscribeJadwalPepk();
    };
  }, [user, isAuthLoading, router]);

  const fetchPelayanan = async () => {
    try {
      const res = await fetch('/api/pelayanan');
      const json = await res.json();
      if (json.success) {
        setPelayananList(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch pelayanan", error);
    } finally {
      setIsLoadingPelayanan(false);
    }
  };

  const fetchMeeting = async () => {
    try {
      const res = await fetch('/api/meeting');
      const json = await res.json();
      if (json.success) {
        setMeetingList(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch meeting", error);
    } finally {
      setIsLoadingMeeting(false);
    }
  };

  const fetchJadwalPepk = async () => {
    try {
      const res = await fetch('/api/jadwal-pepk-lmst');
      const json = await res.json();
      if (json.success) {
        setJadwalPepkList(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch jadwal pepk", error);
    } finally {
      setIsLoadingJadwalPepk(false);
    }
  };

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-[#090d16]">
        <svg className="animate-spin h-8 w-8 text-[#DA251C]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  const todayStr = dayjs().format('YYYY-MM-DD');
  const nowTimeStr = currentTime.format('HH:mm');

  // Pelayanan Hari Ini
  const todayPelayanan = pelayananList.filter(p => {
    const pDate = dayjs(p.createdAt).format('YYYY-MM-DD');
    return pDate === todayStr;
  });

  const antreCount = todayPelayanan.filter(p => p.status === 'Antre' || !p.status).length;
  const prosesCount = todayPelayanan.filter(p => p.status === 'Diproses').length;
  const selesaiCount = todayPelayanan.filter(p => p.status === 'Selesai').length;
  const batalCount = todayPelayanan.filter(p => p.status === 'Batal').length;
  const totalAntrean = todayPelayanan.length;

  const antrePct = totalAntrean > 0 ? Math.round((antreCount / totalAntrean) * 100) : 0;
  const prosesPct = totalAntrean > 0 ? Math.round((prosesCount / totalAntrean) * 100) : 0;
  const selesaiPct = totalAntrean > 0 ? Math.round((selesaiCount / totalAntrean) * 100) : 0;
  const batalPct = totalAntrean > 0 ? Math.round((batalCount / totalAntrean) * 100) : 0;

  // Meeting Hari Ini
  const todayMeeting = meetingList
    .filter(m => m.tanggal === todayStr)
    .sort((a, b) => a.waktuMulai.localeCompare(b.waktuMulai));

  const availableRoomsCount = ALL_ROOMS.filter(r => {
    return !todayMeeting.some(m => m.ruangan === r && nowTimeStr >= m.waktuMulai && nowTimeStr < m.waktuSelesai);
  }).length;

  // Jadwal PEPK Hari Ini
  const todayJadwalPepk = jadwalPepkList
    .filter(j => {
      const d1 = j.tanggalMulai ? dayjs(j.tanggalMulai) : (j.tanggal ? dayjs(j.tanggal) : null);
      const d2 = j.tanggalSelesai ? dayjs(j.tanggalSelesai) : (j.tanggal ? dayjs(j.tanggal) : null);
      if (!d1) return false;
      const d2Safe = d2 || d1;
      const today = dayjs(todayStr);
      return (today.isSame(d1, 'day') || today.isAfter(d1, 'day')) && 
             (today.isSame(d2Safe, 'day') || today.isBefore(d2Safe, 'day'));
    })
    .sort((a, b) => (a.jamMulai || '').localeCompare(b.jamMulai || ''));

  const calculateTotalPeserta = (internal: Peserta[], eksternal: Peserta[]) => {
    const intTotal = (internal || []).reduce((acc, curr) => acc + (Number(curr.jumlah) || 0), 0);
    const eksTotal = (eksternal || []).reduce((acc, curr) => acc + (Number(curr.jumlah) || 0), 0);
    return intTotal + eksTotal;
  };

  const showPesertaDetails = (meeting: Meeting) => {
    modalApi.info({
      title: 'Rincian Peserta Meeting',
      content: (
        <div className="mt-4">
          <div className="mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
            <p className="font-bold text-slate-800 dark:text-slate-200 mb-2">Peserta Internal:</p>
            {meeting.pesertaInternal && meeting.pesertaInternal.length > 0 ? (
              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                {meeting.pesertaInternal.map((p, i) => (
                  <li key={i}><span className="capitalize">{p.jabatan}</span> ({p.jumlah} org)</li>
                ))}
              </ul>
            ) : <p className="text-slate-500 italic">Tidak ada</p>}
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-200 mb-2">Peserta Eksternal:</p>
            {meeting.pesertaEksternal && meeting.pesertaEksternal.length > 0 ? (
              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                {meeting.pesertaEksternal.map((p, i) => (
                  <li key={i}><span className="capitalize">{p.jabatan}</span> ({p.jumlah} org)</li>
                ))}
              </ul>
            ) : <p className="text-slate-500 italic">Tidak ada</p>}
          </div>
        </div>
      ),
      okText: 'Tutup'
    });
  };

  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0b0f19] p-3.5 sm:p-5 flex flex-col gap-3.5 transition-colors select-none">
      {contextHolder}
      {modalContextHolder}

      {/* Header Bar - Compact & Full Width */}
      <div className="shrink-0 flex items-center justify-between gap-4 bg-white dark:bg-slate-900 py-3 px-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Executive Daily Analytics
            </span>
          </div>
          <span className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 hidden sm:block">
            Operational Daily Dashboard
          </h1>
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden lg:block">
            — Pantauan realtime layanan antrean, ruangan meeting & agenda PEPK
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              try {
                if (document.fullscreenElement && document.exitFullscreen) {
                  document.exitFullscreen().catch(() => {});
                }
              } catch (e) {}
              router.push('/dashboard');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Kembali ke Dashboard"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Kembali</span>
          </button>

          <button
            onClick={() => {
              try {
                const docEl = document.documentElement as any;
                if (!document.fullscreenElement) {
                  const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
                  if (requestFS) requestFS.call(docEl);
                } else {
                  if (document.exitFullscreen) document.exitFullscreen();
                }
              } catch (e) {}
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
              isFullscreen
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            }`}
            title="Aktifkan / Nonaktifkan TV Mode Fullscreen (F11)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span className="hidden sm:inline">{isFullscreen ? "TV Mode Aktif" : "Layar Penuh"}</span>
          </button>

          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl">
            <svg className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="text-xs flex items-center gap-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{currentTime.locale('id').format('DD MMMM YYYY')}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600 dark:text-slate-300 font-mono font-bold">{currentTime.format('HH:mm:ss')} WIB</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Sync</span>
          </div>
        </div>
      </div>

      {/* KPI Summary Row - Compact & Full Width */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        
        {/* Total KPI */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Layanan</span>
            <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
              {isLoadingPelayanan ? '-' : totalAntrean}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Pengunjung hari ini</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-slate-600 dark:bg-slate-400 h-full w-full" />
          </div>
        </div>

        {/* Sedang Antre KPI */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">Antre</span>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-600 dark:text-amber-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{isLoadingPelayanan ? '-' : antreCount}</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">({antrePct}%)</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Menunggu</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${antrePct}%` }} />
          </div>
        </div>

        {/* Diproses KPI */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-500 uppercase tracking-wider">Diproses</span>
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600 dark:text-blue-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{isLoadingPelayanan ? '-' : prosesCount}</span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">({prosesPct}%)</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Dilayani</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${prosesPct}%` }} />
          </div>
        </div>

        {/* Selesai KPI */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">Selesai</span>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600 dark:text-emerald-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{isLoadingPelayanan ? '-' : selesaiCount}</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">({selesaiPct}%)</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Tuntas</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${selesaiPct}%` }} />
          </div>
        </div>

        {/* Batal KPI */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-500 uppercase tracking-wider">Batal</span>
            <div className="p-1.5 bg-rose-50 dark:bg-rose-950/40 rounded-lg text-rose-600 dark:text-rose-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{isLoadingPelayanan ? '-' : batalCount}</span>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">({batalPct}%)</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Dibatalkan</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${batalPct}%` }} />
          </div>
        </div>

      </div>

      {/* Main Analytical Grid - Flex 1 to Fill Exactly Remaining Screen Height */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* Left Column (7 cols): Room Occupancy & Meeting Schedule Table */}
        <div className="lg:col-span-7 flex flex-col gap-3.5 min-h-0">
          
          {/* Room Occupancy Grid Card (Shrink-0 to fit 2 rows of rooms without scrolling) */}
          <div className="shrink-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-3.5 overflow-hidden">
            <div className="pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Live Status Ruang Meeting
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ketersediaan {ALL_ROOMS.length} ruang rapat saat ini
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{availableRoomsCount}</span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-800 dark:text-slate-200">{ALL_ROOMS.length} Tersedia</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 overflow-hidden">
              {ALL_ROOMS.map((roomName) => {
                const currentMeeting = todayMeeting.find(m => {
                  return m.ruangan === roomName && nowTimeStr >= m.waktuMulai && nowTimeStr < m.waktuSelesai;
                });
                const nextMeeting = todayMeeting
                  .filter(m => m.ruangan === roomName && m.waktuMulai > nowTimeStr)
                  .sort((a, b) => a.waktuMulai.localeCompare(b.waktuMulai))[0];

                const isAvailable = !currentMeeting;

                return (
                  <div
                    key={roomName}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                      isAvailable
                        ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40"
                        : "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate" title={roomName}>
                          {roomName}
                        </span>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isAvailable ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}`} />
                      </div>
                      <div className="text-[11px] font-semibold">
                        {isAvailable ? (
                          <span className="text-emerald-600 dark:text-emerald-400">● Tersedia</span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400">● Terpakai</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-1.5 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50 text-[10px] text-slate-500 dark:text-slate-400">
                      {currentMeeting ? (
                        <div className="truncate" title={`s.d. ${currentMeeting.waktuSelesai} (${currentMeeting.instansi})`}>
                          <span className="text-rose-600 dark:text-rose-400 font-medium">s.d. {currentMeeting.waktuSelesai}</span>
                          <span className="text-slate-600 dark:text-slate-300 ml-1">({currentMeeting.instansi || 'Internal'})</span>
                        </div>
                      ) : nextMeeting ? (
                        <div className="truncate" title={`Jadwal: ${nextMeeting.waktuMulai} (${nextMeeting.instansi})`}>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Jadwal: {nextMeeting.waktuMulai}</span>
                          <span className="text-slate-600 dark:text-slate-300 ml-1">({nextMeeting.instansi || 'Internal'})</span>
                        </div>
                      ) : (
                        <div className="font-medium">Sepanjang hari</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Meeting Schedule Table Card (Bottom Half) */}
          <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 overflow-hidden">
            <div className="pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Jadwal Meeting Hari Ini
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Daftar agenda pemakaian ruang rapat ({todayMeeting.length} jadwal)
                </p>
              </div>
            </div>

            {isLoadingMeeting ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">Memuat jadwal...</div>
            ) : todayMeeting.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">Tidak ada jadwal meeting hari ini.</div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-3">Waktu</th>
                      <th className="py-2 px-3">Ruangan</th>
                      <th className="py-2 px-3">Instansi</th>
                      <th className="py-2 px-3">Peserta</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {todayMeeting.map((m) => {
                      const isPast = m.waktuSelesai && m.waktuSelesai < nowTimeStr;
                      const isOngoing = m.waktuMulai <= nowTimeStr && m.waktuSelesai >= nowTimeStr;
                      const totalPeserta = calculateTotalPeserta(m.pesertaInternal, m.pesertaEksternal);

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-2 px-3 font-mono font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {m.waktuMulai} - {m.waktuSelesai}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-100">
                            {m.ruangan}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-300 max-w-[140px] truncate">
                            {m.instansi || '-'}
                          </td>
                          <td className="py-2 px-3">
                            <button
                              onClick={() => showPesertaDetails(m)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                            >
                              {totalPeserta} org
                            </button>
                          </td>
                          <td className="py-2 px-3">
                            {isOngoing ? (
                              <Tag color="error" className="m-0 font-semibold">Sedang Berlangsung</Tag>
                            ) : isPast ? (
                              <Tag color="default" className="m-0">Selesai</Tag>
                            ) : (
                              <Tag color="processing" className="m-0">Terjadwal</Tag>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Right Column (5 cols): Queue Composition & PEPK Agenda */}
        <div className="lg:col-span-5 flex flex-col gap-3.5 min-h-0">
          
          {/* Status Distribution Bar Chart Card (Top Half) */}
          <div className="shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Komposisi Status Pelayanan
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
              Proporsi antrean berdasarkan status saat ini
            </p>

            {totalAntrean === 0 ? (
              <div className="py-3 text-center text-xs text-slate-400">Belum ada data pelayanan hari ini</div>
            ) : (
              <div className="space-y-3">
                {/* Multi-segment Horizontal Bar */}
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden">
                  {antrePct > 0 && <div className="bg-amber-500 h-full" style={{ width: `${antrePct}%` }} title={`Antre: ${antreCount} (${antrePct}%)`} />}
                  {prosesPct > 0 && <div className="bg-blue-500 h-full" style={{ width: `${prosesPct}%` }} title={`Diproses: ${prosesCount} (${prosesPct}%)`} />}
                  {selesaiPct > 0 && <div className="bg-emerald-500 h-full" style={{ width: `${selesaiPct}%` }} title={`Selesai: ${selesaiCount} (${selesaiPct}%)`} />}
                  {batalPct > 0 && <div className="bg-rose-500 h-full" style={{ width: `${batalPct}%` }} title={`Batal: ${batalCount} (${batalPct}%)`} />}
                </div>

                {/* Legend List */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">Antre</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{antreCount} ({antrePct}%)</span>
                  </div>

                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">Diproses</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{prosesCount} ({prosesPct}%)</span>
                  </div>

                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">Selesai</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{selesaiCount} ({selesaiPct}%)</span>
                  </div>

                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">Batal</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{batalCount} ({batalPct}%)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PEPK Agenda Card (Bottom Half) */}
          <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 overflow-hidden">
            <div className="pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Agenda PEPK & LMST Hari Ini
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Kegiatan Edukasi & Perlindungan Konsumen ({todayJadwalPepk.length} agenda)
              </p>
            </div>

            {isLoadingJadwalPepk ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">Memuat agenda...</div>
            ) : todayJadwalPepk.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                Tidak ada agenda PEPK / LMST untuk hari ini.
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5">
                {todayJadwalPepk.map((j, i) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#DA251C]/10 text-[#DA251C] dark:bg-red-900/30 dark:text-red-300 uppercase">
                        {j.tipeJadwal || 'PEPK / LMST'}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">
                        {j.jamMulai || '08:00'} - {j.jamSelesai || 'Selesai'}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">
                      {j.namaKegiatan || 'Agenda Edukasi'}
                    </h4>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <span>● Lokasi: {j.lokasi || 'OJK'}</span>
                      {j.dihadiriOleh && <span>● Dihadiri: {j.dihadiriOleh}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </main>
  );
}

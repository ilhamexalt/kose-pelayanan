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
  "Pulau Sangiang",
  "Pulau Tunda",
  "Baduy",
  "Ujung Kulon"
];

export default function OperasionalDashboardPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();
  const router = useRouter();
  const { user, isLoading: isAuthLoading, refreshSession } = useAuth();

  const [pelayananList, setPelayananList] = useState<Pelayanan[]>([]);
  const [meetingList, setMeetingList] = useState<Meeting[]>([]);
  const [jadwalPepkList, setJadwalPepkList] = useState<any[]>([]);
  const [jadwalPimpinanList, setJadwalPimpinanList] = useState<any[]>([]);

  const [isLoadingPelayanan, setIsLoadingPelayanan] = useState(true);
  const [isLoadingMeeting, setIsLoadingMeeting] = useState(true);
  const [isLoadingJadwalPepk, setIsLoadingJadwalPepk] = useState(true);
  const [isLoadingJadwalPimpinan, setIsLoadingJadwalPimpinan] = useState(true);

  const [currentTime, setCurrentTime] = useState(dayjs());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pepkSlideIndex, setPepkSlideIndex] = useState(0);
  const [pimpinanSlideIndex, setPimpinanSlideIndex] = useState(0);
  const [isTomorrowMode, setIsTomorrowMode] = useState(false);
  const [showCountdownModal, setShowCountdownModal] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(5);
  const [hasTriggered1600, setHasTriggered1600] = useState(false);

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
      requestFS.call(docEl).catch(() => { });
    }

    const handleFirstTouch = () => {
      if (!document.fullscreenElement && requestFS) {
        requestFS.call(docEl).catch(() => { });
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

    const unsubscribeJadwalPimpinan = onSnapshot(collection(db, 'jadwal_pimpinan'), () => {
      fetchJadwalPimpinan();
    }, (error) => {
      console.error("Realtime fetch jadwal pimpinan error:", error);
      fetchJadwalPimpinan();
    });

    return () => {
      unsubscribePelayanan();
      unsubscribeMeeting();
      unsubscribeJadwalPepk();
      unsubscribeJadwalPimpinan();
    };
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    const now = dayjs();
    if (now.hour() >= 16 && !hasTriggered1600 && !isTomorrowMode && !showCountdownModal) {
      setHasTriggered1600(true);
      setShowCountdownModal(true);
      setCountdownSeconds(5);
    }
    if (now.hour() < 16 && hasTriggered1600) {
      setHasTriggered1600(false);
      setIsTomorrowMode(false);
    }
  }, [currentTime, hasTriggered1600, isTomorrowMode, showCountdownModal]);

  useEffect(() => {
    if (!showCountdownModal) return;
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowCountdownModal(false);
          setIsTomorrowMode(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showCountdownModal]);

  useEffect(() => {
    const todayStr = dayjs().format('YYYY-MM-DD');
    const targetDateStr = isTomorrowMode
      ? dayjs().add(1, 'day').format('YYYY-MM-DD')
      : todayStr;
    const targetPepkList = jadwalPepkList.filter(j => {
      const d1 = j.tanggalMulai ? dayjs(j.tanggalMulai) : (j.tanggal ? dayjs(j.tanggal) : null);
      const d2 = j.tanggalSelesai ? dayjs(j.tanggalSelesai) : (j.tanggal ? dayjs(j.tanggal) : null);
      if (!d1) return false;
      const d2Safe = d2 || d1;
      const target = dayjs(targetDateStr);
      return (target.isSame(d1, 'day') || target.isAfter(d1, 'day')) &&
        (target.isSame(d2Safe, 'day') || target.isBefore(d2Safe, 'day'));
    });

    if (targetPepkList.length <= 1) return;
    const timer = setInterval(() => {
      setPepkSlideIndex((prev) => (prev + 1) % targetPepkList.length);
    }, 5000); // 5 detik per slide
    return () => clearInterval(timer);
  }, [jadwalPepkList, isTomorrowMode]);

  useEffect(() => {
    const todayStr = dayjs().format('YYYY-MM-DD');
    const targetDateStr = isTomorrowMode
      ? dayjs().add(1, 'day').format('YYYY-MM-DD')
      : todayStr;
    const targetPimpinanList = jadwalPimpinanList.filter(j => {
      const d1 = j.tanggalMulai ? dayjs(j.tanggalMulai) : (j.tanggal ? dayjs(j.tanggal) : null);
      const d2 = j.tanggalSelesai ? dayjs(j.tanggalSelesai) : (j.tanggal ? dayjs(j.tanggal) : null);
      if (!d1) return false;
      const d2Safe = d2 || d1;
      const target = dayjs(targetDateStr);
      return (target.isSame(d1, 'day') || target.isAfter(d1, 'day')) &&
        (target.isSame(d2Safe, 'day') || target.isBefore(d2Safe, 'day'));
    });

    if (targetPimpinanList.length <= 1) return;
    const timer = setInterval(() => {
      setPimpinanSlideIndex((prev) => (prev + 1) % targetPimpinanList.length);
    }, 5000); // 5 detik per slide
    return () => clearInterval(timer);
  }, [jadwalPimpinanList, isTomorrowMode]);

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

  const fetchJadwalPimpinan = async () => {
    try {
      const res = await fetch('/api/pimpinan');
      const json = await res.json();
      if (json.success) {
        setJadwalPimpinanList(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch jadwal pimpinan", error);
    } finally {
      setIsLoadingJadwalPimpinan(false);
    }
  };

  // Soft-refresh sesi & data setiap 50 menit tanpa reload agar TETAP FULLSCREEN dan tidak kena session
  useEffect(() => {
    const refreshTimer = setInterval(() => {
      if (refreshSession) {
        refreshSession();
      }
      fetchPelayanan();
      fetchMeeting();
      fetchJadwalPepk();
      fetchJadwalPimpinan();
    }, 50 * 60 * 1000); // 50 menit
    return () => clearInterval(refreshTimer);
  }, [refreshSession]);

  const isInitialDataLoading = isAuthLoading || isLoadingPelayanan || isLoadingMeeting || isLoadingJadwalPepk || isLoadingJadwalPimpinan;

  if (!user || isInitialDataLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0b0f19] p-4 text-center select-none">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-xl flex flex-col items-center gap-4 animate-scaleUp">
          <div className="w-16 h-16 rounded-2xl bg-[#DA251C]/10 dark:bg-[#DA251C]/20 flex items-center justify-center border border-[#DA251C]/20 shadow-inner">
            <svg className="animate-spin h-8 w-8 text-[#DA251C]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mb-1">
              Memuat Dasbor Operasional
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Menyiapkan data antrean, ruangan meeting & agenda PEPK...
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#DA251C] h-full w-1/2 animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  const todayStr = dayjs().format('YYYY-MM-DD');
  const targetDateStr = isTomorrowMode
    ? dayjs().add(1, 'day').format('YYYY-MM-DD')
    : todayStr;
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

  // Meeting untuk Tabel Jadwal (Hari Ini / Besok)
  const targetMeeting = meetingList
    .filter(m => m.tanggal === targetDateStr)
    .sort((a, b) => a.waktuMulai.localeCompare(b.waktuMulai));

  // Meeting hari ini (untuk status ruangan realtime)
  const todayMeeting = meetingList
    .filter(m => m.tanggal === todayStr)
    .sort((a, b) => a.waktuMulai.localeCompare(b.waktuMulai));

  const availableRoomsCount = ALL_ROOMS.filter(r => {
    return !todayMeeting.some(m => m.ruangan === r && nowTimeStr >= m.waktuMulai && nowTimeStr < m.waktuSelesai);
  }).length;

  const getAvailableTimeSlots = (roomMeetings: Meeting[]) => {
    if (!roomMeetings || roomMeetings.length === 0) return "Sepanjang hari";

    const blockedHours = new Set<number>();
    for (const m of roomMeetings) {
      const startH = parseInt((m.waktuMulai || '').split(':')[0], 10);
      const endH = parseInt((m.waktuSelesai || '').split(':')[0], 10);
      if (!isNaN(startH) && !isNaN(endH)) {
        for (let h = startH; h <= endH; h++) {
          blockedHours.add(h);
        }
      }
    }

    const effectiveNowH = dayjs().minute() > 0 ? dayjs().hour() + 1 : dayjs().hour();
    const freeHours: number[] = [];
    for (let h = 8; h <= 17; h++) {
      if (h >= effectiveNowH && !blockedHours.has(h)) {
        freeHours.push(h);
      }
    }

    if (freeHours.length === 0) {
      const allFree: number[] = [];
      for (let h = 8; h <= 17; h++) {
        if (!blockedHours.has(h)) allFree.push(h);
      }
      if (allFree.length === 0) return "Penuh hari ini";
      return "Tidak ada jam tersisa";
    }

    const ranges: string[] = [];
    let startRange: number | null = null;
    let prev: number | null = null;

    for (let i = 0; i < freeHours.length; i++) {
      const h = freeHours[i];
      if (startRange === null) {
        startRange = h;
        prev = h;
      } else if (h === (prev as number) + 1) {
        prev = h;
      } else {
        ranges.push(
          startRange === prev
            ? `${String(startRange).padStart(2, '0')}:00`
            : `${String(startRange).padStart(2, '0')}:00 - ${String(prev).padStart(2, '0')}:00`
        );
        startRange = h;
        prev = h;
      }
    }

    if (startRange !== null && prev !== null) {
      ranges.push(
        startRange === prev
          ? `${String(startRange).padStart(2, '0')}:00`
          : `${String(startRange).padStart(2, '0')}:00 - ${String(prev).padStart(2, '0')}:00`
      );
    }

    return ranges.length > 0 ? ranges.join(", ") : "Penuh hari ini";
  };

  // Jadwal Pimpinan Hari Ini / Besok
  const todayJadwalPimpinan = jadwalPimpinanList
    .filter(j => {
      const d1 = j.tanggalMulai ? dayjs(j.tanggalMulai) : (j.tanggal ? dayjs(j.tanggal) : null);
      const d2 = j.tanggalSelesai ? dayjs(j.tanggalSelesai) : (j.tanggal ? dayjs(j.tanggal) : null);
      if (!d1) return false;
      const d2Safe = d2 || d1;
      const target = dayjs(targetDateStr);
      return (target.isSame(d1, 'day') || target.isAfter(d1, 'day')) &&
        (target.isSame(d2Safe, 'day') || target.isBefore(d2Safe, 'day'));
    })
    .sort((a, b) => (a.jamMulai || '').localeCompare(b.jamMulai || ''));

  const activePimpinanIndex = pimpinanSlideIndex >= todayJadwalPimpinan.length ? 0 : pimpinanSlideIndex;
  const activeJadwalPimpinan = todayJadwalPimpinan[activePimpinanIndex];

  // Jadwal PEPK Hari Ini / Besok
  const todayJadwalPepk = jadwalPepkList
    .filter(j => {
      const d1 = j.tanggalMulai ? dayjs(j.tanggalMulai) : (j.tanggal ? dayjs(j.tanggal) : null);
      const d2 = j.tanggalSelesai ? dayjs(j.tanggalSelesai) : (j.tanggal ? dayjs(j.tanggal) : null);
      if (!d1) return false;
      const d2Safe = d2 || d1;
      const target = dayjs(targetDateStr);
      return (target.isSame(d1, 'day') || target.isAfter(d1, 'day')) &&
        (target.isSame(d2Safe, 'day') || target.isBefore(d2Safe, 'day'));
    })
    .sort((a, b) => (a.jamMulai || '').localeCompare(b.jamMulai || ''));

  const activePepkIndex = pepkSlideIndex >= todayJadwalPepk.length ? 0 : pepkSlideIndex;
  const activeJadwalPepk = todayJadwalPepk[activePepkIndex];

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
    <main className="min-h-screen lg:h-screen w-full overflow-y-auto lg:overflow-hidden bg-slate-50 dark:bg-[#0b0f19] p-3 sm:p-4 md:p-5 flex flex-col gap-3.5 transition-colors select-none">
      {contextHolder}
      {modalContextHolder}

      {/* Header Bar - Compact & Full Width */}
      <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 py-3.5 sm:py-3 px-4 sm:px-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-[#DA251C] animate-pulse" />
            <span className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-[#DA251C] whitespace-nowrap">
              SIPANDU
            </span>
          </div>
          <span className="h-5 sm:h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block shrink-0" />
          <h1 className="text-base sm:text-lg md:text-xl font-extrabold text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0">
            Sistem Pelayanan dan Penjadwalan Terpadu - KOSE
          </h1>
          {/* <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hidden xl:block truncate min-w-0">
            — Monitoring realtime layanan antrean, ruangan meeting & agenda PEPK
          </span> */}
        </div>

        <div className="flex items-center flex-wrap gap-2.5 shrink-0 w-full sm:w-auto justify-end">
          <button
            onClick={() => {
              try {
                if (document.fullscreenElement && document.exitFullscreen) {
                  document.exitFullscreen().catch(() => { });
                }
              } catch (e) { }
              router.push('/dashboard');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Kembali ke Dashboard"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              } catch (e) { }
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer border whitespace-nowrap shrink-0 ${isFullscreen
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              }`}
            title="Aktifkan / Nonaktifkan TV Mode Fullscreen (F11)"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span className="hidden sm:inline">{isFullscreen ? "TV Mode Aktif" : "Layar Penuh"}</span>
          </button>

          <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl whitespace-nowrap shrink-0">
            <svg className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{currentTime.locale('id').format('DD MMMM YYYY')}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600 dark:text-slate-300 font-mono font-bold">{currentTime.format('HH:mm:ss')} WIB</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>Live Sync</span>
          </div>
        </div>
      </div>

      {/* KPI Summary Row - Compact & Full Width */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">

        {/* Total KPI */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Layanan</span>
            <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100">
              {isLoadingPelayanan ? '-' : totalAntrean}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Pengunjung hari ini</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-slate-600 dark:bg-slate-400 h-full w-full" />
          </div>
        </div>

        {/* Sedang Antre KPI */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">Antre</span>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-600 dark:text-amber-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100">{isLoadingPelayanan ? '-' : antreCount}</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">({antrePct}%)</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Menunggu</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${antrePct}%` }} />
          </div>
        </div>

        {/* Diproses KPI */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-500 uppercase tracking-wider">Diproses</span>
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600 dark:text-blue-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100">{isLoadingPelayanan ? '-' : prosesCount}</span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">({prosesPct}%)</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Dilayani</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${prosesPct}%` }} />
          </div>
        </div>

        {/* Selesai KPI */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">Selesai</span>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600 dark:text-emerald-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100">{isLoadingPelayanan ? '-' : selesaiCount}</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">({selesaiPct}%)</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Tuntas</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${selesaiPct}%` }} />
          </div>
        </div>

        {/* Batal KPI */}
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-500 uppercase tracking-wider">Batal</span>
            <div className="p-1.5 bg-rose-50 dark:bg-rose-950/40 rounded-lg text-rose-600 dark:text-rose-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100">{isLoadingPelayanan ? '-' : batalCount}</span>
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
      <div className="flex-1 lg:min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5">

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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-hidden">
              {ALL_ROOMS.map((roomName) => {
                const roomMeetingsToday = todayMeeting
                  .filter(m => m.ruangan === roomName)
                  .sort((a, b) => (a.waktuMulai || '').localeCompare(b.waktuMulai || ''));

                const currentMeeting = roomMeetingsToday.find(m => {
                  return nowTimeStr >= m.waktuMulai && nowTimeStr < m.waktuSelesai;
                });
                const nextMeeting = roomMeetingsToday
                  .filter(m => m.waktuMulai > nowTimeStr)
                  .sort((a, b) => a.waktuMulai.localeCompare(b.waktuMulai))[0];

                const isAvailable = !currentMeeting;
                const availableSlotsStr = getAvailableTimeSlots(roomMeetingsToday);

                return (
                  <div
                    key={roomName}
                    className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${isAvailable
                      ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40 text-slate-800 dark:text-slate-100"
                      : "bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/40 text-slate-800 dark:text-slate-100"
                      }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-xs font-bold truncate text-slate-800 dark:text-slate-100" title={roomName}>
                          {roomName}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${isAvailable ? "bg-emerald-500" : "bg-[#DA251C] animate-pulse"
                            }`}
                        />
                      </div>

                      <div className="text-[11px] font-semibold flex items-center gap-1">
                        {isAvailable ? (
                          roomMeetingsToday.length === 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400">● Tersedia</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">● Terjadwal</span>
                          )
                        ) : (
                          <span className="text-[#DA251C] dark:text-red-400">● Terpakai</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/50 text-[11px]">
                      {currentMeeting ? (
                        <div>
                          <div className="truncate text-[10px] text-[#DA251C] dark:text-red-400 font-medium mb-1" title={`s.d. ${currentMeeting.waktuSelesai} (${currentMeeting.instansi || 'Internal'})`}>
                            s.d. {currentMeeting.waktuSelesai} ({currentMeeting.instansi || 'Internal'})
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Available:</div>
                          <div className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] leading-tight break-words" title={availableSlotsStr}>
                            {availableSlotsStr}
                          </div>
                        </div>
                      ) : nextMeeting ? (
                        <div>
                          <div className="truncate text-[10px] text-blue-600 dark:text-blue-400 font-medium mb-1" title={`Jadwal: ${nextMeeting.waktuMulai}-${nextMeeting.waktuSelesai} (${nextMeeting.instansi || 'Internal'})`}>
                            {nextMeeting.waktuMulai}-{nextMeeting.waktuSelesai} ({nextMeeting.instansi || 'Internal'})
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Available:</div>
                          <div className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] leading-tight break-words" title={availableSlotsStr}>
                            {availableSlotsStr}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-slate-400 dark:text-slate-500 text-[10px] font-medium mb-0.5">
                            Available:
                          </div>
                          <div className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] leading-tight break-words" title={availableSlotsStr}>
                            {availableSlotsStr}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Meeting Schedule Table Card (Bottom Half) */}
          <div className="flex-1 min-h-[260px] lg:min-h-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 overflow-hidden">
            <div className="pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>Jadwal Meeting {isTomorrowMode ? "Besok" : "Hari Ini"}</span>
                  {isTomorrowMode && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                      {dayjs(targetDateStr).locale('id').format('DD MMM YYYY')}
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Daftar agenda pemakaian ruang rapat ({targetMeeting.length} jadwal untuk {isTomorrowMode ? "hari besok" : "hari ini"})
                </p>
              </div>
            </div>

            {isLoadingMeeting ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">Memuat jadwal...</div>
            ) : targetMeeting.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                Tidak ada jadwal meeting untuk {isTomorrowMode ? "hari besok" : "hari ini"}.
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto">
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
                    {targetMeeting.map((m) => {
                      const isPast = !isTomorrowMode && m.waktuSelesai && m.waktuSelesai < nowTimeStr;
                      const isOngoing = !isTomorrowMode && m.waktuMulai <= nowTimeStr && m.waktuSelesai >= nowTimeStr;
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
                            {isTomorrowMode ? (
                              <Tag color="blue" className="m-0 font-semibold">Jadwal Besok</Tag>
                            ) : isOngoing ? (
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

        {/* Right Column (5 cols): Pimpinan & PEPK Agenda */}
        <div className="lg:col-span-5 flex flex-col gap-3.5 min-h-0">

          {/* Pimpinan Agenda Card (Top Half - Auto Carousel) */}
          <div className="flex-1 min-h-[220px] lg:min-h-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 overflow-hidden">
            <div className="pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>Jadwal Pimpinan {isTomorrowMode ? "Besok" : "Hari Ini"}</span>
                  {isTomorrowMode && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                      {dayjs(targetDateStr).locale('id').format('DD MMM YYYY')}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  Kegiatan Pimpinan OJK Provinsi Banten ({todayJadwalPimpinan.length} agenda untuk {isTomorrowMode ? "besok" : "hari ini"})
                </p>
              </div>
              {todayJadwalPimpinan.length > 1 && (
                <div className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                  {activePimpinanIndex + 1} / {todayJadwalPimpinan.length}
                </div>
              )}
            </div>

            {isLoadingJadwalPimpinan ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">Memuat jadwal...</div>
            ) : todayJadwalPimpinan.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                Tidak ada jadwal pimpinan untuk {isTomorrowMode ? "hari besok" : "hari ini"}.
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
                <div>
                  {(() => {
                    const j = activeJadwalPimpinan;
                    if (!j) return null;
                    const names = Array.isArray(j.nama) ? j.nama.join(', ') : j.nama;
                    const currentTimeStr = dayjs().format('HH:mm');
                    const hasTime = j.jamMulai && j.jamSelesai;

                    const isPast = !isTomorrowMode && hasTime ? j.jamSelesai < currentTimeStr : false;
                    const isUpcoming = !isTomorrowMode && hasTime ? j.jamMulai > currentTimeStr : false;
                    const isOngoing = !isTomorrowMode && !isPast && !isUpcoming;

                    return (
                      <div
                        key={j.id || activePimpinanIndex}
                        className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex flex-col justify-start shadow-inner animate-smoothSlide transition-all duration-700"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          {isTomorrowMode ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 uppercase tracking-wide border border-blue-200 dark:border-blue-800/60">
                              JADWAL BESOK
                            </span>
                          ) : isOngoing ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 uppercase tracking-wide border border-emerald-200 dark:border-emerald-800/60 animate-pulse">
                              SEDANG BERLANGSUNG
                            </span>
                          ) : isPast ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 uppercase tracking-wide border border-slate-300 dark:border-slate-700">
                              SELESAI
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 uppercase tracking-wide border border-blue-200 dark:border-blue-800/60">
                              AKAN DATANG
                            </span>
                          )}
                          <span className="text-xs sm:text-sm font-mono font-extrabold text-slate-700 dark:text-slate-200">
                            {j.jamMulai || '-'} - {j.jamSelesai || '-'}
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100 mb-2 leading-snug capitalize">
                          {j.kegiatan || '-'}
                        </h4>
                        <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t border-slate-200/60 dark:border-slate-700/50">
                          <span>● Pimpinan: <strong className="text-slate-800 dark:text-slate-100 font-bold">{names || '-'}</strong></span>
                          <span>● Tempat: <strong className="text-slate-800 dark:text-slate-100 font-bold">{j.tempat || '-'}</strong></span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {todayJadwalPimpinan.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 pt-3">
                    {todayJadwalPimpinan.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setPimpinanSlideIndex(idx)}
                        className={`h-2 rounded-full transition-all duration-700 ease-out cursor-pointer ${idx === activePimpinanIndex
                          ? "w-7 bg-[#DA251C]"
                          : "w-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300"
                          }`}
                        title={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PEPK Agenda Card (Bottom Half - Auto Carousel) */}
          <div className="flex-1 min-h-[220px] lg:min-h-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 overflow-hidden">
            <div className="pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>Agenda PEPK & LMST {isTomorrowMode ? "Besok" : "Hari Ini"}</span>
                  {isTomorrowMode && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                      {dayjs(targetDateStr).locale('id').format('DD MMM YYYY')}
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kegiatan Edukasi & Perlindungan Konsumen ({todayJadwalPepk.length} agenda untuk {isTomorrowMode ? "besok" : "hari ini"})
                </p>
              </div>

              {todayJadwalPepk.length > 1 && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {activePepkIndex + 1} / {todayJadwalPepk.length}
                </span>
              )}
            </div>

            {isLoadingJadwalPepk ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">Memuat agenda...</div>
            ) : todayJadwalPepk.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                Tidak ada agenda PEPK / LMST untuk {isTomorrowMode ? "hari besok" : "hari ini"}.
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
                {/* Active Agenda Card (At the top, no white gap above) */}
                <div>
                  {(() => {
                    const j = activeJadwalPepk;
                    if (!j) return null;
                    const names = Array.isArray(j.nama) ? j.nama.join(', ') : j.nama;
                    const currentTimeStr = dayjs().format('HH:mm');
                    const hasTime = j.jamMulai && j.jamSelesai;

                    const isPast = !isTomorrowMode && hasTime ? j.jamSelesai < currentTimeStr : false;
                    const isUpcoming = !isTomorrowMode && hasTime ? j.jamMulai > currentTimeStr : false;
                    const isOngoing = !isTomorrowMode && !isPast && !isUpcoming;

                    return (
                      <div
                        key={j.id || activePepkIndex}
                        className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex flex-col justify-start shadow-inner animate-smoothSlide transition-all duration-700"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          {isTomorrowMode ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 uppercase tracking-wide border border-blue-200 dark:border-blue-800/60">
                              JADWAL BESOK
                            </span>
                          ) : isOngoing ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 uppercase tracking-wide border border-emerald-200 dark:border-emerald-800/60 animate-pulse">
                              SEDANG BERLANGSUNG
                            </span>
                          ) : isPast ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 uppercase tracking-wide border border-slate-300 dark:border-slate-700">
                              SELESAI
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 uppercase tracking-wide border border-blue-200 dark:border-blue-800/60">
                              AKAN DATANG
                            </span>
                          )}
                          <span className="text-xs sm:text-sm font-mono font-extrabold text-slate-700 dark:text-slate-200">
                            {j.jamMulai || '-'} - {j.jamSelesai || '-'}
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100 mb-2 leading-snug capitalize">
                          {j.kegiatan || '-'}
                        </h4>
                        <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t border-slate-200/60 dark:border-slate-700/50">
                          <span>● Pegawai: <strong className="text-slate-800 dark:text-slate-100 font-bold">{names || '-'}</strong></span>
                          <span>● Tempat: <strong className="text-slate-800 dark:text-slate-100 font-bold">{j.tempat || '-'}</strong></span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Dot Indicators Center Below Card */}
                {todayJadwalPepk.length > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-2 pb-1">
                    {todayJadwalPepk.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setPepkSlideIndex(idx)}
                        className={`h-2 rounded-full transition-all duration-700 ease-out cursor-pointer ${idx === activePepkIndex
                          ? 'w-7 bg-[#DA251C] shadow-sm'
                          : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                          }`}
                        title={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Modal Countdown 5 Detik Perpindahan Mode Besok (16:00 WIB) */}
      {showCountdownModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-4 animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2 border border-blue-100 dark:border-blue-900/50 shadow-inner">
              <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              Pembaruan Jadwal Otomatis
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Waktu menunjukkan pukul <strong className="text-slate-800 dark:text-slate-200">16.00 WIB</strong>. Sistem sedang memperbarui tampilan informasi <strong className="text-[#DA251C]">Jadwal Meeting & Agenda PEPK</strong> untuk <strong className="text-blue-600 dark:text-blue-400">Hari Besok</strong>.
            </p>
            <div className="py-2">
              <div className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Mohon menunggu...</span>
                <span className="w-7 h-7 rounded-full bg-[#DA251C] text-white font-extrabold text-sm flex items-center justify-center shadow">
                  {countdownSeconds}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

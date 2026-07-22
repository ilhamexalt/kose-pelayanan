"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { message, Modal, Switch } from "antd";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import dayjs from "dayjs";
import 'dayjs/locale/id';

interface Pelayanan {
  id: string;
  status: string;
  createdAt: number;
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

export default function DashboardPage() {
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

  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(true);

  const isAdminOrPramusaji = user && (
    String(user.nip).toLowerCase() === 'admin' ||
    String(user.role).toLowerCase() === 'admin' ||
    String(user.role).toLowerCase() === 'pramusaji'
  );

  useEffect(() => {
    if (isAuthLoading || !user) return;
    if (user.update_password === false) {
      router.push('/update-password');
      return;
    }

    fetchMeeting();
    fetchJadwalPepk();

      const unsubscribe = onSnapshot(collection(db, 'pelayanan'), () => {
        fetchPelayanan();
      }, (error) => {
        console.error("Realtime fetch error:", error);
        fetchPelayanan();
      });

      const unsubscribeMaintenance = onSnapshot(doc(db, 'settings', 'general'), (snapshot) => {
        if (snapshot.exists()) {
          setIsMaintenance(snapshot.data().maintenanceMode === true);
        }
        setIsMaintenanceLoading(false);
      });

      return () => {
        unsubscribe();
        unsubscribeMaintenance();
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

  const handleToggleMaintenance = async (checked: boolean) => {
    try {
      await setDoc(doc(db, 'settings', 'general'), { maintenanceMode: checked }, { merge: true });
      messageApi.success(`Maintenance mode berhasil di${checked ? 'aktifkan' : 'matikan'}`);
    } catch (error) {
      console.error("Failed to toggle maintenance mode:", error);
      messageApi.error("Gagal mengubah status maintenance");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090d16]">
        <svg className="animate-spin h-8 w-8 text-[#DA251C]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  const todayStr = dayjs().format('YYYY-MM-DD');

  // Hitung Data Antrean Hari Ini
  const todayPelayanan = pelayananList.filter(p => {
    const pDate = dayjs(p.createdAt).format('YYYY-MM-DD');
    return pDate === todayStr;
  });

  const antreCount = todayPelayanan.filter(p => p.status === 'Antre' || !p.status).length;
  const prosesCount = todayPelayanan.filter(p => p.status === 'Diproses').length;
  const selesaiCount = todayPelayanan.filter(p => p.status === 'Selesai').length;
  const totalAntrean = todayPelayanan.length;

  // Hitung Data Meeting Hari Ini
  const todayMeeting = meetingList
    .filter(m => m.tanggal === todayStr)
    .filter(m => !(m.waktuSelesai && m.waktuSelesai < dayjs().format('HH:mm')))
    .sort((a, b) => a.waktuMulai.localeCompare(b.waktuMulai));

  // Hitung Data Jadwal PEPK & LMST Hari Ini
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
      mask: { closable: true },
      okText: 'Tutup',
      okButtonProps: { className: 'bg-[#DA251C] hover:bg-red-700 border-none' }
    });
  };

  return (
    <>
      {contextHolder}
      {modalContextHolder}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-[70vh] space-y-8 font-sans">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
              Dashboard Summary
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ringkasan antrean dan jadwal ruangan untuk hari ini: {dayjs().locale('id').format('dddd, DD MMMM YYYY')}
            </p>
          </div>
          
          {isAdminOrPramusaji && !isMaintenanceLoading && (
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800/50 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm w-fit">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Maintenance Mode</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{isMaintenance ? 'Aktif (Halaman publik dikunci)' : 'Nonaktif (Normal)'}</span>
              </div>
              <Switch 
                checked={isMaintenance} 
                onChange={handleToggleMaintenance} 
                className={isMaintenance ? 'bg-[#DA251C]' : 'bg-slate-300 dark:bg-slate-600'}
              />
            </div>
          )}
        </div>

        {/* Blok 1: Antrean */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-[#DA251C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Total Antrean Hari Ini</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Total Card */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-transform hover:-translate-y-1 group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg className="w-16 h-16 text-slate-800 dark:text-slate-100" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
              </div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total Layanan</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-bold text-slate-800 dark:text-slate-100">{isLoadingPelayanan ? '-' : totalAntrean}</h3>
                <span className="text-sm font-medium text-slate-500">orang</span>
              </div>
            </div>

            {/* Antre Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-slate-900 rounded-2xl p-6 border border-amber-200/60 dark:border-amber-900/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-transform hover:-translate-y-1 group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                <svg className="w-16 h-16 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-500 uppercase tracking-wider mb-2">Sedang Antre</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-bold text-amber-600 dark:text-amber-400">{isLoadingPelayanan ? '-' : antreCount}</h3>
                <span className="text-sm font-medium text-amber-700/60 dark:text-amber-500/60">menunggu</span>
              </div>
            </div>

            {/* Proses Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-slate-900 rounded-2xl p-6 border border-blue-200/60 dark:border-blue-900/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-transform hover:-translate-y-1 group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </div>
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-500 uppercase tracking-wider mb-2">Diproses</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-bold text-blue-600 dark:text-blue-400">{isLoadingPelayanan ? '-' : prosesCount}</h3>
                <span className="text-sm font-medium text-blue-700/60 dark:text-blue-500/60">sedang dilayani</span>
              </div>
            </div>

            {/* Selesai Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-slate-900 rounded-2xl p-6 border border-emerald-200/60 dark:border-emerald-900/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-transform hover:-translate-y-1 group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                <svg className="w-16 h-16 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-500 uppercase tracking-wider mb-2">Selesai</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{isLoadingPelayanan ? '-' : selesaiCount}</h3>
                <span className="text-sm font-medium text-emerald-700/60 dark:text-emerald-500/60">tuntas</span>
              </div>
            </div>

          </div>
        </section>

        {/* Blok 2: Jadwal Ruang Meeting */}
        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-[#DA251C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Jadwal Ruang Meeting Hari Ini</h2>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-visible">
            {isLoadingMeeting ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                <svg className="animate-spin h-8 w-8 text-[#DA251C] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>Memuat jadwal ruangan...</p>
              </div>
            ) : todayMeeting.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-center">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="text-lg font-medium text-slate-600 dark:text-slate-300">Tidak ada jadwal meeting hari ini</p>
                <p className="text-sm mt-1">Ruangan sedang kosong, Anda bisa menjadwalkan meeting baru.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-b border-slate-100 dark:border-slate-800/50">
                {todayMeeting.map((meeting, index) => {
                  const totalPeserta = calculateTotalPeserta(meeting.pesertaInternal, meeting.pesertaEksternal);
                  const isPast = meeting.waktuSelesai && meeting.waktuSelesai < dayjs().format('HH:mm');
                  const isOngoing = meeting.waktuMulai <= dayjs().format('HH:mm') && meeting.waktuSelesai >= dayjs().format('HH:mm');

                  return (
                    <div
                      key={meeting.id}
                      className={`p-6 border-slate-100 dark:border-slate-800/50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50
                        ${index % 3 !== 2 ? 'lg:border-r' : ''} 
                        ${index % 2 !== 1 ? 'md:border-r lg:border-r-0' : ''}
                        border-b
                      `}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 rounded-xl text-[#DA251C] dark:text-rose-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">{meeting.ruangan}</h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Instansi: <span className="font-semibold text-slate-700 dark:text-slate-300">{meeting.instansi || '-'}</span></p>
                          </div>
                        </div>
                        {isOngoing ? (
                          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wide border border-emerald-200 dark:border-emerald-800/50 shadow-sm animate-pulse whitespace-nowrap flex-shrink-0 text-center">
                            Sedang Berlangsung
                          </span>
                        ) : isPast ? (
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold rounded-full uppercase tracking-wide border border-slate-200 dark:border-slate-700 shadow-sm whitespace-nowrap flex-shrink-0 text-center">
                            Selesai
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-bold rounded-full uppercase tracking-wide border border-blue-200 dark:border-blue-800/50 shadow-sm whitespace-nowrap flex-shrink-0 text-center">
                            Akan Datang
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <svg className="w-5 h-5 text-[#DA251C]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>{meeting.waktuMulai} - {meeting.waktuSelesai}</span>
                      </div>

                      <div className="flex items-start gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex-shrink-0 mt-0.5">
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <div className="flex-1 relative">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Total <span className="font-bold text-[#DA251C] dark:text-red-400">{totalPeserta}</span> Peserta
                          </p>
                          <p onClick={() => showPesertaDetails(meeting)} className="text-xs text-slate-500 mt-1 cursor-pointer underline decoration-dashed decoration-slate-300 underline-offset-2 w-max hover:text-slate-800 transition-colors">
                            Lihat Rincian
                          </p>
                        </div>
                      </div>

                      {/* Tombol Detail Konsumsi untuk Pramusaji / Admin */}
                      {isAdminOrPramusaji && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                          <button
                            onClick={() => setSelectedMeeting(meeting)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#DA251C] bg-rose-50 hover:bg-rose-100 dark:text-rose-400 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 rounded-lg transition-colors border border-rose-100 dark:border-rose-900/50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            Detail Konsumsi & Catatan
                          </button>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Blok 3: Jadwal PEPK & LMST */}
        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-[#DA251C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Jadwal PEPK & LMST Hari Ini</h2>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-visible">
            {isLoadingJadwalPepk ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                <svg className="animate-spin h-8 w-8 text-[#DA251C] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>Memuat jadwal PEPK & LMST...</p>
              </div>
            ) : todayJadwalPepk.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400 text-center">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="text-lg font-medium text-slate-600 dark:text-slate-300">Tidak ada jadwal PEPK & LMST hari ini</p>
                <p className="text-sm mt-1">Jadwal saat ini kosong.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-b border-slate-100 dark:border-slate-800/50">
                {todayJadwalPepk.map((jadwal, index) => {
                  const names = Array.isArray(jadwal.nama) ? jadwal.nama.join(', ') : jadwal.nama;
                  const currentTime = dayjs().format('HH:mm');
                  const hasTime = jadwal.jamMulai && jadwal.jamSelesai;
                  
                  const isPast = hasTime ? jadwal.jamSelesai < currentTime : false;
                  const isUpcoming = hasTime ? jadwal.jamMulai > currentTime : false;
                  const isOngoing = !isPast && !isUpcoming;

                  return (
                    <div
                      key={jadwal.id}
                      className={`p-6 border-slate-100 dark:border-slate-800/50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50
                        ${index % 3 !== 2 ? 'lg:border-r' : ''} 
                        ${index % 2 !== 1 ? 'md:border-r lg:border-r-0' : ''}
                        border-b
                      `}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-blue-600 dark:text-blue-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight line-clamp-1">{jadwal.kegiatan}</h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Pegawai: <span className="font-semibold text-slate-700 dark:text-slate-300">{names || '-'}</span></p>
                          </div>
                        </div>
                        {isOngoing ? (
                          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wide border border-emerald-200 dark:border-emerald-800/50 shadow-sm animate-pulse whitespace-nowrap flex-shrink-0 text-center">
                            Sedang Berlangsung
                          </span>
                        ) : isPast ? (
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold rounded-full uppercase tracking-wide border border-slate-200 dark:border-slate-700 shadow-sm whitespace-nowrap flex-shrink-0 text-center">
                            Selesai
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-bold rounded-full uppercase tracking-wide border border-blue-200 dark:border-blue-800/50 shadow-sm whitespace-nowrap flex-shrink-0 text-center">
                            Akan Datang
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50">
                          <svg className="w-5 h-5 text-blue-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span>{jadwal.jamMulai || '-'} - {jadwal.jamSelesai || '-'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          <span className="line-clamp-1 max-w-[100px]">{jadwal.tempat || '-'}</span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

      </main>

      {/* Modal Detail Meeting */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <svg className="w-5 h-5 text-[#DA251C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            Detail Kebutuhan Meeting
          </div>
        }
        open={!!selectedMeeting}
        onCancel={() => setSelectedMeeting(null)}
        footer={
          <button
            onClick={() => setSelectedMeeting(null)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
          >
            Tutup
          </button>
        }
        centered
        width={500}
      >
        {selectedMeeting && (
          <div className="mt-4 space-y-4 font-sans text-slate-700 dark:text-slate-300">

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">{selectedMeeting.ruangan}</h4>
              <p className="text-sm"><span className="font-semibold">Instansi:</span> {selectedMeeting.instansi || '-'}</p>
              <p className="text-sm"><span className="font-semibold">Waktu:</span> {selectedMeeting.waktuMulai} - {selectedMeeting.waktuSelesai}</p>
              <p className="text-sm"><span className="font-semibold">Total Peserta:</span> {calculateTotalPeserta(selectedMeeting.pesertaInternal, selectedMeeting.pesertaEksternal)} orang</p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 border-b pb-1 dark:border-slate-700">Keterangan / Kebutuhan Konsumsi</h4>
              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
                {selectedMeeting.keterangan ? (
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {selectedMeeting.keterangan}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 italic">Tidak ada catatan atau keterangan konsumsi.</p>
                )}
              </div>
            </div>

          </div>
        )}
      </Modal>

    </>
  );
}

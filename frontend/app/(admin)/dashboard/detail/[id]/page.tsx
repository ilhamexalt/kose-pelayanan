"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { message } from "antd";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import ThemeToggle from "@/components/ThemeToggle";

export default function DetailPelayananPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();

  const [user, setUser] = useState<any>(null);
  const [pelayananList, setPelayananList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [inputRegister, setInputRegister] = useState<string>('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(storedUser));

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
        setIsLoading(false);
      }
    };

    const unsubscribe = onSnapshot(collection(db, 'pelayanan'), () => {
      fetchPelayanan();
    }, (err) => {
      console.error("Realtime error:", err);
      fetchPelayanan();
    });

    return () => unsubscribe();
  }, [router]);

  const selectedPelayanan = pelayananList.find(p => p.id === id);

  useEffect(() => {
    if (selectedPelayanan && selectedPelayanan.nomorRegister !== undefined) {
      setInputRegister(selectedPelayanan.nomorRegister);
    }
  }, [selectedPelayanan?.nomorRegister]);

  const isMyProcessing = (p: any) => {
    if (!p || !p.processedBy || !user) return false;
    const pNip = String(p.processedBy.nip || '');
    const pNama = String(p.processedBy.nama || '');
    
    if (user.nip && pNip === String(user.nip)) return true;
    if (user.email && pNip === String(user.email)) return true;
    if (user.nama && pNama === String(user.nama)) return true;
    
    return false;
  };

  const activeProcessingItem = pelayananList.find(p => p.status === 'Diproses' && isMyProcessing(p));
  const hasActiveProcessing = !!activeProcessingItem;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Diproses': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800';
      case 'Selesai': return 'bg-green-100 text-green-800 border-green-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800';
      case 'Batal': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
    }
  };

  const formatDateTime = (val: any) => {
    if (!val) return '-';
    let d: Date;
    if (val.toDate && typeof val.toDate === 'function') {
      d = val.toDate();
    } else if (val.seconds !== undefined) {
      d = new Date(val.seconds * 1000);
    } else {
      d = new Date(val);
    }
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('id-ID').replace(/\./g, ':');
  };

  const handleUpdateStatus = async (statusId: string, newStatus: string, isSaveRegister: boolean = false) => {
    setIsUpdatingStatus(true);
    
    const bodyPayload: any = { status: newStatus };
    if (newStatus !== 'Antre' && user) {
      bodyPayload.processedBy = { 
        nip: user.nip || user.email || 'unknown', 
        nama: user.nama || user.email || 'Unknown User' 
      };
    }
    
    if (inputRegister !== undefined && inputRegister !== '' && (newStatus === 'Diproses' || newStatus === 'Selesai')) {
      bodyPayload.nomorRegister = inputRegister;
    }

    try {
      const res = await fetch(`/api/pelayanan/${statusId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      const json = await res.json();
      if (json.success) {
        if (isSaveRegister) {
          messageApi.success('Nomor register berhasil disimpan');
        } else {
          messageApi.success(`Status antrean diperbarui menjadi ${newStatus}`);
        }
      } else {
        messageApi.error(json.error || 'Gagal update status');
      }
    } catch (err) {
      messageApi.error('Terjadi kesalahan koneksi');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    messageApi.success(`${label} berhasil disalin!`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6">
        {contextHolder}
        <svg className="animate-spin h-10 w-10 text-[#DA251C]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-slate-600 dark:text-slate-300 font-medium">Memuat detail pelayanan...</p>
      </div>
    );
  }

  if (!selectedPelayanan) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6">
        {contextHolder}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-8 max-w-md w-full text-center shadow-xl border border-slate-100 dark:border-slate-800">
          <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Data Tidak Ditemukan</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Antrean pelayanan yang Anda cari tidak tersedia atau telah dihapus.</p>
          <button
            onClick={() => window.close()}
            className="w-full py-2.5 bg-[#DA251C] hover:bg-red-700 text-white rounded-xl font-medium transition-all cursor-pointer"
          >
            Tutup Tab
          </button>
        </div>
      </div>
    );
  }

  const isCurrentActive = activeProcessingItem && activeProcessingItem.id === selectedPelayanan.id;
  const isStatusLockedByOther = selectedPelayanan.status === 'Diproses' && 
    selectedPelayanan.processedBy && 
    !isMyProcessing(selectedPelayanan);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-300">
      {contextHolder}

      {/* Header Bar */}
      <header className="bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-sm transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
              Detail Pelayanan
            </h1>
            <span className="text-sm font-black text-[#DA251C] dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-lg border border-red-100 dark:border-red-900/50">
              {selectedPelayanan.queueNumber}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => {
                if (window.opener) {
                  window.close();
                } else {
                  router.push('/dashboard');
                }
              }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              <span>Tutup Tab</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 sm:p-8 shadow-md border border-slate-100 dark:border-slate-800 space-y-6 transition-colors duration-300">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-100 dark:border-slate-800 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nomor Antrean</p>
              <p className="text-3xl font-black text-[#DA251C] dark:text-red-400">{selectedPelayanan.queueNumber}</p>
              <p className="text-xs text-slate-400 mt-1">
                Waktu Daftar: {formatDateTime(selectedPelayanan.createdAt)}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Status Saat Ini</p>
              <span className={`px-4 py-1.5 inline-flex text-sm font-semibold rounded-full border ${getStatusColor(selectedPelayanan.status || 'Antre')}`}>
                {selectedPelayanan.status || 'Antre'}
              </span>
              {selectedPelayanan.processedBy && selectedPelayanan.status !== 'Antre' && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">Diproses Oleh: {selectedPelayanan.processedBy.nama}</p>
              )}
            </div>
          </div>

          {/* Informasi Nasabah */}
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#DA251C]"></span>
              Informasi Pemohon
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">NIK</p>
                <div className="flex items-center gap-2 group">
                  <p className="font-medium text-slate-900 dark:text-slate-100 text-base">{selectedPelayanan.nik}</p>
                  {selectedPelayanan.nik && (
                    <button onClick={() => handleCopy(selectedPelayanan.nik, 'NIK')} className="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">No. HP / WhatsApp</p>
                <div className="flex items-center gap-2 group">
                  <p className="font-medium text-slate-900 dark:text-slate-100 text-base">{selectedPelayanan.phone || '-'}</p>
                  {selectedPelayanan.phone && (
                    <button onClick={() => handleCopy(selectedPelayanan.phone, 'Nomor HP')} className="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap</p>
                <div className="flex items-center gap-2 group">
                  <p className="font-medium text-slate-900 dark:text-slate-100 text-base">{selectedPelayanan.nama}</p>
                  {selectedPelayanan.nama && (
                    <button onClick={() => handleCopy(selectedPelayanan.nama, 'Nama')} className="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  )}
                </div>
              </div>
              {selectedPelayanan.alamat && (
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Alamat Lengkap</p>
                  <div className="flex items-center gap-2 group">
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-base whitespace-pre-wrap">{selectedPelayanan.alamat}</p>
                    <button onClick={() => handleCopy(selectedPelayanan.alamat, 'Alamat')} className="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  </div>
                </div>
              )}
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Jenis Pelayanan</p>
                <p className="font-medium text-slate-900 dark:text-slate-100 text-base capitalize">
                  {selectedPelayanan.jenis === 'umum' ? 'Kunjungan Umum / Kedinasan' : selectedPelayanan.jenis === 'slik' ? 'Layanan SLIK' : selectedPelayanan.jenis === 'pengaduan' ? 'Layanan Pengaduan' : selectedPelayanan.jenis}
                </p>
              </div>
            </div>
          </div>

          {/* Rincian Layanan Khusus */}
          {selectedPelayanan.jenis === 'slik' && (
            <div className="bg-amber-50/50 dark:bg-slate-800/60 p-5 rounded-xl border border-amber-200/60 dark:border-slate-700 space-y-4">
              <h3 className="text-xs font-bold text-[#DA251C] dark:text-red-400 uppercase tracking-wider">
                Detail Permohonan SLIK
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Jenis Debitur</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.jenisDebitur || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">NIK / NPWP Debitur</p>
                  <div className="flex items-center gap-2 group">
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.slikNikNpwp || '-'}</p>
                    {selectedPelayanan.slikNikNpwp && (
                      <button onClick={() => handleCopy(selectedPelayanan.slikNikNpwp, 'NIK/NPWP')} className="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>
                    )}
                  </div>
                </div>
                {selectedPelayanan.email && (
                  <div className="sm:col-span-2">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Email Aktif</p>
                    <div className="flex items-center gap-2 group">
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.email}</p>
                      <button onClick={() => handleCopy(selectedPelayanan.email, 'Email')} className="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedPelayanan.jenis === 'umum' && (
            <div className="bg-amber-50/50 dark:bg-slate-800/60 p-5 rounded-xl border border-amber-200/60 dark:border-slate-700 space-y-4">
              <h3 className="text-xs font-bold text-[#DA251C] dark:text-red-400 uppercase tracking-wider">
                Detail Registrasi Tamu (Kunjungan Umum/Kedinasan)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nama Instansi / Perusahaan</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.instansi || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Bertemu dengan Pegawai</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.bertemu || '-'}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Keperluan</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.keperluan || '-'}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Keterangan (Jumlah Orang)</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.keterangan || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {selectedPelayanan.jenis === 'pengaduan' && (
            <div className="bg-amber-50/50 dark:bg-slate-800/60 p-5 rounded-xl border border-amber-200/60 dark:border-slate-700 space-y-4">
              <h3 className="text-xs font-bold text-[#DA251C] dark:text-red-400 uppercase tracking-wider">
                Detail Pelayanan Pengaduan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">NIK Pengaduan</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.pengaduanNik || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Klasifikasi Layanan</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.klasifikasi || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Sektor</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.sektor || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Perusahaan yang Diadukan</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.perusahaan || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Jenis Produk</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.produk || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Jenis Permasalahan</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.permasalahan || '-'}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Ringkasan Pengaduan</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100 text-sm whitespace-pre-line bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 mt-1">{selectedPelayanan.ringkasan || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Section Tindakan & Ubah Status */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#DA251C]"></span>
              Tindakan & Ubah Status
            </h2>

            {selectedPelayanan.status === 'Diproses' && (
              <div className="mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                  Nomor Register
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputRegister}
                    onChange={(e) => setInputRegister(e.target.value)}
                    placeholder="Masukkan nomor register (opsional)..."
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#DA251C]"
                  />
                  <button
                    onClick={() => handleUpdateStatus(selectedPelayanan.id, 'Diproses', true)}
                    disabled={isUpdatingStatus}
                    className="bg-[#DA251C] hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            )}
            
            {isStatusLockedByOther && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 mb-4 font-medium">
                ⚠️ Antrean ini sedang diproses oleh pegawai lain ({selectedPelayanan.processedBy?.nama}).
              </div>
            )}
            {hasActiveProcessing && !isCurrentActive && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-600 dark:text-amber-400 mb-4 font-medium">
                ⚠️ Anda sedang memproses antrean lain ({activeProcessingItem.queueNumber}). Selesaikan terlebih dahulu sebelum memproses antrean ini.
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              {['Antre', 'Diproses', 'Selesai', 'Batal'].map(status => {
                const isThisStatusActive = selectedPelayanan.status === status || (!selectedPelayanan.status && status === 'Antre');
                const isCannotGoBackToAntre = status === 'Antre' && selectedPelayanan.status !== 'Antre' && !!selectedPelayanan.status;
                const isDisabled = isUpdatingStatus 
                  || isStatusLockedByOther 
                  || (hasActiveProcessing && !isCurrentActive)
                  || isCannotGoBackToAntre;

                return (
                  <button
                    key={status}
                    disabled={isDisabled}
                    onClick={() => handleUpdateStatus(selectedPelayanan.id, status)}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                      isThisStatusActive
                        ? 'bg-[#DA251C] text-white shadow-lg dark:bg-red-600 ring-2 ring-red-400 ring-offset-2 dark:ring-offset-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import { message } from "antd";
import { usePermissions } from "@/hooks/usePermissions";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

import CustomSelect from "@/components/CustomSelect";

export default function DashboardPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const { create, read, update, delete: del, isAdmin, isReady } = usePermissions('/antrean');
  const [pelayananList, setPelayananList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;


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

  const filteredAndSortedList = pelayananList
    .filter(p => p.status === 'Antre' || p.status === 'Diproses')
    .filter(p => {
      const matchesSearch = (p.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.nik || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesJenis = filterJenis ? p.jenis === filterJenis : true;
      return matchesSearch && matchesJenis;
    })
    .sort((a, b) => {
      const numA = parseInt((a.queueNumber || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt((b.queueNumber || '').replace(/\D/g, ''), 10) || 0;
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedList.length / itemsPerPage));
  const paginatedList = filteredAndSortedList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const isMyProcessing = (p: any) => {
    if (!p || !p.processedBy || !user) return false;
    const pNip = String(p.processedBy.nip || '');
    const pNama = String(p.processedBy.nama || '');

    if (user.nip && pNip === String(user.nip)) return true;
    if (user.email && pNip === String(user.email)) return true;
    if (user.nama && pNama === String(user.nama)) return true;

    // Fallback
    const fallbackId = String(user.nip || user.email || '');
    if (pNip === fallbackId) return true;

    return false;
  };

  const activeProcessingItem = pelayananList.find(p => p.status === 'Diproses' && isMyProcessing(p));
  const hasActiveProcessing = !!activeProcessingItem;

  useEffect(() => {
    // Basic auth check
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      const parsed = JSON.parse(storedUser);
      if (parsed.update_password === false) {
        router.push('/update-password');
        return;
      }
      setUser(parsed);

      const unsubscribe = onSnapshot(collection(db, 'pelayanan'), () => {
        // Fetch decrypted data from the secure server API instead of using raw encrypted client data
        fetchPelayanan();
      }, (error) => {
        console.error("Realtime fetch error:", error);
        fetchPelayanan();
      });

      return () => unsubscribe();
    }
  }, []);

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

  const handleUpdateStatus = async (statusId: string, newStatus: string, isSaveRegister: boolean = false) => {
    setIsUpdatingStatus(true);

    const bodyPayload: any = { status: newStatus };
    if (newStatus !== 'Antre' && user) {
      bodyPayload.processedBy = {
        nip: user.nip || user.email || 'unknown',
        nama: user.nama || user.email || 'Unknown User'
      };
    }

    if (selectedDetail?.nomorRegister !== undefined && (newStatus === 'Diproses' || newStatus === 'Selesai')) {
      bodyPayload.nomorRegister = selectedDetail.nomorRegister;
    }
    if (selectedDetail?.catatan !== undefined && (newStatus === 'Diproses' || newStatus === 'Selesai')) {
      bodyPayload.catatan = selectedDetail.catatan;
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
          messageApi.success('Data berhasil disimpan');
        } else {
          messageApi.success(`Status antrean diperbarui menjadi ${newStatus}`);
        }
        if (newStatus === 'Selesai' || newStatus === 'Batal') {
          setSelectedDetail(null);
        } else {
          setSelectedDetail((prev: any) => prev ? { ...prev, status: newStatus, processedBy: bodyPayload.processedBy || prev.processedBy } : null);
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



  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090d16]">
        <svg className="animate-spin h-8 w-8 text-[#DA251C]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    messageApi.success(`${label} berhasil disalin!`);
  };

  return (
    <>
      {contextHolder}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Daftar Antrean Pelayanan</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Kelola dan pantau data permintaan pelayanan nasabah.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchPelayanan}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-2 px-4 rounded-lg transition-all flex items-center shadow-sm text-sm cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh Data
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between transition-colors duration-300">
          <div className="flex w-full md:w-1/2 gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Cari nama atau NIK nasabah..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearchQuery(searchInput);
                    setCurrentPage(1);
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
            <button
              onClick={() => {
                setSearchQuery(searchInput);
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-[#DA251C] hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-sm shrink-0"
            >
              Cari
            </button>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm transition-colors cursor-pointer shrink-0"
                title="Reset Cari"
              >
                ✕
              </button>
            )}
          </div>
          <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">Jenis Pelayanan:</label>
            <div className="w-full sm:w-60">
              <CustomSelect
                value={filterJenis}
                onChange={(val) => {
                  setFilterJenis(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "", label: "Semua" },
                  { value: "slik", label: "SLIK" },
                  { value: "pengaduan", label: "Pengaduan" },
                  { value: "umum", label: "Kunjungan Umum/Kedinasan" },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors group"
                    onClick={() => {
                      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                      setCurrentPage(1);
                    }}
                  >
                    <div className="flex items-center">
                      No Antrean
                      <span className="ml-1 text-slate-400 group-hover:text-[#DA251C] transition-colors">
                        {sortOrder === 'asc' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        )}
                      </span>
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Waktu</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jenis</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Proses Oleh</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#0f172a] divide-y divide-slate-200 dark:divide-slate-800">
                {paginatedList.length > 0 ? (
                  paginatedList.map((item) => {
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-[#DA251C] dark:text-red-400">{item.queueNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                          {formatDateTime(item.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 font-medium">{item.nama}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 capitalize">{item.jenis === 'umum' ? 'Kunjungan Umum/Kedinasan' : item.jenis === 'slik' ? 'SLIK' : item.jenis === 'pengaduan' ? 'Pengaduan' : item.jenis}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 capitalize">
                          {item.processedBy ? item.processedBy.nama : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            {(isAdmin || update) && (
                              <button
                                onClick={() => {
                                  if (hasActiveProcessing && activeProcessingItem?.id !== item.id) {
                                    messageApi.warning(`Anda sedang memproses antrean ${activeProcessingItem?.queueNumber}. Selesaikan terlebih dahulu sebelum membuka antrean lain.`);
                                    return;
                                  }
                                  setSelectedDetail(item);
                                }}
                                className={`px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-bold rounded-full border transition-all cursor-pointer shadow-sm hover:shadow active:scale-95 ${getStatusColor(item.status || 'Antre')} hover:opacity-80`}
                                title="Proses / Panggil"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                Panggil
                              </button>
                            )}
                            {(!isAdmin && !update) && (
                              <button
                                onClick={() => setSelectedDetail(item)}
                                className={`px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-bold rounded-full border transition-all cursor-pointer shadow-sm hover:shadow active:scale-95 ${getStatusColor(item.status || 'Antre')} hover:opacity-80`}
                                title="Lihat Detail"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                Detail
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <p className="text-base font-medium text-slate-600 dark:text-slate-300">Belum ada antrean pelayanan</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Data nasabah yang masuk akan muncul di sini.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredAndSortedList.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/40 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors duration-300">
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Menampilkan <span className="font-semibold text-slate-800 dark:text-slate-200">{(currentPage - 1) * itemsPerPage + 1}</span> hingga <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(currentPage * itemsPerPage, filteredAndSortedList.length)}</span> dari <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredAndSortedList.length}</span> data
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Sebelumnya
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center transition-colors cursor-pointer ${currentPage === page
                      ? 'bg-[#DA251C] text-white shadow-sm'
                      : 'border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Detail & Ubah Status */}
      {selectedDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
          onClick={() => setSelectedDetail(null)}
        >
          <div 
            className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 border border-slate-100 dark:border-slate-800 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Detail Pelayanan</h2>
                <span className="text-sm font-black text-[#DA251C] dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-lg border border-red-100 dark:border-red-900/50">
                  {selectedDetail.queueNumber}
                </span>
              </div>
              <button onClick={() => setSelectedDetail(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nomor Antrean</p>
                  <p className="text-2xl font-black text-[#DA251C] dark:text-red-400">{selectedDetail.queueNumber}</p>
                  <p className="text-xs text-slate-400 mt-1">Waktu Daftar: {formatDateTime(selectedDetail.createdAt)}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Status Saat Ini</p>
                  <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full border ${getStatusColor(selectedDetail.status || 'Antre')}`}>
                    {selectedDetail.status || 'Antre'}
                  </span>
                  {selectedDetail.processedBy && selectedDetail.status !== 'Antre' && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Diproses Oleh: <span className="font-bold capitalize">{selectedDetail.processedBy.nama}</span></p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-3">Informasi Pemohon</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">NIK</p>
                    <div className="flex items-center gap-2 group">
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedDetail.nik}</p>
                      {selectedDetail.nik && (
                        <button onClick={() => handleCopy(selectedDetail.nik, 'NIK')} className="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">No. HP / WhatsApp</p>
                    <div className="flex items-center gap-2 group">
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedDetail.phone || '-'}</p>
                      {selectedDetail.phone && (
                        <button onClick={() => handleCopy(selectedDetail.phone, 'Nomor HP')} className="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap</p>
                    <div className="flex items-center gap-2 group">
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedDetail.nama}</p>
                      {selectedDetail.nama && (
                        <button onClick={() => handleCopy(selectedDetail.nama, 'Nama')} className="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                  {selectedDetail.alamat && (
                    <div className="md:col-span-2">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Alamat Lengkap</p>
                      <div className="flex items-center gap-2 group">
                        <p className="font-medium text-slate-900 dark:text-slate-100 text-sm whitespace-pre-wrap">{selectedDetail.alamat}</p>
                        <button onClick={() => handleCopy(selectedDetail.alamat, 'Alamat')} className="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Jenis Pelayanan</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm capitalize">
                      {selectedDetail.jenis === 'umum' ? 'Kunjungan Umum / Kedinasan' : selectedDetail.jenis === 'slik' ? 'Layanan SLIK' : selectedDetail.jenis === 'pengaduan' ? 'Layanan Pengaduan' : selectedDetail.jenis}
                    </p>
                  </div>
                </div>
              </div>

              {selectedDetail.jenis === 'slik' && (
                <div className="bg-amber-50/50 dark:bg-slate-800/60 p-4 rounded-xl border border-amber-200/60 dark:border-slate-700 space-y-3">
                  <h3 className="text-[11px] font-bold text-[#DA251C] dark:text-red-400 uppercase tracking-wider">Detail Permohonan SLIK</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Jenis Debitur</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedDetail.jenisDebitur || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-[#DA251C] dark:text-red-400 uppercase tracking-wider mb-1">NIK / NPWP Debitur</p>
                      <div className="flex items-center gap-2 group">
                        <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedDetail.slikNikNpwp || '-'}</p>
                        {selectedDetail.slikNikNpwp && (
                          <button onClick={() => handleCopy(selectedDetail.slikNikNpwp, 'NIK/NPWP')} className="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                        )}
                      </div>
                    </div>
                    {selectedDetail.email && (
                      <div className="md:col-span-2">
                        <p className="text-[11px] font-semibold text-[#DA251C] dark:text-red-400 uppercase tracking-wider mb-1">Email Aktif</p>
                        <div className="flex items-center gap-2 group">
                          <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedDetail.email}</p>
                          <button onClick={() => handleCopy(selectedDetail.email, 'Email')} className="text-slate-400 hover:text-blue-500 transition-colors cursor-pointer">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedDetail.jenis === 'umum' && (
                <div className="bg-amber-50/50 dark:bg-slate-800/60 p-4 rounded-xl border border-amber-200/60 dark:border-slate-700 space-y-3">
                  <h3 className="text-[11px] font-bold text-[#DA251C] dark:text-red-400 uppercase tracking-wider">Detail Kunjungan Umum/Kedinasan</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nama Instansi</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedDetail.instansi || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Bertemu dengan</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedDetail.bertemu || '-'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Keperluan</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedDetail.keperluan || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedDetail.jenis === 'pengaduan' && (
                <div className="bg-amber-50/50 dark:bg-slate-800/60 p-4 rounded-xl border border-amber-200/60 dark:border-slate-700 space-y-3">
                  <h3 className="text-[11px] font-bold text-[#DA251C] dark:text-red-400 uppercase tracking-wider">Detail Pelayanan Pengaduan</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Klasifikasi Layanan</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedDetail.klasifikasi || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Sektor</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedDetail.sektor || '-'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Ringkasan Pengaduan</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedDetail.ringkasan || '-'}</p>
                    </div>
                  </div>
                </div>
              )}


              {selectedDetail.status === 'Diproses' && (isAdmin || update) && (
                <div className="mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                      Nomor Register {selectedDetail.jenis?.toLowerCase() === 'slik' && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={selectedDetail.nomorRegister || ''}
                      onChange={(e) => setSelectedDetail({ ...selectedDetail, nomorRegister: e.target.value })}
                      placeholder="Masukkan nomor register"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#DA251C] mb-4"
                    />

                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                      Catatan Pelayanan
                    </label>
                    <div className="flex flex-col gap-2">
                      <textarea
                        rows={3}
                        placeholder="Tambahkan catatan jika ada..."
                        value={selectedDetail.catatan || ''}
                        onChange={(e) => setSelectedDetail({...selectedDetail, catatan: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#DA251C]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Aksi hanya jika punya update permission atau admin */}
              {(isAdmin || update) ? (
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button onClick={() => setSelectedDetail(null)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow cursor-pointer">
                    Batal
                  </button>
                  {selectedDetail.status === 'Antre' && (
                    <button
                      disabled={isUpdatingStatus}
                      onClick={() => handleUpdateStatus(selectedDetail.id, 'Diproses')}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
                    >
                      {isUpdatingStatus ? 'Memproses...' : 'Mulai Proses'}
                    </button>
                  )}
                  {selectedDetail.status === 'Diproses' && (
                    <>
                      <button
                        disabled={isUpdatingStatus}
                        onClick={() => handleUpdateStatus(selectedDetail.id, 'Diproses', true)}
                        className="px-5 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer border border-blue-200 dark:border-blue-800/50"
                      >
                        {isUpdatingStatus ? 'Menyimpan...' : 'Simpan Data'}
                      </button>
                      <button
                        disabled={isUpdatingStatus || (selectedDetail.jenis?.toLowerCase() === 'slik' && !selectedDetail.nomorRegister?.trim())}
                        onClick={() => handleUpdateStatus(selectedDetail.id, 'Selesai')}
                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
                      >
                        {isUpdatingStatus ? 'Memproses...' : 'Selesai'}
                      </button>
                    </>
                  )}
                  {(selectedDetail.status === 'Diproses' || selectedDetail.status === 'Antre') && (
                    <button
                      disabled={isUpdatingStatus}
                      onClick={() => handleUpdateStatus(selectedDetail.id, 'Batal')}
                      className="px-5 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      Batalkan
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button onClick={() => setSelectedDetail(null)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow cursor-pointer">
                    Tutup
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}

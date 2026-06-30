"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import { message } from "antd";
import ThemeToggle from "@/components/ThemeToggle";

export default function HistoryPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [pelayananList, setPelayananList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState('');

  const [selectedPelayanan, setSelectedPelayanan] = useState<any>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Diproses': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800';
      case 'Selesai': return 'bg-green-100 text-green-800 border-green-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800';
      case 'Batal': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
    }
  };

  const filteredAndSortedList = pelayananList
    .filter(p => p.status === 'Selesai' || p.status === 'Batal')
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

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      setUser(JSON.parse(storedUser));
      fetchPelayanan();
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

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleExportExcel = () => {
    if (filteredAndSortedList.length === 0) {
      messageApi.warning('Tidak ada data riwayat untuk di-export.');
      return;
    }

    const dataToExport = filteredAndSortedList.map((item, index) => ({
      'No': index + 1,
      'No Antrean': item.queueNumber,
      'Waktu': item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : '-',
      'Nama Nasabah': item.nama,
      'NIK': item.nik,
      'No HP': item.phone || '-',
      'Jenis Pelayanan': item.jenis === 'umum' ? 'Kunjungan Umum/Kedinasan' : item.jenis === 'slik' ? 'SLIK' : item.jenis === 'pengaduan' ? 'Pengaduan' : item.jenis,
      'Jenis Debitur (SLIK)': item.jenisDebitur || '-',
      'NIK/NPWP Debitur (SLIK)': item.slikNikNpwp || '-',
      'Email (SLIK)': item.email || '-',
      'NIK (Pengaduan)': item.pengaduanNik || '-',
      'Klasifikasi (Pengaduan)': item.klasifikasi || '-',
      'Sektor (Pengaduan)': item.sektor || '-',
      'Perusahaan Diadukan': item.perusahaan || '-',
      'Jenis Produk': item.produk || '-',
      'Permasalahan': item.permasalahan || '-',
      'Ringkasan Pengaduan': item.ringkasan || '-',
      'Instansi / Perusahaan': item.instansi || '-',
      'Keperluan': item.keperluan || '-',
      'Bertemu Dengan': item.bertemu || '-',
      'Keterangan (Jumlah Orang)': item.keterangan || '-',
      'Status': item.status,
      'Proses Oleh': item.processedBy ? item.processedBy.nama : '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Pelayanan");
    
    // Auto-size columns slightly
    const columnWidths = [
      { wch: 5 }, { wch: 15 }, { wch: 20 }, { wch: 25 }, 
      { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 25 }
    ];
    worksheet['!cols'] = columnWidths;

    XLSX.writeFile(workbook, `Laporan_Riwayat_Pelayanan_${new Date().toISOString().split('T')[0]}.xlsx`);
    messageApi.success('Laporan Excel berhasil diunduh!');
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] transition-colors duration-300">
      {contextHolder}
      <nav className="bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <img src="/assets/images/ojk-logo.png" alt="Logo OJK" className="h-9 w-auto mr-2 bg-white/90 p-0.5 rounded" />
              <div className="hidden md:flex items-center gap-6 ml-10">
                <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors py-5 px-1">Antrean Aktif</Link>
                <Link href="/history" className="text-sm font-semibold text-[#DA251C] border-b-2 border-[#DA251C] pb-5 pt-6 px-1">Riwayat Pelayanan</Link>
                {String(user?.nip || '').toLowerCase() === 'admin' && (
                  <Link href="/pegawai" className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors py-5 px-1">Data Pegawai</Link>
                )}
                <Link href="/antrean" target="_blank" className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm ml-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  Layar TV Antrean
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <ThemeToggle />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Halo, <span className="text-slate-900 dark:text-white">{user.nama || user.email || user.nip}</span></span>
              <button onClick={handleLogout} className="text-sm font-semibold text-[#DA251C] hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-1.5 rounded transition-colors cursor-pointer">
                Keluar
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Riwayat Pelayanan Selesai</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Lihat data antrean yang sudah selesai atau batal diproses.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchPelayanan}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-2 px-4 rounded-lg transition-all flex items-center shadow-sm text-sm cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh Data
            </button>
            
            <button 
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center shadow-sm text-sm cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export Excel
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between transition-colors duration-300">
          <div className="relative w-full sm:w-1/3">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" 
              placeholder="Cari nama atau NIK..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
          <div className="w-full sm:w-auto flex items-center gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-300 font-medium">Jenis Pelayanan:</label>
            <select 
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="">Semua</option>
              <option value="slik">SLIK</option>
              <option value="pengaduan">Pengaduan</option>
              <option value="umum">Kunjungan Umum/Kedinasan</option>
              <option value="lainnya">Lainnya</option>
            </select>
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
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
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
                {filteredAndSortedList.length > 0 ? (
                  filteredAndSortedList.map((item) => (
                    <tr 
                      key={item.id} 
                      onClick={() => setSelectedPelayanan(item)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-[#DA251C] dark:text-red-400">{item.queueNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 font-medium">{item.nama}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 capitalize">{item.jenis === 'umum' ? 'Kunjungan Umum/Kedinasan' : item.jenis === 'slik' ? 'SLIK' : item.jenis === 'pengaduan' ? 'Pengaduan' : item.jenis}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                        {item.processedBy ? item.processedBy.nama : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(item.status || 'Antre')}`}>
                          {item.status || 'Antre'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <p className="text-base font-medium text-slate-600 dark:text-slate-300">Tidak ada riwayat pelayanan</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Data pelayanan yang telah selesai atau batal akan tampil di sini.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {selectedPelayanan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 transition-colors duration-300">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Detail Riwayat</h2>
              <button onClick={() => setSelectedPelayanan(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">No Antrean</p>
                  <p className="text-2xl font-black text-[#DA251C] dark:text-red-400">{selectedPelayanan.queueNumber}</p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full border ${getStatusColor(selectedPelayanan.status || 'Antre')}`}>
                    {selectedPelayanan.status || 'Antre'}
                  </span>
                  {selectedPelayanan.processedBy && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Oleh: {selectedPelayanan.processedBy.nama}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">NIK</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{selectedPelayanan.nik}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">No. HP</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{selectedPelayanan.phone || '-'}</p>
                </div>
              </div>
              
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{selectedPelayanan.nama}</p>
              </div>
              
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Jenis Pelayanan</p>
                <p className="font-medium text-slate-900 dark:text-slate-100 capitalize">{selectedPelayanan.jenis === 'umum' ? 'Kunjungan Umum/Kedinasan' : selectedPelayanan.jenis === 'slik' ? 'SLIK' : selectedPelayanan.jenis === 'pengaduan' ? 'Pengaduan' : selectedPelayanan.jenis}</p>
              </div>

              {selectedPelayanan.jenis === 'slik' && (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3 mt-3">
                  <h3 className="text-xs font-bold text-[#DA251C] dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                    Pelayanan SLIK
                  </h3>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Jenis Debitur</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.jenisDebitur || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">NIK / NPWP Debitur</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.slikNikNpwp || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Email Aktif</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.email || '-'}</p>
                  </div>
                </div>
              )}

              {selectedPelayanan.jenis === 'pengaduan' && (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3 mt-3">
                  <h3 className="text-xs font-bold text-[#DA251C] dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                    Pelayanan Pengaduan
                  </h3>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">NIK Pengaduan</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.pengaduanNik || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Klasifikasi Layanan</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.klasifikasi || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sektor</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.sektor || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Perusahaan yang Diadukan</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.perusahaan || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Jenis Produk</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.produk || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Jenis Permasalahan</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.permasalahan || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ringkasan Pengaduan</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm whitespace-pre-line">{selectedPelayanan.ringkasan || '-'}</p>
                  </div>
                </div>
              )}

              {selectedPelayanan.jenis === 'umum' && (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3 mt-3">
                  <h3 className="text-xs font-bold text-[#DA251C] dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                    Registrasi Tamu (Kunjungan Umum/Kedinasan)
                  </h3>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Nama Instansi / Perusahaan</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.instansi || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Keperluan</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.keperluan || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Bertemu dengan Pegawai</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.bertemu || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Keterangan (Jumlah Orang)</p>
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{selectedPelayanan.keterangan || '-'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

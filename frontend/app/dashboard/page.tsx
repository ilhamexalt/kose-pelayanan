"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import { message } from "antd";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [pelayananList, setPelayananList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState('');

  const [selectedPelayanan, setSelectedPelayanan] = useState<any>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setIsUpdatingStatus(true);
    
    const bodyPayload: any = { status: newStatus };
    if (newStatus !== 'Antre' && user) {
      bodyPayload.processedBy = { 
        nip: user.nip || user.email || 'unknown', 
        nama: user.nama || user.email || 'Unknown User' 
      };
    }

    try {
      const res = await fetch(`/api/pelayanan/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      const json = await res.json();
      if (json.success) {
        setPelayananList(prev => prev.map(p => 
          p.id === id 
            ? { ...p, status: newStatus, processedBy: newStatus === 'Antre' ? null : bodyPayload.processedBy } 
            : p
        ));
        setSelectedPelayanan((prev: any) => ({ 
          ...prev, 
          status: newStatus, 
          processedBy: newStatus === 'Antre' ? null : bodyPayload.processedBy 
        }));
        message.success(`Status antrean diperbarui menjadi ${newStatus}`);
        if (newStatus === 'Selesai' || newStatus === 'Batal') {
          setSelectedPelayanan(null);
        }
      } else {
        message.error(json.error || 'Gagal update status');
      }
    } catch (err) {
      message.error('Terjadi kesalahan koneksi');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Diproses': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Selesai': return 'bg-green-100 text-green-800 border-green-200';
      case 'Batal': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
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
      setUser(JSON.parse(storedUser));
      
      const unsubscribe = onSnapshot(collection(db, 'pelayanan'), (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPelayananList(list);
        setSelectedPelayanan((prev: any) => {
          if (!prev) return null;
          const updated = list.find((item: any) => item.id === prev.id);
          return updated ? { ...prev, ...updated } : prev;
        });
        setIsLoading(false);
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

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <svg className="animate-spin h-8 w-8 text-[#DA251C]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <img src="/assets/images/ojk-logo.png" alt="Logo OJK" className="h-9 w-auto mr-2" />
              <div className="hidden md:flex items-center gap-6 ml-10">
                <Link href="/dashboard" className="text-sm font-semibold text-[#DA251C] border-b-2 border-[#DA251C] pb-5 pt-6 px-1">Antrean Aktif</Link>
                <Link href="/history" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors py-5 px-1">Riwayat Pelayanan</Link>
                {String(user?.nip || '').toLowerCase() === 'admin' && (
                  <Link href="/pegawai" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors py-5 px-1">Data Pegawai</Link>
                )}
                <Link href="/display" target="_blank" className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm ml-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  Layar TV Antrean
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-sm font-medium text-slate-600">Halo, <span className="text-slate-900">{user.nama || user.email || user.nip}</span></span>
              <button onClick={handleLogout} className="text-sm font-semibold text-[#DA251C] hover:bg-red-50 px-3 py-1.5 rounded transition-colors cursor-pointer">
                Keluar
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Daftar Antrean Pelayanan</h1>
            <p className="text-sm text-slate-500">Kelola dan pantau data permintaan pelayanan nasabah.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchPelayanan}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2 px-4 rounded-lg transition-all flex items-center shadow-sm text-sm cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh Data
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-1/3">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" 
              placeholder="Cari nama nasabah..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent text-sm"
            />
          </div>
          <div className="w-full sm:w-auto flex items-center gap-2">
            <label className="text-sm text-slate-600 font-medium">Jenis Pelayanan:</label>
            <select 
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent text-sm bg-white"
            >
              <option value="">Semua</option>
              <option value="slik">SLIK</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-200 transition-colors group"
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
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Waktu</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nama</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Jenis</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Proses Oleh</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredAndSortedList.length > 0 ? (
                  filteredAndSortedList.map((item) => {
                    const handleRowClick = () => {
                      if (hasActiveProcessing && activeProcessingItem.id !== item.id) {
                        message.warning(`Anda sedang memproses antrean ${activeProcessingItem.queueNumber}. Selesaikan terlebih dahulu sebelum membuka antrean lain.`);
                        return;
                      }
                      setSelectedPelayanan(item);
                    };

                    return (
                    <tr 
                      key={item.id} 
                      onClick={handleRowClick}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-[#DA251C]">{item.queueNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{item.nama}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 capitalize">{item.jenis}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {item.processedBy ? item.processedBy.nama : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(item.status || 'Antre')}`}>
                          {item.status || 'Antre'}
                        </span>
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <p className="text-base font-medium text-slate-600">Belum ada antrean pelayanan</p>
                        <p className="text-sm text-slate-400 mt-1">Data nasabah yang masuk akan muncul di sini.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {selectedPelayanan && (() => {
        const isCurrentActive = activeProcessingItem && activeProcessingItem.id === selectedPelayanan.id;
        
        const isStatusLockedByOther = selectedPelayanan.status === 'Diproses' && 
          selectedPelayanan.processedBy && 
          !isMyProcessing(selectedPelayanan);

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Detail Pelayanan</h2>
              <button onClick={() => setSelectedPelayanan(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">No Antrean</p>
                  <p className="text-2xl font-black text-[#DA251C]">{selectedPelayanan.queueNumber}</p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full border ${getStatusColor(selectedPelayanan.status || 'Antre')}`}>
                    {selectedPelayanan.status || 'Antre'}
                  </span>
                  {selectedPelayanan.processedBy && selectedPelayanan.status !== 'Antre' && (
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">Oleh: {selectedPelayanan.processedBy.nama}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">NIK</p>
                  <p className="font-medium text-slate-900">{selectedPelayanan.nik}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">No. HP</p>
                  <p className="font-medium text-slate-900">{selectedPelayanan.phone || '-'}</p>
                </div>
              </div>
              
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap</p>
                <p className="font-medium text-slate-900">{selectedPelayanan.nama}</p>
              </div>
              
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Jenis Pelayanan</p>
                <p className="font-medium text-slate-900 capitalize">{selectedPelayanan.jenis}</p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">Ubah Status</label>
                
                {isStatusLockedByOther && (
                  <p className="text-xs text-red-500 mb-2 font-medium">Antrean ini sedang diproses oleh {selectedPelayanan.processedBy?.nama}</p>
                )}
                {hasActiveProcessing && !isCurrentActive && (
                  <p className="text-xs text-amber-500 mb-2 font-medium">Selesaikan antrean aktif Anda sebelum memproses yang baru.</p>
                )}

                <div className="flex gap-2 flex-wrap">
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
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                          isThisStatusActive
                            ? 'bg-[#DA251C] text-white shadow-md'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

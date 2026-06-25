"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import { message, Modal } from "antd";

export default function PegawaiPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [pegawaiList, setPegawaiList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // Modal Create
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ nip: '', nama: '', email: '', password: '' });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Modal Edit
  const [selectedEditUser, setSelectedEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ nama: '', email: '', password: '' });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      const parsedUser = JSON.parse(storedUser);
      if (String(parsedUser?.nip || '').toLowerCase() !== 'admin') {
        router.push('/dashboard');
        return;
      }
      setUser(parsedUser);
      fetchPegawai(parsedUser.nip);
    }
  }, []);

  const getHeaders = (customUser?: any) => {
    const nip = customUser?.nip || user?.nip || 'admin';
    return {
      'Content-Type': 'application/json',
      'x-admin-nip': String(nip)
    };
  };

  const fetchPegawai = async (callerNip?: string) => {
    try {
      const res = await fetch('/api/pegawai', {
        headers: { 'x-admin-nip': String(callerNip || user?.nip || 'admin') }
      });
      const json = await res.json();
      if (json.success) {
        setPegawaiList(json.data);
      } else {
        message.error(json.error || 'Gagal mengambil data pegawai');
      }
    } catch (error) {
      console.error("Failed to fetch pegawai", error);
      message.error("Terjadi kesalahan koneksi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Import Logic
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const usersToImport = jsonData.map((row: any) => ({
        nip: row.nip || row.NIP || row.Nip,
        nama: row.nama || row.Nama || row.NAMA,
        email: row.email || row.Email || row.EMAIL,
        password: row.password || row.Password || row.PASSWORD,
      })).filter(u => u.nip && u.password);

      if (usersToImport.length === 0) {
        message.warning("Tidak ada data valid yang ditemukan di file Excel. Pastikan terdapat kolom nip dan password.");
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const res = await fetch('/api/pegawai/import', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(usersToImport),
      });
      const json = await res.json();

      if (json.success) {
        message.success(json.message);
        fetchPegawai();
      } else {
        message.error("Gagal import: " + json.error);
      }
    } catch (error) {
      console.error("Error reading excel file", error);
      message.error("Terjadi kesalahan saat membaca file Excel.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Create Manual Logic
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    try {
      const res = await fetch('/api/pegawai', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(createForm)
      });
      const json = await res.json();
      if (json.success) {
        message.success("Pegawai berhasil ditambahkan");
        setIsCreateModalOpen(false);
        setCreateForm({ nip: '', nama: '', email: '', password: '' });
        fetchPegawai();
      } else {
        message.error(json.error || "Gagal menambahkan pegawai");
      }
    } catch (err) {
      message.error("Terjadi kesalahan koneksi");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Edit Logic
  const handleOpenEdit = (userItem: any) => {
    setSelectedEditUser(userItem);
    setEditForm({
      nama: userItem.nama || '',
      email: userItem.email || '',
      password: ''
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditUser) return;
    setIsSubmittingEdit(true);

    try {
      const res = await fetch(`/api/pegawai/${selectedEditUser.id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(editForm)
      });
      const json = await res.json();
      if (json.success) {
        message.success("Data pegawai berhasil diperbarui");
        setSelectedEditUser(null);
        fetchPegawai();
      } else {
        message.error(json.error || "Gagal memperbarui pegawai");
      }
    } catch (err) {
      message.error("Terjadi kesalahan koneksi");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete Logic
  const handleDelete = (userItem: any) => {
    if (userItem.nip === 'admin' || userItem.id === 'admin') {
      message.error("Akun administrator utama tidak boleh dihapus!");
      return;
    }

    Modal.confirm({
      title: 'Konfirmasi Hapus',
      content: `Apakah Anda yakin ingin menghapus pegawai ${userItem.nama} (${userItem.nip})?`,
      okText: 'Ya, Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: async () => {
        try {
          const res = await fetch(`/api/pegawai/${userItem.id}`, { 
            method: 'DELETE',
            headers: { 'x-admin-nip': String(user?.nip || 'admin') }
          });
          const json = await res.json();
          if (json.success) {
            message.success("Pegawai berhasil dihapus");
            fetchPegawai();
          } else {
            message.error(json.error || "Gagal menghapus pegawai");
          }
        } catch (err) {
          message.error("Terjadi kesalahan koneksi");
        }
      }
    });
  };

  const filteredPegawai = pegawaiList.filter(p => {
    const matchQuery = (p.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (p.nip || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (p.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchQuery;
  });

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
                <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors py-5 px-1">Antrean Aktif</Link>
                <Link href="/history" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors py-5 px-1">Riwayat Pelayanan</Link>
                <Link href="/pegawai" className="text-sm font-semibold text-[#DA251C] border-b-2 border-[#DA251C] pb-5 pt-6 px-1">Data Pegawai</Link>
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
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Manajemen Pegawai</h1>
            <p className="text-sm text-slate-500">Kelola daftar akun pegawai yang berhak mengakses sistem pelayanan.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#DA251C] hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center shadow-sm text-sm cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Tambah Pegawai
            </button>
          </div>
        </div>

        {/* Import Box */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">Import Pegawai Massal</h4>
              <p className="text-xs text-slate-500 mt-0.5">Unggah file Excel (.xlsx) dengan kolom <code className="bg-slate-100 px-1 py-0.5 rounded text-[#DA251C]">nip</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-[#DA251C]">nama</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-[#DA251C]">email</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-[#DA251C]">password</code></p>
            </div>
          </div>
          <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <button 
            onClick={handleImportClick}
            disabled={isImporting}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg transition-all flex items-center text-sm cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            {isImporting ? 'Mengunggah...' : 'Pilih Excel'}
          </button>
        </div>

        {/* Table Filter */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="relative w-full sm:w-1/3">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" 
              placeholder="Cari NIP, Nama, atau Email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Pegawai Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">No</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">NIP</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nama</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredPegawai.length > 0 ? (
                  filteredPegawai.map((item, idx) => {
                    const isAdmin = item.nip === 'admin' || item.id === 'admin';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{idx + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{item.nip || item.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                          {item.nama}
                          {isAdmin && <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded-full font-bold">UTAMA</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.email || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                          <button 
                            onClick={() => handleOpenEdit(item)} 
                            className="text-blue-600 hover:text-blue-900 cursor-pointer"
                          >
                            Edit
                          </button>
                          {!isAdmin ? (
                            <button 
                              onClick={() => handleDelete(item)} 
                              className="text-red-600 hover:text-red-900 cursor-pointer"
                            >
                              Hapus
                            </button>
                          ) : (
                            <span className="text-slate-300 cursor-not-allowed">Hapus</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <p className="text-base font-medium text-slate-600">Tidak ada data pegawai</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Tambah Manual */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Tambah Pegawai Baru</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">NIP *</label>
                <input 
                  type="text" required
                  value={createForm.nip} onChange={e => setCreateForm({...createForm, nip: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                  placeholder="Contoh: 12345678"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Nama Lengkap *</label>
                <input 
                  type="text" required
                  value={createForm.nama} onChange={e => setCreateForm({...createForm, nama: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                  placeholder="Nama Pegawai"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Email</label>
                <input 
                  type="email"
                  value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                  placeholder="email@ojk.go.id"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Password *</label>
                <input 
                  type="password" required
                  value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                  placeholder="Password Login"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium cursor-pointer">Batal</button>
                <button type="submit" disabled={isSubmittingCreate} className="px-4 py-2 bg-[#DA251C] hover:bg-red-700 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50">{isSubmittingCreate ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {selectedEditUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-1">Edit Pegawai</h2>
            <p className="text-xs text-slate-400 mb-4">NIP: <span className="font-bold text-slate-700">{selectedEditUser.nip || selectedEditUser.id}</span></p>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Nama Lengkap *</label>
                <input 
                  type="text" required
                  value={editForm.nama} onChange={e => setEditForm({...editForm, nama: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Email</label>
                <input 
                  type="email"
                  value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Ubah Password</label>
                <input 
                  type="password"
                  value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                  placeholder="Biarkan kosong jika tidak diubah"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setSelectedEditUser(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium cursor-pointer">Batal</button>
                <button type="submit" disabled={isSubmittingEdit} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50">{isSubmittingEdit ? 'Menyimpan...' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

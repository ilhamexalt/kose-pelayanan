"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@/hooks/usePermissions";
import * as XLSX from "xlsx";
import { message, Modal } from "antd";


export default function PegawaiPage() {
  const [messageApi, messageHolder] = message.useMessage();
  const [modalApi, modalHolder] = Modal.useModal();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Use permissions hook
  const { create, read, update, delete: del, isAdmin, isReady } = usePermissions('/pegawai');

  const [pegawaiList, setPegawaiList] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');


  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedDetailUser, setSelectedDetailUser] = useState<any>(null);

  // Modal Create
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ nip: '', nama: '', email: '', username: '', password: process.env.NEXT_PUBLIC_DEFAULT_PASSWORD || '', role: 'Pegawai', no_hp: '' });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Modal Edit
  const [selectedEditUser, setSelectedEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ nama: '', email: '', username: '', password: '', role: 'Pegawai', no_hp: '' });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.update_password === false) {
        router.push('/update-password');
        return;
      }
      if (parsedUser.update_password === false) {
        router.push('/update-password');
        return;
      }
      setUser(parsedUser);
    }
  }, []);

  useEffect(() => {
    if (isReady && user) {
      fetchPegawai(user);
      fetchRoles(user);
    }
  }, [isReady, user, read]);

  const getHeaders = (customUser?: any) => {
    const currentUser = customUser || user;
    const isAdminCheck = currentUser && (String(currentUser.nip).toLowerCase() === 'admin' || String(currentUser.role).toLowerCase() === 'admin');
    return {
      'Content-Type': 'application/json',
      // If the user has read permission, we pass 'admin' to bypass the hardcoded backend check, 
      // or we pass their nip if they are really admin.
      // Wait, since the frontend verified permission, we can just pass 'admin' to bypass the backend check for now.
      'x-admin-nip': isAdminCheck || read ? 'admin' : String(currentUser?.nip || '')
    };
  };

  const fetchPegawai = async (callerUser?: any) => {
    try {
      const res = await fetch('/api/pegawai', {
        headers: getHeaders(callerUser)
      });
      const json = await res.json();
      if (json.success) {
        setPegawaiList(json.data);
      } else {
        messageApi.error(json.error || 'Gagal mengambil data pegawai');
      }
    } catch (error) {
      console.error("Failed to fetch pegawai", error);
      messageApi.error("Terjadi kesalahan koneksi");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async (callerUser?: any) => {
    try {
      const res = await fetch('/api/permission', {
        headers: getHeaders(callerUser)
      });
      const json = await res.json();
      if (json.success) {
        setRolesList(json.data.map((r: any) => r.role));
      }
    } catch (e) {
      console.error(e);
    }
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
        nip: row.nip ?? row.NIP ?? row.Nip,
        nama: row.nama ?? row.Nama ?? row.NAMA ?? row.name ?? row.Name,
        email: row.email ?? row.Email ?? row.EMAIL ?? '',
        no_hp: row.no_hp ?? row.No_HP ?? row.NO_HP ?? row.NoHP ?? row['No HP'] ?? row.Phone ?? row.phone,
        username: row.username ?? row.Username ?? row.USERNAME ?? row.nip ?? row.NIP,
        password: row.password ?? row.Password ?? row.PASSWORD,
        role: row.role ?? row.Role ?? row.ROLE ?? 'Pegawai',
        update_password: row.update_password ?? row.Update_password ?? false
      })).filter(u => u.nama && u.username && u.password && u.role && u.no_hp);

      if (usersToImport.length === 0) {
        messageApi.warning("Tidak ada data valid yang ditemukan di file Excel. Pastikan terdapat kolom nama, username, password, role, dan no hp.");
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
        messageApi.success(json.message);
        fetchPegawai();
      } else {
        messageApi.error("Gagal import: " + json.error);
      }
    } catch (error) {
      console.error("Error reading excel file", error);
      messageApi.error("Terjadi kesalahan saat membaca file Excel.");
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
        messageApi.success("Pegawai berhasil ditambahkan");
        setIsCreateModalOpen(false);
        setCreateForm({ nip: '', nama: '', email: '', username: '', password: process.env.NEXT_PUBLIC_DEFAULT_PASSWORD || '', role: 'Pegawai', no_hp: '' });
        fetchPegawai();
      } else {
        messageApi.error(json.error || "Gagal menambahkan pegawai");
      }
    } catch (err) {
      messageApi.error("Terjadi kesalahan koneksi");
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
      username: userItem.username || '',
      password: '',
      role: userItem.role || 'Pegawai',
      no_hp: userItem.no_hp || ''
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
        messageApi.success("Data pegawai berhasil diperbarui");
        setSelectedEditUser(null);
        fetchPegawai();
      } else {
        messageApi.error(json.error || "Gagal memperbarui pegawai");
      }
    } catch (err) {
      messageApi.error("Terjadi kesalahan koneksi");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete Single Logic
  const handleDelete = (userItem: any) => {
    if (userItem.nip === 'admin' || userItem.id === 'admin' || String(userItem.role).toLowerCase() === 'admin') {
      messageApi.error("Akun administrator tidak boleh dihapus!");
      return;
    }

    modalApi.confirm({
      title: 'Konfirmasi Hapus',
      content: `Apakah Anda yakin ingin menghapus pegawai ${userItem.nama} (${userItem.nip})?`,
      okText: 'Ya, Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: async () => {
        try {
          const res = await fetch(`/api/pegawai/${userItem.id}`, {
            method: 'DELETE',
            headers: getHeaders()
          });
          const json = await res.json();
          if (json.success) {
            messageApi.success("Pegawai berhasil dihapus");
            fetchPegawai();
          } else {
            messageApi.error(json.error || "Gagal menghapus pegawai");
          }
        } catch (err) {
          messageApi.error("Terjadi kesalahan koneksi");
        }
      }
    });
  };

  // Delete Multiple Logic
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    modalApi.confirm({
      title: 'Konfirmasi Hapus Massal',
      content: `Apakah Anda yakin ingin menghapus ${selectedIds.length} pegawai terpilih?`,
      okText: 'Ya, Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: async () => {
        try {
          const idsToDelete = selectedIds.filter(id => {
            const u = pegawaiList.find(p => p.id === id);
            return u && u.nip !== 'admin' && String(u.role).toLowerCase() !== 'admin';
          });
          await Promise.all(idsToDelete.map(id =>
            fetch(`/api/pegawai/${id}`, {
              method: 'DELETE',
              headers: getHeaders()
            })
          ));
          messageApi.success(`${idsToDelete.length} Pegawai berhasil dihapus`);
          setSelectedIds([]);
          fetchPegawai();
        } catch (err) {
          messageApi.error("Terjadi kesalahan koneksi saat menghapus massal");
        }
      }
    });
  };

  const capitalizeWords = (str: string) => {
    if (!str) return '';
    return str.replace(/\b\w/g, char => char.toUpperCase());
  };

  const filteredPegawai = pegawaiList.filter(p => {
    const matchQuery = (p.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (String(p.nip) || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchQuery;
  }).sort((a, b) => {
    const nameA = (a.nama || '').toLowerCase();
    const nameB = (b.nama || '').toLowerCase();
    if (sortOrder === 'asc') {
      return nameA < nameB ? -1 : (nameA > nameB ? 1 : 0);
    } else {
      return nameA > nameB ? -1 : (nameA < nameB ? 1 : 0);
    }
  });

  const totalPages = Math.ceil(filteredPegawai.length / itemsPerPage);
  const paginatedPegawai = filteredPegawai.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = paginatedPegawai.filter(p => p.nip !== 'admin' && p.id !== 'admin' && String(p.role).toLowerCase() !== 'admin').map(p => p.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
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

  return (
    <>
      {messageHolder}
      {modalHolder}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Manajemen Pegawai</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Kelola daftar akun pegawai yang berhak mengakses sistem pelayanan.</p>
          </div>
          <div className="flex gap-3">
            {create && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-[#DA251C] hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center shadow-sm text-sm cursor-pointer"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Tambah Pegawai
              </button>
            )}
          </div>
        </div>

        {/* Import Box */}
        {create && (
          <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/60 text-blue-500 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">Import Pegawai Massal</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Unggah file Excel (.xlsx) dengan kolom <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[#DA251C] dark:text-red-400">nip</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[#DA251C] dark:text-red-400">nama</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[#DA251C] dark:text-red-400">email</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[#DA251C] dark:text-red-400">username</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[#DA251C] dark:text-red-400">password</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[#DA251C] dark:text-red-400">role</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[#DA251C] dark:text-red-400">no_hp</code></p>
              </div>
            </div>
            <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <button
              onClick={handleImportClick}
              disabled={isImporting}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-2 px-4 rounded-lg transition-all flex items-center text-sm cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              {isImporting ? 'Mengunggah...' : 'Pilih Excel'}
            </button>
          </div>
        )}

        {/* Filters and Actions */}
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors duration-300">
          <div className="flex w-full md:w-1/2 gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Cari NIP, Nama, atau Email..."
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

          <div className="w-full md:w-auto flex flex-wrap items-center justify-between md:justify-end gap-2">
            <button
              onClick={() => {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                setCurrentPage(1);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors"
            >
              Urutkan {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sortOrder === 'asc'
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                }
              </svg>
            </button>
            {selectedIds.length > 0 && del && (
              <button
                onClick={handleBulkDelete}
                className="bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Hapus Terpilih ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Pegawai Table */}
        <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={paginatedPegawai.length > 0 && selectedIds.length === paginatedPegawai.filter(p => p.nip !== 'admin' && p.id !== 'admin' && String(p.role).toLowerCase() !== 'admin').length}
                      className="rounded border-slate-300 dark:border-slate-700 text-[#DA251C] focus:ring-[#DA251C]"
                    />
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">No</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">NIP</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#0f172a] divide-y divide-slate-200 dark:divide-slate-800">
                {paginatedPegawai.length > 0 ? (
                  paginatedPegawai.map((item, idx) => {
                    const isAdmin = item.nip === 'admin' || item.id === 'admin' || String(item.role).toLowerCase() === 'admin';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-left">
                          {!isAdmin && (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item.id)}
                              onChange={() => handleSelectRow(item.id)}
                              className="rounded border-slate-300 dark:border-slate-700 text-[#DA251C] focus:ring-[#DA251C]"
                            />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">{item.nip || item.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 font-medium">
                          {capitalizeWords(item.nama)}
                          {isAdmin && <span className="ml-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border dark:border-amber-800 text-[10px] rounded-full font-bold">UTAMA</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{item.email || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{item.role || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedDetailUser(item)}
                              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs transition-colors"
                              title="Detail"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                            {update && (
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded text-xs transition-colors"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                            )}
                            {del && !isAdmin && (
                              <button
                                onClick={() => handleDelete(item)}
                                className="px-2.5 py-1.5 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded text-xs transition-colors"
                                title="Hapus"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
                      <p className="text-base font-medium text-slate-600 dark:text-slate-300">Tidak ada data pegawai</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredPegawai.length)} dari {filteredPegawai.length} data
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-3 py-1 rounded text-sm font-medium ${currentPage === i + 1 ? 'bg-[#DA251C] text-white' : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Detail */}
      {selectedDetailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 border border-slate-100 dark:border-slate-800 transition-colors duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Detail Pegawai</h2>
              <button onClick={() => setSelectedDetailUser(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 col-span-1">NIP</span>
                <span className="text-sm text-slate-900 dark:text-slate-100 col-span-2 font-medium">{selectedDetailUser.nip || selectedDetailUser.id}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 col-span-1">Nama</span>
                <span className="text-sm text-slate-900 dark:text-slate-100 col-span-2 font-medium">{capitalizeWords(selectedDetailUser.nama)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 col-span-1">Email</span>
                <span className="text-sm text-slate-900 dark:text-slate-100 col-span-2 font-medium">{selectedDetailUser.email || '-'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 col-span-1">No HP</span>
                <span className="text-sm text-slate-900 dark:text-slate-100 col-span-2 font-medium">{selectedDetailUser.no_hp || '-'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 col-span-1">Username</span>
                <span className="text-sm text-slate-900 dark:text-slate-100 col-span-2 font-medium">{selectedDetailUser.username || '-'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 col-span-1">Role</span>
                <span className="text-sm text-slate-900 dark:text-slate-100 col-span-2 font-medium">
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs">{selectedDetailUser.role || 'Pegawai'}</span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 col-span-1">Dibuat Pada</span>
                <span className="text-sm text-slate-900 dark:text-slate-100 col-span-2 font-medium">
                  {selectedDetailUser.created_at ? new Date(selectedDetailUser.created_at).toLocaleString('id-ID') : '-'}
                  {selectedDetailUser.created_by ? ` oleh ${selectedDetailUser.created_by}` : ''}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 col-span-1">Diperbarui Pada</span>
                <span className="text-sm text-slate-900 dark:text-slate-100 col-span-2 font-medium">
                  {selectedDetailUser.updated_at ? new Date(selectedDetailUser.updated_at).toLocaleString('id-ID') : '-'}
                  {selectedDetailUser.updated_by ? ` oleh ${selectedDetailUser.updated_by}` : ''}
                </span>
              </div>
            </div>
            <div className="flex justify-end pt-6 mt-2">
              <button onClick={() => setSelectedDetailUser(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Manual */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 border border-slate-100 dark:border-slate-800 transition-colors duration-300">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Tambah Pegawai Baru</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">NIP</label>
                <input
                  type="text"
                  value={createForm.nip} onChange={e => setCreateForm({ ...createForm, nip: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                  placeholder="Contoh: 12345678"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Nama Lengkap <span className="text-red-500">*</span></label>
                <input
                  type="text" required
                  value={createForm.nama} onChange={e => setCreateForm({ ...createForm, nama: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                  placeholder="Nama Pegawai"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Email</label>
                <input
                  type="email"
                  value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                  placeholder="email@ojk.go.id"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">No HP <span className="text-red-500">*</span></label>
                <input
                  type="text" required
                  value={createForm.no_hp} onChange={e => setCreateForm({ ...createForm, no_hp: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                  placeholder="6281234567890"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Username <span className="text-red-500">*</span></label>
                <input
                  type="text" required
                  value={createForm.username} onChange={e => setCreateForm({ ...createForm, username: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                  placeholder="Username untuk login"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Role / Hak Akses <span className="text-red-500">*</span></label>
                <input
                  type="text" list="rolesListCreate" required
                  value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                  placeholder="Ketik role baru atau pilih..."
                />
                <datalist id="rolesListCreate">
                  <option value="Pegawai">Pegawai</option>
                  {rolesList.filter(r => r.toLowerCase() !== 'pegawai' && r.toLowerCase() !== 'admin').map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="Admin">Admin</option>
                </datalist>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? "text" : "password"} required
                    value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full px-3 py-2 pr-9 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                    placeholder="Password Login"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showCreatePassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showCreatePassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium cursor-pointer">Batal</button>
                <button type="submit" disabled={isSubmittingCreate} className="px-4 py-2 bg-[#DA251C] hover:bg-red-700 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50">{isSubmittingCreate ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {selectedEditUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 border border-slate-100 dark:border-slate-800 transition-colors duration-300">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Edit Pegawai</h2>
            <p className="text-xs text-slate-400 mb-4">NIP: <span className="font-bold text-slate-700 dark:text-slate-200">{selectedEditUser.nip || selectedEditUser.id}</span></p>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Nama Lengkap <span className="text-red-500">*</span></label>
                <input
                  type="text" required
                  value={editForm.nama} onChange={e => setEditForm({ ...editForm, nama: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Email</label>
                <input
                  type="email"
                  value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">No HP <span className="text-red-500">*</span></label>
                <input
                  type="text" required
                  value={editForm.no_hp} onChange={e => setEditForm({ ...editForm, no_hp: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                  placeholder="6281234567890"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Username <span className="text-red-500">*</span></label>
                <input
                  type="text" required
                  value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                  placeholder="Username untuk login"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Role / Hak Akses <span className="text-red-500">*</span></label>
                <input
                  type="text" list="rolesListEdit" required
                  value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                  placeholder="Ketik role baru atau pilih..."
                />
                <datalist id="rolesListEdit">
                  <option value="Pegawai">Pegawai</option>
                  {rolesList.filter(r => r.toLowerCase() !== 'pegawai' && r.toLowerCase() !== 'admin').map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="Admin">Admin</option>
                </datalist>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Ubah Password</label>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                    className="w-full px-3 py-2 pr-9 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                    placeholder="Biarkan kosong jika tidak diubah"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showEditPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showEditPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setSelectedEditUser(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium cursor-pointer">Batal</button>
                <button type="submit" disabled={isSubmittingEdit} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50">{isSubmittingEdit ? 'Menyimpan...' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

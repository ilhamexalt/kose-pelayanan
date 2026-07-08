"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { message, Modal } from "antd";


export default function MenuPage() {
  const [messageApi, messageHolder] = message.useMessage();
  const [modalApi, modalHolder] = Modal.useModal();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [menuList, setMenuList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');


  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal Create
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ nama: '', url: '', is_parent: false, parent_id: '' });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Modal Edit
  const [selectedEditMenu, setSelectedEditMenu] = useState<any>(null);
  const [editForm, setEditForm] = useState({ nama: '', url: '', is_parent: false, parent_id: '' });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

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
      if (String(parsedUser?.role || '').toLowerCase() !== 'admin' && String(parsedUser?.nip || '').toLowerCase() !== 'admin') {
        router.push('/dashboard');
        return;
      }
      setUser(parsedUser);
      fetchMenu(parsedUser);
    }
  }, []);

  const getHeaders = (customUser?: any) => {
    const currentUser = customUser || user;
    const isAdminCheck = currentUser && (String(currentUser.nip).toLowerCase() === 'admin' || String(currentUser.role).toLowerCase() === 'admin');
    return {
      'Content-Type': 'application/json',
      'x-admin-nip': isAdminCheck ? 'admin' : String(currentUser?.nip || '')
    };
  };

  const fetchMenu = async (callerUser?: any) => {
    try {
      const res = await fetch('/api/menu', {
        headers: getHeaders(callerUser)
      });
      const json = await res.json();
      if (json.success) {
        setMenuList(json.data);
      } else {
        messageApi.error(json.error || 'Gagal mengambil data menu');
      }
    } catch (error) {
      console.error("Failed to fetch menu", error);
      messageApi.error("Terjadi kesalahan koneksi");
    } finally {
      setIsLoading(false);
    }
  };



  // Create Logic
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(createForm)
      });
      const json = await res.json();
      if (json.success) {
        messageApi.success("Menu berhasil ditambahkan");
        setIsCreateModalOpen(false);
        setCreateForm({ nama: '', url: '', is_parent: false, parent_id: '' });
        fetchMenu();
      } else {
        messageApi.error(json.error || "Gagal menambahkan menu");
      }
    } catch (err) {
      messageApi.error("Terjadi kesalahan koneksi");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Edit Logic
  const handleOpenEdit = (menuItem: any) => {
    setSelectedEditMenu(menuItem);
    setEditForm({
      nama: menuItem.nama || '',
      url: menuItem.url || '',
      is_parent: !!menuItem.is_parent,
      parent_id: menuItem.parent_id || ''
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditMenu) return;
    setIsSubmittingEdit(true);

    try {
      const res = await fetch(`/api/menu/${selectedEditMenu.id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(editForm)
      });
      const json = await res.json();
      if (json.success) {
        messageApi.success("Data menu berhasil diperbarui");
        setSelectedEditMenu(null);
        fetchMenu();
      } else {
        messageApi.error(json.error || "Gagal memperbarui menu");
      }
    } catch (err) {
      messageApi.error("Terjadi kesalahan koneksi");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete Single Logic
  const handleDelete = (menuItem: any) => {
    modalApi.confirm({
      title: 'Konfirmasi Hapus',
      content: `Apakah Anda yakin ingin menghapus menu "${menuItem.nama}"?`,
      okText: 'Ya, Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: async () => {
        try {
          const res = await fetch(`/api/menu/${menuItem.id}`, {
            method: 'DELETE',
            headers: getHeaders()
          });
          const json = await res.json();
          if (json.success) {
            messageApi.success("Menu berhasil dihapus");
            fetchMenu();
          } else {
            messageApi.error(json.error || "Gagal menghapus menu");
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
      content: `Apakah Anda yakin ingin menghapus ${selectedIds.length} menu terpilih?`,
      okText: 'Ya, Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: async () => {
        try {
          await Promise.all(selectedIds.map(id =>
            fetch(`/api/menu/${id}`, {
              method: 'DELETE',
              headers: getHeaders()
            })
          ));
          messageApi.success(`${selectedIds.length} Menu berhasil dihapus`);
          setSelectedIds([]);
          fetchMenu();
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

  const filteredMenus = menuList.filter(m => {
    const matchQuery = (m.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.url || '').toLowerCase().includes(searchQuery.toLowerCase());
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

  const totalPages = Math.ceil(filteredMenus.length / itemsPerPage);
  const paginatedMenus = filteredMenus.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = paginatedMenus.map(m => m.id);
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
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Manajemen Menu</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Kelola daftar menu dan tautan aplikasi.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#DA251C] hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center shadow-sm text-sm cursor-pointer"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Tambah Menu
            </button>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors duration-300">
          <div className="flex w-full md:w-1/2 gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Cari Nama Menu atau URL..."
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
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Hapus ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Menu Table */}
        <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={paginatedMenus.length > 0 && selectedIds.length === paginatedMenus.length}
                      className="rounded border-slate-300 dark:border-slate-700 text-[#DA251C] focus:ring-[#DA251C]"
                    />
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">No</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama Menu</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">URL</th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tipe Menu</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#0f172a] divide-y divide-slate-200 dark:divide-slate-800">
                {paginatedMenus.length > 0 ? (
                  paginatedMenus.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-left">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => handleSelectRow(item.id)}
                          className="rounded border-slate-300 dark:border-slate-700 text-[#DA251C] focus:ring-[#DA251C]"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 dark:text-slate-100">{capitalizeWords(item.nama)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{item.url}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        {item.is_parent ? (
                          <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800 border">Parent</span>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 border">Menu / Child</span>
                            {item.parent_id && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                Parent: {menuList.find(m => m.id === item.parent_id)?.nama || 'Unknown'}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 cursor-pointer transition-colors"
                          title="Edit Menu"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 cursor-pointer transition-colors"
                          title="Hapus Menu"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <p className="text-base font-medium text-slate-600 dark:text-slate-300">Tidak ada data menu</p>
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
                Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredMenus.length)} dari {filteredMenus.length} data
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

      {/* Modal Tambah Manual */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 border border-slate-100 dark:border-slate-800 transition-colors duration-300">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Tambah Menu Baru</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Nama Menu *</label>
                <input
                  type="text" required
                  value={createForm.nama} onChange={e => setCreateForm({ ...createForm, nama: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                  placeholder="Contoh: Manajemen Menu"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">URL (Path) *</label>
                <input
                  type="text" required={!createForm.is_parent}
                  value={createForm.url} onChange={e => setCreateForm({ ...createForm, url: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-900/50"
                  placeholder="Contoh: /menu"
                  disabled={createForm.is_parent}
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="is_parent_create"
                  checked={createForm.is_parent}
                  onChange={e => {
                    const isChecked = e.target.checked;
                    setCreateForm({ ...createForm, is_parent: isChecked, url: isChecked ? '#' : createForm.url, parent_id: isChecked ? '' : createForm.parent_id });
                  }}
                  className="rounded border-slate-300 text-[#DA251C] focus:ring-[#DA251C]"
                />
                <label htmlFor="is_parent_create" className="text-sm font-medium text-slate-700 dark:text-slate-300">Jadikan sebagai Parent Menu (memiliki sub-menu)</label>
              </div>
              {!createForm.is_parent && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Pilih Parent Menu (Opsional)</label>
                  <select
                    value={createForm.parent_id}
                    onChange={e => setCreateForm({ ...createForm, parent_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                  >
                    <option value="">-- Tidak Ada Parent --</option>
                    {menuList.filter(m => m.is_parent).map(parent => (
                      <option key={parent.id} value={parent.id}>{parent.nama}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium cursor-pointer">Batal</button>
                <button type="submit" disabled={isSubmittingCreate} className="px-4 py-2 bg-[#DA251C] hover:bg-red-700 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50">{isSubmittingCreate ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {selectedEditMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 border border-slate-100 dark:border-slate-800 transition-colors duration-300">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Edit Menu</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Nama Menu *</label>
                <input
                  type="text" required
                  value={editForm.nama} onChange={e => setEditForm({ ...editForm, nama: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">URL (Path) *</label>
                <input
                  type="text" required={!editForm.is_parent}
                  value={editForm.url} onChange={e => setEditForm({ ...editForm, url: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-900/50"
                  disabled={editForm.is_parent}
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="is_parent_edit"
                  checked={editForm.is_parent}
                  onChange={e => {
                    const isChecked = e.target.checked;
                    setEditForm({ ...editForm, is_parent: isChecked, url: isChecked ? '#' : editForm.url, parent_id: isChecked ? '' : editForm.parent_id });
                  }}
                  className="rounded border-slate-300 text-[#DA251C] focus:ring-[#DA251C]"
                />
                <label htmlFor="is_parent_edit" className="text-sm font-medium text-slate-700 dark:text-slate-300">Jadikan sebagai Parent Menu (memiliki sub-menu)</label>
              </div>
              {!editForm.is_parent && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Pilih Parent Menu (Opsional)</label>
                  <select
                    value={editForm.parent_id}
                    onChange={e => setEditForm({ ...editForm, parent_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                  >
                    <option value="">-- Tidak Ada Parent --</option>
                    {menuList.filter(m => m.is_parent && m.id !== selectedEditMenu?.id).map(parent => (
                      <option key={parent.id} value={parent.id}>{parent.nama}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setSelectedEditMenu(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium cursor-pointer">Batal</button>
                <button type="submit" disabled={isSubmittingEdit} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50">{isSubmittingEdit ? 'Menyimpan...' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { message, Modal } from "antd";
import { usePermissions } from "@/hooks/usePermissions";

interface Menu {
  id: string;
  nama: string;
  url: string;
  is_parent: boolean;
  parent_id?: string | null;
}

interface RolePermission {
  id: string;
  role: string;
  menu_permissions: Record<string, {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  }>;
}

export default function PermissionPage() {
  const [messageApi, messageHolder] = message.useMessage();
  const [modalApi, modalHolder] = Modal.useModal();
  const router = useRouter();
  
  const [user, setUser] = useState<any>(null);
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [distinctUserRoles, setDistinctUserRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { create, read, update, delete: del, isAdmin, isReady } = usePermissions('/permission');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formRole, setFormRole] = useState("");
  const [formPermissions, setFormPermissions] = useState<Record<string, any>>({});

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    
    const parsed = JSON.parse(storedUser);
    
    if (parsed.update_password === false) {
      router.push('/update-password');
      return;
    }
    
    setUser(parsed);
    fetchData(parsed);
  }, []);

  const getHeaders = (customUser?: any) => {
    const currentUser = customUser || user;
    const isAdminCheck = currentUser && (String(currentUser.nip).toLowerCase() === 'admin' || String(currentUser.role).toLowerCase() === 'admin');
    return {
      'Content-Type': 'application/json',
      'x-admin-nip': isAdminCheck || read ? 'admin' : String(currentUser?.nip || '')
    };
  };

  const fetchData = async (currentUser: any) => {
    try {
      // Fetch menus
      const resMenu = await fetch('/api/menu');
      const jsonMenu = await resMenu.json();
      if (jsonMenu.success) {
        // Sort menus to group children under parents
        const sortedMenus = jsonMenu.data.sort((a: Menu, b: Menu) => {
           if (a.parent_id && !b.parent_id) return 1;
           if (!a.parent_id && b.parent_id) return -1;
           return a.nama.localeCompare(b.nama);
        });
        setMenus(sortedMenus);
      }

      // Fetch roles
      const resRole = await fetch('/api/permission', {
        headers: getHeaders(currentUser)
      });
      const jsonRole = await resRole.json();
      if (jsonRole.success) {
        setRoles(jsonRole.data);
      }

      // Fetch users to get distinct roles
      const resPegawai = await fetch('/api/pegawai', {
        headers: getHeaders(currentUser)
      });
      const jsonPegawai = await resPegawai.json();
      if (jsonPegawai.success) {
        const uniqueRoles = Array.from(new Set(jsonPegawai.data.map((u: any) => u.role))).filter(Boolean) as string[];
        setDistinctUserRoles(uniqueRoles);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      messageApi.error("Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setFormRole("");
    setFormPermissions({});
    setIsModalOpen(true);
  };

  const openEditModal = (roleItem: RolePermission) => {
    if (roleItem.role.toLowerCase() === 'admin') {
      messageApi.error("Role UTAMA (Admin) tidak dapat dimodifikasi");
      return;
    }
    setIsEditMode(true);
    setFormRole(roleItem.role);
    setFormPermissions(roleItem.menu_permissions || {});
    setIsModalOpen(true);
  };

  const handlePermissionChange = (menuId: string, action: string, checked: boolean) => {
    setFormPermissions(prev => ({
      ...prev,
      [menuId]: {
        ...(prev[menuId] || { create: false, read: false, update: false, delete: false }),
        [action]: checked
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRole.trim()) {
      messageApi.error("Nama Role harus diisi!");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditMode ? `/api/permission/${formRole}` : '/api/permission';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify({
          role: formRole,
          menu_permissions: formPermissions
        })
      });
      
      const json = await res.json();
      if (json.success) {
        messageApi.success(isEditMode ? "Hak akses berhasil diperbarui" : "Role berhasil ditambahkan");
        setIsModalOpen(false);
        fetchData(user);
      } else {
        messageApi.error(json.error || "Gagal menyimpan data");
      }
    } catch (err) {
      messageApi.error("Terjadi kesalahan koneksi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (roleItem: RolePermission) => {
    if (roleItem.role.toLowerCase() === 'admin') {
      messageApi.error("Role UTAMA (Admin) tidak dapat dihapus");
      return;
    }

    modalApi.confirm({
      title: 'Konfirmasi Hapus',
      content: `Apakah Anda yakin ingin menghapus role "${roleItem.role}"? Pengguna dengan role ini mungkin akan kehilangan akses.`,
      okText: 'Ya, Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      onOk: async () => {
        try {
          const res = await fetch(`/api/permission/${roleItem.id}`, {
            method: 'DELETE',
            headers: getHeaders()
          });
          const json = await res.json();
          if (json.success) {
            messageApi.success("Role berhasil dihapus");
            fetchData(user);
          } else {
            messageApi.error(json.error || "Gagal menghapus role");
          }
        } catch (err) {
          messageApi.error("Terjadi kesalahan koneksi");
        }
      }
    });
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090d16]">
        <svg className="animate-spin h-8 w-8 text-[#DA251C]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      </div>
    );
  }

  // Ensure Admin role is visible even if not in DB, for clarity
  const displayRoles = [...roles];
  if (!displayRoles.find(r => r.role.toLowerCase() === 'admin')) {
    displayRoles.unshift({ id: 'admin', role: 'Admin', menu_permissions: {} });
  }

  return (
    <>
      {messageHolder}
      {modalHolder}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Manajemen Hak Akses (Role)</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Atur pemetaan akses (Create, Read, Update, Delete) untuk masing-masing tipe pengguna.</p>
          </div>
          <div className="flex gap-3">
            {(isAdmin || create) && (
              <button
                onClick={openCreateModal}
                className="bg-[#DA251C] hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center shadow-sm text-sm cursor-pointer"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Tambah Hak Akses
              </button>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama Role</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status Akses</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#0f172a] divide-y divide-slate-200 dark:divide-slate-800">
                {displayRoles.map((r) => {
                  const isAdminRole = r.role.toLowerCase() === 'admin';
                  return (
                    <tr key={r.role} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          {r.role}
                          {isAdminRole && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#DA251C] text-white rounded-full tracking-wider">UTAMA</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-500 dark:text-slate-400 flex flex-wrap gap-1">
                          {isAdminRole ? (
                            <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-xs font-semibold">Semua Akses (Bypass)</span>
                          ) : (
                            Object.entries(r.menu_permissions || {}).map(([menuId, perms]) => {
                               const menu = menus.find(m => m.id === menuId);
                               if (!menu || !perms.read) return null;
                               return (
                                 <span key={menuId} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 text-xs">
                                   {menu.nama}
                                 </span>
                               );
                            })
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-3">
                          {(isAdmin || update) && (
                            <button 
                              onClick={() => openEditModal(r)}
                              disabled={isAdminRole}
                              className={`flex items-center text-slate-400 transition-colors ${isAdminRole ? 'opacity-30 cursor-not-allowed' : 'hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer'}`}
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                          )}
                          {(isAdmin || del) && (
                            <button 
                              onClick={() => handleDelete(r)}
                              disabled={isAdminRole}
                              className={`flex items-center text-slate-400 transition-colors ${isAdminRole ? 'opacity-30 cursor-not-allowed' : 'hover:text-red-600 dark:hover:text-red-400 cursor-pointer'}`}
                              title="Hapus"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Role & Permission */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{isEditMode ? 'Edit Role & Akses' : 'Tambah Role Baru'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="permissionForm" onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Nama Role *</label>
                  {isEditMode ? (
                    <input
                      type="text" required
                      disabled={true}
                      value={formRole}
                      className="w-full md:w-1/2 px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm opacity-70"
                    />
                  ) : (
                    <select
                      required
                      value={formRole} onChange={e => setFormRole(e.target.value)}
                      className="w-full md:w-1/2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-[#DA251C] focus:outline-none"
                    >
                      <option value="">-- Pilih Role dari Data Pegawai --</option>
                      {distinctUserRoles.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 block">Pengaturan Akses Menu</h3>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                      <thead className="bg-slate-50 dark:bg-slate-800/60">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Menu</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Read</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Create</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Update</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-[#0f172a] divide-y divide-slate-100 dark:divide-slate-800/50">
                        {menus.map((menu) => {
                           const p = formPermissions[menu.id] || { create: false, read: false, update: false, delete: false };
                           const isChild = !!menu.parent_id;
                           return (
                             <tr key={menu.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                               <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                                 {isChild ? (
                                   <span className="flex items-center gap-2 ml-4 text-slate-600 dark:text-slate-400">
                                     <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                     {menu.nama}
                                   </span>
                                 ) : menu.nama}
                               </td>
                               <td className="px-4 py-3 text-center">
                                 <input type="checkbox" className="w-4 h-4 accent-[#DA251C]" checked={p.read} onChange={(e) => handlePermissionChange(menu.id, 'read', e.target.checked)} />
                               </td>
                               <td className="px-4 py-3 text-center">
                                 <input type="checkbox" className="w-4 h-4 accent-[#DA251C]" checked={p.create} onChange={(e) => handlePermissionChange(menu.id, 'create', e.target.checked)} />
                               </td>
                               <td className="px-4 py-3 text-center">
                                 <input type="checkbox" className="w-4 h-4 accent-[#DA251C]" checked={p.update} onChange={(e) => handlePermissionChange(menu.id, 'update', e.target.checked)} />
                               </td>
                               <td className="px-4 py-3 text-center">
                                 <input type="checkbox" className="w-4 h-4 accent-[#DA251C]" checked={p.delete} onChange={(e) => handlePermissionChange(menu.id, 'delete', e.target.checked)} />
                               </td>
                             </tr>
                           );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold transition-colors cursor-pointer">Batal</button>
              <button type="submit" form="permissionForm" disabled={isSubmitting} className="px-4 py-2 bg-[#DA251C] hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                {isSubmitting && <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                {isEditMode ? 'Simpan Perubahan' : 'Simpan Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

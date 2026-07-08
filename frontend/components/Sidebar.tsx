"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

interface Menu {
  id: string;
  nama: string;
  url: string;
  is_parent: boolean;
  parent_id?: string | null;
  children?: Menu[];
}

const getMenuIcon = (nama: string) => {
  const n = nama.toLowerCase();
  if (n.includes('dashboard')) {
    return <svg className="w-5 h-5 mr-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
  }
  if (n.includes('pegawai')) {
    return <svg className="w-5 h-5 mr-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
  }
  if (n.includes('laporan')) {
    return <svg className="w-5 h-5 mr-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
  }
  if (n.includes('pelayanan')) {
    return <svg className="w-5 h-5 mr-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
  }
  if (n.includes('pengaturan') || n.includes('setting')) {
    return <svg className="w-5 h-5 mr-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
  }
  if (n.includes('jadwal') || n.includes('terpadu')) {
    return <svg className="w-5 h-5 mr-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
  }
  // Default icon
  return <svg className="w-5 h-5 mr-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
};

export default function Sidebar({ children }: { children?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopOpen, setIsDesktopOpen] = useState(true);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [userPermissions, setUserPermissions] = useState<Record<string, any>>({});
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchMenus(parsedUser);
    }
  }, []);

  const fetchMenus = async (currentUserParam?: any) => {
    try {
      const resMenu = await fetch('/api/menu');
      const jsonMenu = await resMenu.json();
      if (jsonMenu.success) {
        const rawMenus: Menu[] = jsonMenu.data;
        const parents = rawMenus.filter(m => !m.parent_id).sort((a, b) => a.nama.localeCompare(b.nama));
        const children = rawMenus.filter(m => m.parent_id).sort((a, b) => a.nama.localeCompare(b.nama));

        const tree = parents.map(parent => ({
          ...parent,
          children: children.filter(child => child.parent_id === parent.id)
        }));

        setMenus(tree);
      }

      // Fetch user role permissions if not admin
      const currentUser = currentUserParam || user || (typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {});
      const isAdminCheck = currentUser && (String(currentUser.nip).toLowerCase() === 'admin' || String(currentUser.role).toLowerCase() === 'admin');

      if (!isAdminCheck) {
        const role = currentUser.role || 'Pegawai';
        const resPerm = await fetch(`/api/permission?role=${role}`);
        const jsonPerm = await resPerm.json();
        if (jsonPerm.success && jsonPerm.data) {
          setUserPermissions(jsonPerm.data.menu_permissions || {});
        } else {
          // Default if role not found, maybe no permissions
          setUserPermissions({});
        }
      }
    } catch (error) {
      console.error("Failed to fetch menus", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const toggleExpand = (id: string) => {
    setExpandedParents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isAdmin = user && (String(user.nip).toLowerCase() === 'admin' || String(user.role).toLowerCase() === 'admin');

  if (!user) return null;

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-[#090d16] transition-all duration-300 flex flex-col ${isDesktopOpen ? 'md:pl-72' : 'md:pl-0'}`}>

      {/* Tombol Hamburger Floating untuk Desktop (Muncul saat sidebar tertutup) */}
      {!isDesktopOpen && (
        <button
          onClick={() => setIsDesktopOpen(true)}
          className="hidden md:flex fixed top-4 left-4 z-40 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300 cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      )}

      {/* Mobile Header (Hanya tampil di HP) */}
      <div className="md:hidden sticky top-0 z-40 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 px-4 h-16 flex items-center justify-between shadow-sm transition-colors duration-300">
        <div className="flex items-center">
          <img src="/assets/images/ojk-logo.png" alt="Logo OJK" className="h-8 w-auto dark:hidden" />
          <img src="/assets/images/logo-ojk-putih.png" alt="Logo OJK" className="h-8 w-auto hidden dark:block" />
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 -mr-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isMobileOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Overlay Mobile (Backdrop) */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out shadow-xl md:shadow-none
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} 
        ${isDesktopOpen ? 'md:translate-x-0' : 'md:-translate-x-full'}
      `}>

        {/* Sidebar Header / Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center">
            <img src="/assets/images/ojk-logo.png" alt="Logo OJK" className="h-9 w-auto dark:hidden" />
            <img src="/assets/images/logo-ojk-putih.png" alt="Logo OJK" className="h-9 w-auto hidden dark:block" />
          </div>
          {/* Tombol Tutup Sidebar untuk Desktop */}
          <button
            onClick={() => setIsDesktopOpen(false)}
            className="hidden md:block p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>
        </div>

        {/* Sidebar Menu Items */}
        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
          {menus.map((menu) => {
            const isActive = pathname === menu.url || (menu.children?.some(c => c.url === pathname));

            // Logika Akses RBAC
            if (!isAdmin) {
              const menuPerm = userPermissions[menu.id];
              const hasReadAccess = menuPerm && menuPerm.read === true;

              // Khusus menu parent, cek apakah ada minimal 1 anaknya yang punya akses read
              // Jika parent-nya sendiri punya akses read, boleh tampil. Atau jika ada anaknya yang read.
              let hasAnyAccess = hasReadAccess;
              if (menu.is_parent && menu.children) {
                const hasChildAccess = menu.children.some(child => {
                  const childPerm = userPermissions[child.id];
                  return childPerm && childPerm.read === true;
                });
                hasAnyAccess = hasReadAccess || hasChildAccess;
              }

              if (!hasAnyAccess) return null;
            }

            if (menu.is_parent && menu.children && menu.children.length > 0) {
              const isExpanded = expandedParents[menu.id] ?? isActive; // ?? agar bisa diclose meskipun child aktif
              return (
                <div key={menu.id} className="space-y-1">
                  <button
                    onClick={() => toggleExpand(menu.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                      ? 'text-[#DA251C] dark:text-red-400 bg-red-50 dark:bg-red-950/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                  >
                    <span className="flex items-center">
                      {getMenuIcon(menu.nama)}
                      {menu.nama}
                    </span>
                    <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {isExpanded && (
                    <div className="pl-6 mt-1 space-y-1">
                      {menu.children.map(child => {
                        const isChildActive = pathname === child.url;

                        if (!isAdmin) {
                          const childPerm = userPermissions[child.id];
                          if (!childPerm || childPerm.read !== true) return null;
                        }

                        return (
                          <Link
                            key={child.id}
                            href={child.url}
                            onClick={() => setIsMobileOpen(false)}
                            className={`block px-3 py-2 rounded-lg text-sm transition-colors ${isChildActive
                              ? 'font-semibold text-[#DA251C] dark:text-red-400 bg-red-50 dark:bg-red-950/40 relative before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[#DA251C] before:rounded-full'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              }`}
                          >
                            <div className="pl-2">{child.nama}</div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={menu.id}
                href={menu.url}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive
                  ? 'font-semibold text-[#DA251C] dark:text-red-400 bg-red-50 dark:bg-red-950/40 relative before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[#DA251C] before:rounded-full'
                  : 'font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                <div className={`flex items-center ${isActive ? 'pl-2' : ''}`}>
                  {getMenuIcon(menu.nama)}
                  {menu.nama}
                </div>
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
            <Link
              href="/layar-antrean"
              target="_blank"
              onClick={() => setIsMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              Layar TV Antrean
            </Link>
          </div>
        </div>

        {/* Sidebar Footer / User Profile */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Telah Login</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[120px] uppercase">{user.nama || user.email || user.nip}</span>
            </div>
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/40 text-slate-700 hover:text-[#DA251C] dark:text-slate-300 dark:hover:text-red-400 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Keluar Aplikasi
          </button>
        </div>
      </aside>

      {/* Main Content (Anak/Children) */}
      {children}
    </div>
  );
}

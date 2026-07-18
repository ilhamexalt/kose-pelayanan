"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/AuthContext';

export interface Permissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  export: boolean;
  isAdmin: boolean;
  isReady: boolean;
}

export function usePermissions(pathname: string): Permissions {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [perms, setPerms] = useState<Permissions>({
    create: false,
    read: false,
    update: false,
    delete: false,
    export: false,
    isAdmin: false,
    isReady: false
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkPermissions = () => {
      if (isLoading) return; // Tunggu auth selesai

      if (!user) {
        setPerms(p => ({ ...p, isReady: true }));
        router.push('/login');
        return;
      }
      
      const isAdmin = String(user.nip).toLowerCase() === 'admin' || String(user.role).toLowerCase() === 'admin';
      
      if (isAdmin) {
        setPerms({ create: true, read: true, update: true, delete: true, export: true, isAdmin: true, isReady: true });
        return;
      }

      const cachedMenusStr = localStorage.getItem('cached_menus');
      const cachedPermsStr = localStorage.getItem('cached_permissions');
      
      if (cachedMenusStr && cachedPermsStr) {
        const menus = JSON.parse(cachedMenusStr);
        const permissions = JSON.parse(cachedPermsStr);
        
        // Function to recursively find the menu ID for the given pathname
        const findMenuId = (menuList: any[]): string | null => {
          for (const m of menuList) {
            if (m.url === pathname) return m.id;
            if (m.children && m.children.length > 0) {
              const foundId = findMenuId(m.children);
              if (foundId) return foundId;
            }
          }
          return null;
        };
        
        const menuId = findMenuId(menus);
        
        if (menuId && permissions[menuId]) {
          const menuPerm = permissions[menuId];
          setPerms({
            create: menuPerm.create === true,
            read: menuPerm.read === true,
            update: menuPerm.update === true,
            delete: menuPerm.delete === true,
            export: menuPerm.export === true,
            isAdmin: false,
            isReady: true
          });
          
          if (menuPerm.read !== true) {
            router.push('/dashboard');
          }
        } else {
          // If menu not found or no permissions defined, block access by default
          setPerms({ create: false, read: false, update: false, delete: false, export: false, isAdmin: false, isReady: true });
          router.push('/dashboard');
        }
      } else {
        // Retry logic for when Sidebar hasn't finished fetching menus/permissions
        timeoutId = setTimeout(checkPermissions, 100);
      }
    };

    checkPermissions();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pathname, router]);

  return perms;
}

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import { message } from "antd";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

import CustomSelect from "@/components/CustomSelect";

export default function DashboardPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const isAdmin = user && (String(user.nip).toLowerCase() === 'admin' || String(user.role).toLowerCase() === 'admin');
  const [pelayananList, setPelayananList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

      const unsubscribe = onSnapshot(collection(db, 'pelayanan'), (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPelayananList(list);
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
      {contextHolder}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <h1>Selamat Siang, <span className="font-bold uppercase">{user.nama}</span></h1>
      </main>
    </>
  );
}

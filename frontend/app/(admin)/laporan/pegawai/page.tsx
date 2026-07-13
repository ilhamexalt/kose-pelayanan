"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@/hooks/usePermissions";
import * as XLSX from "xlsx";
import { message, Table, Input, Select, Tag, Button } from "antd";
import type { ColumnsType } from "antd/es/table";

export default function LaporanPegawaiPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Gunakan hooks permission khusus laporan, atau pakai /pegawai jika menginduk kesana
  // Di sini saya pakai '/laporan' agar seragam dengan laporan lainnya.
  const { isReady, read } = usePermissions('/laporan/pegawai');

  const [pegawaiList, setPegawaiList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [rolesList, setRolesList] = useState<string[]>([]);



  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchPegawai(parsedUser);
      fetchRoles(parsedUser);
    }
  }, []);

  const getHeaders = (customUser?: any) => {
    const currentUser = customUser || user;
    const isAdminCheck = currentUser && (String(currentUser.nip).toLowerCase() === 'admin' || String(currentUser.role).toLowerCase() === 'admin');
    return {
      'Content-Type': 'application/json',
      'x-admin-nip': isAdminCheck || read ? 'admin' : String(currentUser?.nip || '')
    };
  };

  const fetchPegawai = async (callerUser?: any) => {
    try {
      const res = await fetch('/api/pegawai', { headers: getHeaders(callerUser) });
      const json = await res.json();
      if (json.success) {
        setPegawaiList(json.data);
      } else {
        messageApi.error(json.error || 'Gagal mengambil data pegawai');
      }
    } catch (error) {
      messageApi.error("Terjadi kesalahan koneksi");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async (callerUser?: any) => {
    try {
      const res = await fetch('/api/permission', { headers: getHeaders(callerUser) });
      const json = await res.json();
      if (json.success) {
        setRolesList(json.data.map((r: any) => r.role));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredAndSortedList = pegawaiList
    .filter(p => {
      const matchesSearch = (p.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.nip || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.username || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = filterRole ? p.role === filterRole : true;
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

  const columns: ColumnsType<any> = [
    {
      title: 'No',
      key: 'no',
      width: 60,
      render: (text, record, index) => index + 1,
    },
    {
      title: 'Username',
      key: 'nip',
      render: (_, record) => (
        <div>
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{record.nip}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{record.username}</div>
        </div>
      )
    },
    {
      title: 'Pegawai',
      key: 'pegawai',
      render: (_, record) => (
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs mr-3">
            {(record.nama || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{record.nama}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{record.email || '-'}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Role / Jabatan',
      key: 'role',
      render: (_, record) => (
        <Tag color="blue" className="rounded-full px-3 border-none shadow-sm">{record.role}</Tag>
      )
    },
  ];

  const handleExportExcel = () => {
    if (filteredAndSortedList.length === 0) {
      messageApi.warning('Tidak ada data pegawai untuk di-export.');
      return;
    }

    const exportData = filteredAndSortedList.map((p, idx) => ({
      'No': idx + 1,
      'NIP': p.nip || '-',
      'Nama': p.nama || '-',
      'Username': p.username || '-',
      'Email': p.email || '-',
      'Role / Jabatan': p.role || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Pegawai");

    XLSX.writeFile(workbook, `Laporan_Data_Pegawai_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!isReady || isLoading) {
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
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 font-sans">

        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
              <Link href="/laporan" className="hover:text-[#DA251C] transition-colors">Laporan</Link>
              <span>/</span>
              <span className="text-slate-800 dark:text-slate-200 font-medium">Pegawai</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Laporan Data Pegawai</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Rekapitulasi dan daftar seluruh pegawai yang terdaftar di sistem.</p>
          </div>
          <button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-5 rounded-lg transition-all flex items-center shadow-sm text-sm cursor-pointer border-none"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export ke Excel
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex w-full sm:max-w-md gap-2">
            <Input
              prefix={<svg className="w-4 h-4 text-slate-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
              placeholder="Cari nama, NIP, atau username..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={() => setSearchQuery(searchInput)}
              className="w-full rounded-lg"
            />
            <Button type="primary" onClick={() => setSearchQuery(searchInput)} className="bg-[#DA251C] hover:bg-red-700 border-none">
              Cari
            </Button>
            {searchQuery && (
              <Button onClick={() => { setSearchInput(''); setSearchQuery(''); }}>
                Reset
              </Button>
            )}
          </div>

          <Select
            value={filterRole}
            onChange={(value) => setFilterRole(value)}
            className="w-full sm:w-48"
            options={[
              { value: '', label: 'Semua Role' },
              ...rolesList.map(role => ({ value: role, label: role }))
            ]}
          />
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-2 overflow-hidden">
          <Table
            size="small"
            dataSource={filteredAndSortedList}
            columns={columns}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showTotal: (total, range) => `Menampilkan ${range[0]} - ${range[1]} dari ${total} data`
            }}
            scroll={{ x: 'max-content' }}
          />
        </div>
      </main>
    </>
  );
}

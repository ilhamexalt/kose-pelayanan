"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { usePermissions } from "@/hooks/usePermissions";
import * as XLSX from "xlsx";
import { message, Table, Input, Select, Tag, Button, DatePicker } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

export default function LaporanRuanganMeetingPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  const { isReady, export: canExport, isAdmin } = usePermissions('/laporan/ruangan-meeting');

  const [meetingList, setMeetingList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRuangan, setFilterRuangan] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const { RangePicker } = DatePicker;


  useEffect(() => {
    if (isAuthLoading || !user) return;
    fetchMeetings();
  }, [user, isAuthLoading]);

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/meeting');
      const json = await res.json();
      if (json.success) {
        setMeetingList(json.data);
      } else {
        messageApi.error('Gagal mengambil data meeting');
      }
    } catch (error) {
      messageApi.error("Terjadi kesalahan koneksi");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatus = (tanggal: string, mulai: string, selesai: string) => {
    const now = dayjs();
    const start = dayjs(`${tanggal} ${mulai}`);
    const end = dayjs(`${tanggal} ${selesai}`);

    if (now.isBefore(start)) return "Akan Datang";
    if (now.isAfter(end)) return "Selesai";
    return "Sedang Berlangsung";
  };

  const formatPeserta = (pesertaList: any[]) => {
    if (!Array.isArray(pesertaList) || pesertaList.length === 0) return "0";
    const validPeserta = pesertaList.filter(p => p.jumlah > 0);
    if (validPeserta.length === 0) return "0";
    return validPeserta.map(p => `${p.jumlah}${p.jabatan ? ` (${p.jabatan})` : ''}`).join(', ');
  };

  const filteredAndSortedList = meetingList
    .map(m => ({
      ...m,
      status: getStatus(m.tanggal, m.waktuMulai, m.waktuSelesai),
      internalStr: formatPeserta(m.pesertaInternal),
      eksternalStr: formatPeserta(m.pesertaEksternal)
    }))
    .filter(p => {
      const matchesSearch = (p.instansi || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.keterangan || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRuangan = filterRuangan ? p.ruangan === filterRuangan : true;
      
      let matchesDate = true;
      if (dateRange && dateRange[0] && dateRange[1]) {
        const itemDate = dayjs(p.tanggal).startOf('day').toDate();
        const startDate = dateRange[0].startOf('day').toDate();
        const endDate = dateRange[1].endOf('day').toDate();
        matchesDate = itemDate >= startDate && itemDate <= endDate;
      }

      return matchesSearch && matchesRuangan && matchesDate;
    })
    .sort((a, b) => {
      const dateA = dayjs(`${a.tanggal} ${a.waktuMulai}`).valueOf();
      const dateB = dayjs(`${b.tanggal} ${b.waktuMulai}`).valueOf();
      return dateB - dateA; // Terkini di atas
    });

  const uniqueRuangan = Array.from(new Set(meetingList.map(m => m.ruangan))).filter(Boolean);

  const columns: ColumnsType<any> = [
    {
      title: 'Ruangan / Jadwal',
      key: 'jadwal',
      render: (_, record) => (
        <div>
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{record.ruangan || '-'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{dayjs(record.tanggal).format('DD MMM YYYY')} • {record.waktuMulai} - {record.waktuSelesai}</div>
        </div>
      )
    },
    {
      title: 'Instansi',
      key: 'instansi',
      dataIndex: 'instansi',
      render: (text) => <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{text}</div>
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Tag color={getStatusColor(record.status)} className="rounded-full px-3 shadow-sm border-none font-bold">
          {record.status}
        </Tag>
      )
    },
    {
      title: 'Peserta',
      key: 'peserta',
      render: (_, record) => (
        <div className="text-xs text-slate-700 dark:text-slate-300">
          <div>Int: {record.internalStr}</div>
          <div className="text-slate-500 dark:text-slate-400">Eks: {record.eksternalStr}</div>
        </div>
      )
    },
  ];

  const handleExportExcel = () => {
    if (filteredAndSortedList.length === 0) {
      messageApi.warning('Tidak ada data meeting untuk di-export.');
      return;
    }

    const exportData = filteredAndSortedList.map((m, idx) => ({
      'No': idx + 1,
      'Tanggal': m.tanggal,
      'Waktu Mulai': m.waktuMulai,
      'Waktu Selesai': m.waktuSelesai,
      'Ruangan': m.ruangan || '-',
      'Instansi / Penyelenggara': m.instansi || '-',
      'Peserta Internal': m.internalStr,
      'Peserta Eksternal': m.eksternalStr,
      'Status': m.status,
      'Keterangan Konsumsi': m.keterangan || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ruangan Meeting");

    XLSX.writeFile(workbook, `Laporan_Ruangan_Meeting_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Sedang Berlangsung': return 'warning';
      case 'Selesai': return 'success';
      case 'Akan Datang': return 'processing';
      default: return 'default';
    }
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
              <span className="text-slate-800 dark:text-slate-200 font-medium">Ruangan Meeting</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Laporan Ruangan Meeting</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Rekapitulasi jadwal penggunaan ruangan meeting.</p>
          </div>
          {(isAdmin || canExport) && (
            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-5 rounded-lg transition-all flex items-center shadow-sm text-sm cursor-pointer border-none"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export ke Excel
            </button>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex w-full sm:max-w-md gap-2">
            <Input 
              prefix={<svg className="w-4 h-4 text-slate-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
              placeholder="Cari instansi atau agenda..." 
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

          <div className="w-full sm:w-auto flex flex-wrap gap-4">
            <RangePicker 
              className="w-full sm:w-64"
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
              format="DD/MM/YYYY"
              placeholder={['Mulai Tanggal', 'Sampai Tanggal']}
            />
            <Select
              value={filterRuangan}
              onChange={(value) => setFilterRuangan(value)}
              className="w-full sm:w-48"
              options={[
                { value: '', label: 'Semua Ruangan' },
                ...uniqueRuangan.map(ruang => ({ value: ruang as string, label: ruang as string }))
              ]}
            />
          </div>
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

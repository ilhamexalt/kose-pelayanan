"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { usePermissions } from "@/hooks/usePermissions";
import * as XLSX from "xlsx";
import { message, Table, Input, Select, Tag, DatePicker, Button } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

export default function LaporanRiwayatPelayananPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const { isReady, export: canExport, isAdmin } = usePermissions('/laporan/riwayat-pelayanan');

  const [pelayananList, setPelayananList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const { RangePicker } = DatePicker;


  useEffect(() => {
    if (isAuthLoading || !user) return;
    fetchPelayanan();
  }, [user, isAuthLoading]);

  const fetchPelayanan = async () => {
    try {
      const res = await fetch('/api/pelayanan');
      const json = await res.json();
      if (json.success) {
        setPelayananList(json.data);
      } else {
        messageApi.error('Gagal mengambil data pelayanan');
      }
    } catch (error) {
      messageApi.error("Terjadi kesalahan koneksi");
    } finally {
      setIsLoading(false);
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
    .filter(p => {
      const matchesSearch = (p.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.nik || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.queueNumber_raw || p.queueNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesJenis = filterJenis ? p.jenis === filterJenis : true;
      const matchesStatus = filterStatus ? p.status === filterStatus : true;

      let matchesDate = true;
      if (dateRange && dateRange[0] && dateRange[1]) {
        const itemDate = new Date(p.createdAt || 0);
        const startDate = dateRange[0].startOf('day').toDate();
        const endDate = dateRange[1].endOf('day').toDate();
        matchesDate = itemDate >= startDate && itemDate <= endDate;
      }

      return matchesSearch && matchesJenis && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA; // Terkini di atas
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Diproses': return 'processing';
      case 'Selesai': return 'success';
      case 'Batal': return 'error';
      default: return 'warning';
    }
  };

  const columns: ColumnsType<any> = [
    {
      title: 'Antrean / Register',
      key: 'queue',
      render: (_, record) => (
        <div>
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{record.queueNumber_raw || record.queueNumber || '-'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Reg: {record.nomorRegister || '-'}</div>
        </div>
      )
    },
    {
      title: 'Pemohon',
      key: 'pemohon',
      render: (_, record) => (
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{record.nama}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">NIK: {record.nik}</div>
        </div>
      )
    },
    {
      title: 'Layanan',
      key: 'layanan',
      render: (_, record) => (
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{record.jenis}</div>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Tag color={getStatusColor(record.status || 'Antre')} className="rounded-full px-3 shadow-sm border-none font-bold">
          {record.status || 'Antre'}
        </Tag>
      )
    },
    {
      title: 'Tanggal',
      key: 'tanggal',
      render: (_, record) => (
        <div className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {formatDateTime(record.createdAt)}
        </div>
      )
    },
  ];

  const handleExportExcel = () => {
    if (filteredAndSortedList.length === 0) {
      messageApi.warning('Tidak ada data pelayanan untuk di-export.');
      return;
    }

    const workbook = XLSX.utils.book_new();

    const pengaduanList = filteredAndSortedList.filter(p => (p.jenis || '').toLowerCase() === 'pengaduan');
    const slikList = filteredAndSortedList.filter(p => (p.jenis || '').toLowerCase() === 'slik');
    const umumList = filteredAndSortedList.filter(p => (p.jenis || '').toLowerCase() === 'umum');
    const lainnyaList = filteredAndSortedList.filter(p => !['pengaduan', 'slik', 'umum'].includes((p.jenis || '').toLowerCase()));

    if (pengaduanList.length > 0) {
      const exportPengaduan = pengaduanList.map((p, idx) => ({
        'NO': idx + 1,
        'NAMA DEBITUR': p.nama || '-',
        'TANGGAL PENGAJUAN': formatDateTime(p.createdAt),
        'ALAMAT': p.alamat || '-',
        'NO. HP': p.phone || '-',
        'EMAIL': p.email || '-',
        'JENIS LJK': p.klasifikasi || '-',
        'SEKTOR LJK': Array.isArray(p.sektor) ? p.sektor.join(', ') : (p.sektor || '-'),
        'PUJK YANG DIADUKAN': p.perusahaan || '-',
        'PERMASALAHAN': p.permasalahan || '-',
        'KETERANGAN': p.ringkasan || p.catatan || '-',
        'NOMOR LAPORAN': p.nomorLaporan || p.nomorRegister || p.queueNumber_raw || p.queueNumber || '-'
      }));
      const wsPengaduan = XLSX.utils.json_to_sheet(exportPengaduan);
      XLSX.utils.book_append_sheet(workbook, wsPengaduan, "Laporan Pengaduan");
    }

    const generateGeneralExport = (list: any[]) => {
      return list.map((p, idx) => ({
        'No': idx + 1,
        'Tanggal': formatDateTime(p.createdAt),
        'Nomor Antrean': p.queueNumber_raw || p.queueNumber || '-',
        'Nomor Register': p.nomorRegister || '-',
        'NIK': p.nik || '-',
        'Nama Pemohon': p.nama || '-',
        'Telepon': p.phone || '-',
        'Jenis Layanan': p.jenis || '-',
        'Status': p.status || 'Antre',
        'Diproses Oleh': p.processedBy?.nama || '-',
        'Catatan': p.catatan || '-'
      }));
    };

    if (slikList.length > 0) {
      const wsSlik = XLSX.utils.json_to_sheet(generateGeneralExport(slikList));
      XLSX.utils.book_append_sheet(workbook, wsSlik, "Layanan SLIK");
    }

    const generateKedinasanExport = (list: any[]) => {
      return list.map((p, idx) => ({
        'No': idx + 1,
        'Tanggal': formatDateTime(p.createdAt),
        'Nama Lengkap': p.nama || '-',
        'Alamat Lengkap': p.alamat || '-',
        'Nomor HP': p.phone || '-',
        'Nama Instansi/Perusahaan': p.instansi || '-',
        'Keperluan': p.keperluan || '-',
        'Bagian Yang Dituju': p.bertemu || '-',
        'Jumlah Orang': p.keterangan || '-'
      }));
    };

    if (umumList.length > 0) {
      const wsUmum = XLSX.utils.json_to_sheet(generateKedinasanExport(umumList));
      XLSX.utils.book_append_sheet(workbook, wsUmum, "Layanan Umum");
    }

    XLSX.writeFile(workbook, `Laporan_Pelayanan_${new Date().toISOString().split('T')[0]}.xlsx`);
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
              <span className="text-slate-800 dark:text-slate-200 font-medium">Riwayat Pelayanan</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Laporan Riwayat Pelayanan</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Rekapitulasi seluruh riwayat antrean dan penanganan nasabah.</p>
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
              placeholder="Cari nama, NIK, antrean..."
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
              value={filterJenis}
              onChange={(value) => setFilterJenis(value)}
              className="w-full sm:w-48"
              options={[
                { value: '', label: 'Semua Layanan' },
                { value: 'umum', label: 'Umum/Kedinasan' },
                { value: 'pengaduan', label: 'Pengaduan' },
                { value: 'slik', label: 'Permintaan SLIK' }
              ]}
            />

            <Select
              value={filterStatus}
              onChange={(value) => setFilterStatus(value)}
              className="w-full sm:w-40"
              options={[
                { value: '', label: 'Semua Status' },
                { value: 'Selesai', label: 'Selesai' },
                { value: 'Batal', label: 'Batal' },
                { value: 'Diproses', label: 'Diproses' },
                { value: 'Antre', label: 'Antre' }
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

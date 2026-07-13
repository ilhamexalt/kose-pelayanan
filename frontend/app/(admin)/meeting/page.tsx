"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DatePicker, Select, Button, Table, Tag, Space, Popconfirm, message } from "antd";
import dayjs, { Dayjs } from "dayjs";

interface Meeting {
  id: string;
  ruangan: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  instansi: string;
  pesertaInternal: any[];
  pesertaEksternal: any[];
  keterangan: string;
  createdAt: number;
}

export default function MeetingPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/meeting');
      const json = await res.json();
      if (json.success) {
        setMeetings(json.data);
      }
    } catch (e) {
      message.error("Gagal mengambil data jadwal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const [filterRuangan, setFilterRuangan] = useState<string>("");
  const [filterInstansi, setFilterInstansi] = useState<string>("");
  const [filterDate, setFilterDate] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const uniqueInstansi = Array.from(new Set(meetings.map(m => m.instansi)));

  const filteredMeetings = meetings.filter(m => {
    const matchRuangan = filterRuangan ? m.ruangan === filterRuangan : true;
    const matchInstansi = filterInstansi ? m.instansi === filterInstansi : true;
    let matchDate = true;
    if (filterDate && filterDate[0] && filterDate[1]) {
      const date = dayjs(m.tanggal);
      const start = filterDate[0].startOf('day');
      const end = filterDate[1].endOf('day');
      matchDate = (date.isAfter(start) || date.isSame(start, 'day')) && (date.isBefore(end) || date.isSame(end, 'day'));
    }
    return matchRuangan && matchInstansi && matchDate;
  }).map(m => {
    const now = dayjs();
    const start = dayjs(`${m.tanggal} ${m.waktuMulai}`);
    const end = dayjs(`${m.tanggal} ${m.waktuSelesai}`);

    let status = "Selesai";
    if (now.isBefore(start)) status = "Akan Datang";
    else if (now.isAfter(end)) status = "Selesai";
    else status = "Sedang Berlangsung";

    const formatPeserta = (pesertaList: any[]) => {
      if (!Array.isArray(pesertaList) || pesertaList.length === 0) return "0";
      const validPeserta = pesertaList.filter(p => p.jumlah > 0);
      if (validPeserta.length === 0) return "0";
      return validPeserta.map(p => `${p.jumlah}${p.jabatan ? ` (${p.jabatan})` : ''}`).join(', ');
    };

    const internal = formatPeserta(m.pesertaInternal);
    const eksternal = formatPeserta(m.pesertaEksternal);

    return {
      ...m,
      status,
      internalDisplay: internal,
      eksternalDisplay: eksternal,
      waktuDisplay: `${dayjs(m.tanggal).format('DD MMM YYYY')} (${m.waktuMulai} - ${m.waktuSelesai})`,
      ketDisplay: m.keterangan ? m.keterangan.split(',').filter(k => k.trim().length > 0) : []
    }
  });

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/meeting/${id}`, { method: 'DELETE' });
      if (res.ok) {
        message.success("Jadwal dihapus");
        fetchMeetings();
      }
    } catch (e) {
      message.error("Gagal menghapus jadwal");
    }
  };

  const columns = [
    {
      title: 'Ruangan',
      dataIndex: 'ruangan',
      key: 'ruangan',
      className: 'font-semibold text-slate-700 dark:text-slate-200'
    },
    {
      title: 'Waktu',
      dataIndex: 'waktuDisplay',
      key: 'waktuDisplay',
      className: 'text-slate-600 dark:text-slate-400'
    },
    {
      title: 'Instansi',
      dataIndex: 'instansi',
      key: 'instansi',
      className: 'font-medium text-slate-700 dark:text-slate-300'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (status: string) => {
        let color = 'default';
        if (status === 'Selesai') color = 'success';
        else if (status === 'Sedang Berlangsung') color = 'warning';
        else if (status === 'Akan Datang') color = 'processing';
        return <Tag color={color} className="px-2 py-0.5 rounded-md font-semibold">{status}</Tag>;
      }
    },
    {
      title: 'Peserta',
      key: 'peserta',
      render: (_: any, record: any) => (
        <div className="text-sm text-slate-700 dark:text-slate-300">
          <div>Internal: {record.internalDisplay}</div>
          <div className="text-slate-500 dark:text-slate-400">Eksternal: {record.eksternalDisplay}</div>
        </div>
      )
    },
    {
      title: 'Keterangan',
      key: 'keterangan',
      dataIndex: 'ketDisplay',
      render: (keterangan: string[]) => (
        <div className="text-sm text-slate-700 dark:text-slate-300">
          {keterangan.map((ket, idx) => <div key={idx}>- {ket.trim()}</div>)}
        </div>
      )
    },
    {
      title: '',
      key: 'action',
      align: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Link href={`/meeting/edit/${record.id}`}>
            <Button
              type="text"
              icon={<svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
              title="Edit"
            />
          </Link>
          <Popconfirm
            title="Hapus Jadwal"
            description="Apakah Anda yakin ingin menghapus jadwal ini?"
            onConfirm={() => handleDelete(record.id)}
            okText="Ya"
            cancelText="Tidak"
          >
            <Button
              type="text"
              danger
              icon={<svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
              title="Hapus"
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col mb-6 gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
            Jadwal Meeting Hari ini,
          </h1>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={filterRuangan}
                onChange={(value) => setFilterRuangan(value)}
                className="w-full sm:w-[180px]"
                placeholder="Semua Ruangan"
                options={[
                  { value: "", label: "Semua Ruangan" },
                  { value: "Pulau Sangiang", label: "Pulau Sangiang" },
                  { value: "Pulau Tunda", label: "Pulau Tunda" },
                  { value: "Pulau Umang", label: "Pulau Umang" },
                  { value: "Tanjung Lesung", label: "Tanjung Lesung" },
                  { value: "Ujung Kulon", label: "Ujung Kulon" }
                ]}
              />

              <Select
                value={filterInstansi}
                onChange={(value) => setFilterInstansi(value)}
                className="w-full sm:w-[180px]"
                placeholder="Semua Instansi"
                options={[
                  { value: "", label: "Semua Instansi" },
                  ...uniqueInstansi.map(instansi => ({ value: instansi, label: instansi }))
                ]}
              />

              <DatePicker.RangePicker
                className="w-full sm:w-auto"
                value={filterDate as any}
                onChange={(dates) => setFilterDate(dates as any)}
              />
            </div>

            <Link href="/meeting/create">
              <Button type="primary" size="medium" style={{ backgroundColor: "#DA251C" }}>
                COMPOSE
              </Button>
            </Link>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border-t-2 border-[#DA251C] overflow-x-auto">
          <Table
            columns={columns}
            dataSource={filteredMeetings}
            rowKey="id"
            pagination={false}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}

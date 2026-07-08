"use client";

import React, { useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { DatePicker, Select, Button, Table, Tag, Space, Popconfirm } from "antd";

interface Meeting {
  id: number;
  ruangan: string;
  waktu: string;
  instansi: string;
  status: "Selesai" | "Sedang Berlangsung" | "Akan Datang";
  pesertaInternal: number;
  pesertaEksternal: string;
  keterangan: string[];
}

export default function MeetingPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([
    {
      id: 1,
      ruangan: "Pulau Sangiang",
      waktu: "09.00 - 10.00",
      instansi: "PT BPR Lebak",
      status: "Selesai",
      pesertaInternal: 3,
      pesertaEksternal: "2 Direksi, 1 Komisaris",
      keterangan: ["Snack Pagi Bunda", "Makan Pagi Sore"]
    },
    {
      id: 2,
      ruangan: "Pulau Umang",
      waktu: "11.00 - 12.00",
      instansi: "PT BPR Lebak",
      status: "Sedang Berlangsung",
      pesertaInternal: 3,
      pesertaEksternal: "2 Direksi, 1 Komisaris",
      keterangan: ["Snack Pagi Bunda", "Makan Pagi Sore"]
    }
  ]);

  const [filterRuangan, setFilterRuangan] = useState<string>("");
  const [filterInstansi, setFilterInstansi] = useState<string>("");

  const uniqueInstansi = Array.from(new Set(meetings.map(m => m.instansi)));

  const filteredMeetings = meetings.filter(m => {
    const matchRuangan = filterRuangan ? m.ruangan === filterRuangan : true;
    const matchInstansi = filterInstansi ? m.instansi === filterInstansi : true;
    return matchRuangan && matchInstansi;
  });

  const handleDelete = (id: number) => {
    setMeetings(meetings.filter(m => m.id !== id));
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
      dataIndex: 'waktu',
      key: 'waktu',
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
      render: (status: Meeting["status"]) => {
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
      render: (_: any, record: Meeting) => (
        <div className="text-sm text-slate-700 dark:text-slate-300">
          <div>Internal: {record.pesertaInternal}</div>
          <div className="text-slate-500 dark:text-slate-400">Eksternal: {record.pesertaEksternal}</div>
        </div>
      )
    },
    {
      title: 'Keterangan',
      key: 'keterangan',
      dataIndex: 'keterangan',
      render: (keterangan: string[]) => (
        <div className="text-sm text-slate-700 dark:text-slate-300">
          {keterangan.map((ket, idx) => <div key={idx}>{ket}</div>)}
        </div>
      )
    },
    {
      title: '',
      key: 'action',
      align: 'right' as const,
      render: (_: any, record: Meeting) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>} 
            title="Edit" 
          />
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#020817] p-4 sm:p-6 lg:p-8 transition-colors duration-300 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
              Jadwal Meeting Hari ini,
            </h1>

            <div className="flex items-center gap-2">
              <Select
                value={filterRuangan}
                onChange={(value) => setFilterRuangan(value)}
                style={{ width: 180 }}
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
                style={{ width: 180 }}
                placeholder="Semua Instansi"
                options={[
                  { value: "", label: "Semua Instansi" },
                  ...uniqueInstansi.map(instansi => ({ value: instansi, label: instansi }))
                ]}
              />

              <DatePicker.RangePicker />
            </div>
          </div>

          <Link href="/meeting/create">
            <Button type="primary" size="large" style={{ backgroundColor: "#DA251C" }}>
              COMPOSE
            </Button>
          </Link>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-xl shadow-sm border-t-2 border-[#DA251C] overflow-hidden">
          <Table 
            columns={columns} 
            dataSource={filteredMeetings} 
            rowKey="id"
            pagination={false}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DatePicker, Select, Button, Table, Tag, Space, Popconfirm, message } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { usePermissions } from "@/hooks/usePermissions";

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
  const [messageApi, contextHolder] = message.useMessage();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const { create, read, update, delete: del, isAdmin, isReady } = usePermissions('/meeting');

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/meeting');
      const json = await res.json();
      if (json.success) {
        setMeetings(json.data);
      }
    } catch (e) {
      messageApi.error("Gagal mengambil data jadwal");
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
        messageApi.success("Jadwal dihapus");
        fetchMeetings();
      }
    } catch (e) {
      messageApi.error("Gagal menghapus jadwal");
    }
  };

  const ALL_ROOMS = [
    "Baduy",
    "Pulau Sangiang",
    "Pulau Tunda",
    "Pulau Umang",
    "Tanjung Lesung",
    "Ujung Kulon"
  ];

  const todayStr = dayjs().format("YYYY-MM-DD");
  const nowTimeStr = dayjs().format("HH:mm");

  const availableRoomsCount = ALL_ROOMS.filter(r => {
    return !meetings.some(m => m.ruangan === r && m.tanggal === todayStr && nowTimeStr >= m.waktuMulai && nowTimeStr < m.waktuSelesai);
  }).length;

  const canModify = isAdmin || update || del;

  const baseColumns = [
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
    }
  ];

  const columns = canModify ? [
    ...baseColumns,
    {
      title: 'Aksi',
      key: 'action',
      align: 'right' as const,
      render: (_: any, record: any) => (
        <div className="flex items-center justify-end gap-2">
          {(isAdmin || update) && (
            <Link href={`/meeting/edit/${record.id}`}>
              <button
                className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded text-xs transition-colors cursor-pointer"
                title="Edit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
            </Link>
          )}
          {(isAdmin || del) && (
            <Popconfirm
              title="Hapus Jadwal"
              description="Apakah Anda yakin ingin menghapus jadwal ini?"
              onConfirm={() => handleDelete(record.id)}
              okText="Ya"
              cancelText="Tidak"
            >
              <button
                className="px-2.5 py-1.5 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded text-xs transition-colors cursor-pointer"
                title="Hapus"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </Popconfirm>
          )}
        </div>
      )
    }
  ] : baseColumns;

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 font-sans">
      {contextHolder}
      <div className="w-full">
        {/* Box Informasi Ruangan Available */}
        <div className="mb-6 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <svg className="w-32 h-32 text-slate-800 dark:text-slate-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center justify-center w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
                  Live Status Ruangan
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                Ketersediaan Ruangan Meeting Saat Ini
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pantau status penggunaan dan jadwal berikutnya untuk hari ini ({dayjs().format('DD MMMM YYYY')})
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-xs font-semibold">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{availableRoomsCount}</span>
              <span className="text-slate-500">dari</span>
              <span className="text-slate-800 dark:text-slate-100 font-bold">{ALL_ROOMS.length} Ruangan</span>
              <span className="text-slate-500">Tersedia</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 relative z-10">
            {ALL_ROOMS.map((roomName) => {
              const roomMeetingsToday = meetings
                .filter(m => m.ruangan === roomName && m.tanggal === todayStr)
                .sort((a, b) => a.waktuMulai.localeCompare(b.waktuMulai));

              const currentMeeting = roomMeetingsToday.find(m => {
                return nowTimeStr >= m.waktuMulai && nowTimeStr < m.waktuSelesai;
              });

              const getAvailableTimeSlots = (roomMeetings: any[]) => {
                if (!roomMeetings || roomMeetings.length === 0) return "Sepanjang hari";

                const blockedHours = new Set<number>();
                for (const m of roomMeetings) {
                  const startH = parseInt((m.waktuMulai || '').split(':')[0], 10);
                  const endH = parseInt((m.waktuSelesai || '').split(':')[0], 10);
                  if (!isNaN(startH) && !isNaN(endH)) {
                    for (let h = startH; h <= endH; h++) {
                      blockedHours.add(h);
                    }
                  }
                }

                const effectiveNowH = dayjs().minute() > 0 ? dayjs().hour() + 1 : dayjs().hour();
                const freeHours: number[] = [];
                for (let h = 8; h <= 17; h++) {
                  if (h >= effectiveNowH && !blockedHours.has(h)) {
                    freeHours.push(h);
                  }
                }

                if (freeHours.length === 0) {
                  const allFree: number[] = [];
                  for (let h = 8; h <= 17; h++) {
                    if (!blockedHours.has(h)) allFree.push(h);
                  }
                  if (allFree.length === 0) return "Penuh hari ini";
                  return "Tidak ada jam tersisa";
                }

                const ranges: string[] = [];
                let startRange: number | null = null;
                let prev: number | null = null;

                for (let i = 0; i < freeHours.length; i++) {
                  const h = freeHours[i];
                  if (startRange === null) {
                    startRange = h;
                    prev = h;
                  } else if (h === (prev as number) + 1) {
                    prev = h;
                  } else {
                    ranges.push(
                      startRange === prev
                        ? `${String(startRange).padStart(2, '0')}:00`
                        : `${String(startRange).padStart(2, '0')}:00 - ${String(prev).padStart(2, '0')}:00`
                    );
                    startRange = h;
                    prev = h;
                  }
                }

                if (startRange !== null && prev !== null) {
                  ranges.push(
                    startRange === prev
                      ? `${String(startRange).padStart(2, '0')}:00`
                      : `${String(startRange).padStart(2, '0')}:00 - ${String(prev).padStart(2, '0')}:00`
                  );
                }

                return ranges.length > 0 ? ranges.join(", ") : "Penuh hari ini";
              };

              const availableSlotsStr = getAvailableTimeSlots(roomMeetingsToday);
              const isAvailable = !currentMeeting;

              return (
                <div
                  key={roomName}
                  onClick={() => setFilterRuangan(filterRuangan === roomName ? "" : roomName)}
                  className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${filterRuangan === roomName
                    ? "ring-2 ring-[#DA251C] border-[#DA251C] shadow-sm scale-[1.02]"
                    : "hover:border-slate-300 dark:hover:border-slate-600"
                    } ${isAvailable
                      ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40 text-slate-800 dark:text-slate-100"
                      : "bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/40 text-slate-800 dark:text-slate-100"
                    }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-xs font-bold truncate text-slate-800 dark:text-slate-100" title={roomName}>
                        {roomName}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${isAvailable ? "bg-emerald-500" : "bg-[#DA251C] animate-pulse"
                          }`}
                      />
                    </div>

                    <div className="text-[11px] font-semibold flex items-center gap-1">
                      {isAvailable ? (
                        roomMeetingsToday.length === 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">● Tersedia</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">● Terjadwal</span>
                        )
                      ) : (
                        <span className="text-[#DA251C] dark:text-red-400">● Terpakai</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/50 text-[11px]">
                    {currentMeeting ? (
                      <div>
                        <div className="truncate text-[10px] text-[#DA251C] dark:text-red-400 font-medium mb-1" title={`s.d. ${currentMeeting.waktuSelesai} (${currentMeeting.instansi})`}>
                          s.d. {currentMeeting.waktuSelesai} ({currentMeeting.instansi})
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Available:</div>
                        <div className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] leading-tight break-words" title={availableSlotsStr}>
                          {availableSlotsStr}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-slate-400 dark:text-slate-500 text-[10px] font-medium mb-0.5">
                          Available:
                        </div>
                        <div className="text-emerald-600 dark:text-emerald-400 font-bold leading-tight break-words" title={availableSlotsStr}>
                          {availableSlotsStr}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Header Section */}
        <div className="flex flex-col mb-6 gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
            Jadwal Meeting
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
                  { value: "Baduy", label: "Baduy" },
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

            {(isAdmin || create) && (
              <Link href="/meeting/create">
                <Button type="primary" size="medium" style={{ backgroundColor: "#DA251C" }}>
                  COMPOSE
                </Button>
              </Link>
            )}
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

"use client";

import React, { useState, useEffect } from "react";
import { Table, Tag, Popconfirm, message, Button, Modal, Form, Input, Select, DatePicker, TimePicker, Alert } from "antd";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
import { usePermissions } from "@/hooks/usePermissions";

interface Jadwal {
  id: string;
  nama: string[];
  kegiatan: string;
  tempat: string;
  tanggal: string;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  jamMulai?: string;
  jamSelesai?: string;
  status: string;
  displayStatus?: string;
}

const PEGAWAI_OPTIONS = [
  { value: "Adi Dharma", label: "Adi Dharma" },
];

const PEGAWAI_EMAILS: Record<string, string> = {
  "Adi Dharma": "adi.dharma@ojk.go.id",
};

const STATUS_OPTIONS = [
  { value: "Belum Mulai", label: "Belum Mulai" },
  { value: "Dalam Proses", label: "Dalam Proses" },
  { value: "Diblokir", label: "Diblokir" },
  { value: "Selesai", label: "Selesai" },
];

export default function JadwalPimpinanPage() {
  const [jadwal, setJadwal] = useState<Jadwal[]>([]);
  const [loading, setLoading] = useState(true);
  const { create, read, update, delete: del, isAdmin, isReady } = usePermissions('/pimpinan');

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const [filterDate, setFilterDate] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const fetchJadwal = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pimpinan');
      const json = await res.json();
      if (json.success) {
        setJadwal(json.data);
      }
    } catch (e) {
      messageApi.error("Gagal mengambil data jadwal pimpinan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJadwal();
  }, []);

  const showModal = (record?: Jadwal) => {
    if (record) {
      setIsEditing(true);
      setEditingId(record.id);
      form.setFieldsValue({
        nama: record.nama && record.nama.length > 0 ? record.nama : ["Adi Dharma"],
        kegiatan: record.kegiatan,
        tempat: record.tempat,
        tanggalMulai: record.tanggalMulai ? dayjs(record.tanggalMulai) : (record.tanggal ? dayjs(record.tanggal) : null),
        tanggalSelesai: record.tanggalSelesai ? dayjs(record.tanggalSelesai) : (record.tanggal ? dayjs(record.tanggal) : null),
        jamMulai: record.jamMulai ? dayjs(record.jamMulai, 'HH:mm') : null,
        jamSelesai: record.jamSelesai ? dayjs(record.jamSelesai, 'HH:mm') : null,
        status: record.status || "Belum Mulai",
      });
    } else {
      setIsEditing(false);
      setEditingId(null);
      form.resetFields();
      form.setFieldsValue({
        nama: ["Adi Dharma"],
        status: "Belum Mulai",
      });
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        tanggalMulai: values.tanggalMulai ? values.tanggalMulai.format('YYYY-MM-DD') : null,
        tanggalSelesai: values.tanggalSelesai ? values.tanggalSelesai.format('YYYY-MM-DD') : (values.tanggalMulai ? values.tanggalMulai.format('YYYY-MM-DD') : null),
        jamMulai: values.jamMulai ? values.jamMulai.format('HH:mm') : '',
        jamSelesai: values.jamSelesai ? values.jamSelesai.format('HH:mm') : '',
      };

      const url = isEditing ? `/api/pimpinan/${editingId}` : '/api/pimpinan';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        messageApi.success(isEditing ? "Jadwal pimpinan berhasil diubah" : "Jadwal pimpinan berhasil ditambahkan");
        setIsModalVisible(false);
        fetchJadwal();
      } else {
        messageApi.error(json.error || "Gagal menyimpan jadwal pimpinan");
      }
    } catch (e) {
      messageApi.error("Terjadi kesalahan sistem");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/pimpinan/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json.success) {
        messageApi.success("Jadwal pimpinan berhasil dihapus");
        fetchJadwal();
      } else {
        messageApi.error(json.error || "Gagal menghapus jadwal");
      }
    } catch (e) {
      messageApi.error("Terjadi kesalahan saat menghapus");
    }
  };

  const handleSendToGroup = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/pimpinan/send-group', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        messageApi.success(json.message || "Pesan berhasil dikirim via WhatsApp ke Sekretaris");
      } else {
        messageApi.error(json.error || "Gagal mengirim pesan");
      }
    } catch (e) {
      messageApi.error("Terjadi kesalahan saat mengirim pesan");
    } finally {
      setSending(false);
    }
  };

  const handleExportToOutlook = (record: Jadwal) => {
    try {
      const createIcsDate = (dateStr: string, timeStr?: string, isEnd = false) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-').map(Number);
        if (timeStr) {
          const [hour, minute] = timeStr.split(':').map(Number);
          const dt = new Date(year, month - 1, day, hour, minute);
          return dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        } else {
          const dt = new Date(year, month - 1, day);
          if (isEnd) {
            dt.setDate(dt.getDate() + 1);
          }
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, '0');
          const d = String(dt.getDate()).padStart(2, '0');
          return `${y}${m}${d}`;
        }
      };

      const dtStart = createIcsDate(
        record.tanggalMulai || record.tanggal,
        record.jamMulai
      );
      const dtEnd = createIcsDate(
        record.tanggalSelesai || record.tanggalMulai || record.tanggal,
        record.jamSelesai,
        !record.jamMulai
      );

      const organizerEmail = "admin@ojk.go.id";
      const organizerName = "Admin OJK";
      const attendees = (record.nama || [])
        .map(n => {
          const email = PEGAWAI_EMAILS[n] || "adi.dharma@ojk.go.id";
          return `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;CN=${n}:mailto:${email}`;
        })
        .join('\r\n');

      const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//KOSE OJK//Jadwal Pimpinan//ID",
        "CALSCALE:GREGORIAN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        `UID:jadwal-pimpinan-${record.id}@ojk.go.id`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${record.kegiatan}`,
        `LOCATION:${record.tempat}`,
        `DESCRIPTION:Jadwal Pimpinan: ${record.kegiatan}\\nTempat: ${record.tempat}\\nPeserta: ${(record.nama || []).join(', ')}`,
        `ORGANIZER;CN=${organizerName}:mailto:${organizerEmail}`,
        attendees,
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR"
      ].filter(Boolean).join("\r\n");

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Jadwal_Pimpinan_${record.kegiatan.replace(/\s+/g, '_')}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      messageApi.success("Berhasil mengunduh jadwal Outlook!");
    } catch (e) {
      console.error(e);
      messageApi.error("Gagal membuat file kalender");
    }
  };

  const columns = [
    {
      title: 'Nama',
      dataIndex: 'nama',
      key: 'nama',
      className: 'font-semibold text-slate-700 dark:text-slate-200',
      render: (val: string | string[]) => {
        const valArray = Array.isArray(val) ? val : [val];
        return valArray.filter(Boolean).join(', ') || 'Adi Dharma';
      }
    },
    {
      title: 'Kegiatan',
      dataIndex: 'kegiatan',
      key: 'kegiatan',
      className: 'text-slate-600 dark:text-slate-400'
    },
    {
      title: 'Tempat',
      dataIndex: 'tempat',
      key: 'tempat',
      className: 'text-slate-600 dark:text-slate-400'
    },
    {
      title: 'Waktu',
      key: 'waktu',
      render: (_: any, record: Jadwal) => {
        const d1 = record.tanggalMulai ? dayjs(record.tanggalMulai) : (record.tanggal ? dayjs(record.tanggal) : null);
        const d2 = record.tanggalSelesai ? dayjs(record.tanggalSelesai) : (record.tanggal ? dayjs(record.tanggal) : null);

        let dateDisplay = '-';
        if (d1) {
          const bulanIndo = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
          ];
          const d2Safe = d2 || d1;
          const d1Tgl = d1.format('DD');
          const d2Tgl = d2Safe.format('DD');
          const d1Bln = bulanIndo[d1.month()];
          const d2Bln = bulanIndo[d2Safe.month()];
          const d1Thn = d1.format('YYYY');
          const d2Thn = d2Safe.format('YYYY');

          if (d1.isSame(d2Safe, 'day')) {
            dateDisplay = `${d1Tgl} ${d1Bln} ${d1Thn}`;
          } else if (d1.isSame(d2Safe, 'month') && d1.isSame(d2Safe, 'year')) {
            dateDisplay = `${d1Tgl} - ${d2Tgl} ${d1Bln} ${d1Thn}`;
          } else if (d1.isSame(d2Safe, 'year')) {
            dateDisplay = `${d1Tgl} ${d1Bln} - ${d2Tgl} ${d2Bln} ${d1Thn}`;
          } else {
            dateDisplay = `${d1Tgl} ${d1Bln} ${d1Thn} - ${d2Tgl} ${d2Bln} ${d2Thn}`;
          }
        }

        return (
          <div>
            <div className="font-medium text-slate-700 dark:text-slate-300">
              {dateDisplay}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Jam',
      key: 'jam',
      render: (_: any, record: Jadwal) => (
        <span className="text-slate-600 dark:text-slate-400">
          {record.jamMulai ? `${record.jamMulai} - ${record.jamSelesai || 'Selesai'}` : '-'}
        </span>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: Jadwal) => {
        const displayStatus = record.status;
        let color = "default";
        if (displayStatus === "Selesai") color = "success";
        else if (displayStatus === "Dalam Proses") color = "processing";
        else if (displayStatus === "Diblokir") color = "error";
        else if (displayStatus === "Belum Mulai") color = "warning";

        return <Tag color={color}>{displayStatus || '-'}</Tag>;
      }
    },
    {
      title: 'Aksi',
      key: 'aksi',
      align: 'right' as const,
      render: (_: any, record: Jadwal) => {
        return (
          <div className="flex items-center justify-end gap-2">
            {(isAdmin || read) && (
              <button
                onClick={() => handleExportToOutlook(record)}
                className="px-2.5 py-1.5 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 rounded text-xs transition-colors cursor-pointer"
                title="Add to Calendar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
            )}
            {(isAdmin || update) && (
              <button
                onClick={() => showModal(record)}
                className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded text-xs transition-colors cursor-pointer"
                title="Edit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
            )}
            {(isAdmin || del) && (
              <Popconfirm
                title="Hapus Jadwal"
                description="Yakin ingin menghapus jadwal pimpinan ini?"
                onConfirm={() => handleDelete(record.id)}
                okText="Ya"
                cancelText="Batal"
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
        );
      }
    }
  ];

  const filteredJadwal = jadwal.filter(item => {
    if (!filterDate || !filterDate[0] || !filterDate[1]) return true;

    const [startFilter, endFilter] = filterDate;
    const itemStart = item.tanggalMulai ? dayjs(item.tanggalMulai) : (item.tanggal ? dayjs(item.tanggal) : null);
    const itemEnd = item.tanggalSelesai ? dayjs(item.tanggalSelesai) : (item.tanggal ? dayjs(item.tanggal) : null);

    if (!itemStart) return false;

    const startFilterStr = startFilter.format('YYYY-MM-DD');
    const endFilterStr = endFilter.format('YYYY-MM-DD');

    const iStartStr = itemStart.format('YYYY-MM-DD');
    const iEndStr = (itemEnd || itemStart).format('YYYY-MM-DD');

    return iStartStr <= endFilterStr && startFilterStr <= iEndStr;
  });

  const getTargetTomorrowStr = () => {
    const today = new Date();
    const current = new Date(today.getTime() + (7 * 60 * 60 * 1000));
    let targetDate = new Date(current.getTime() + (24 * 60 * 60 * 1000));
    let targetDateStr = targetDate.toISOString().split('T')[0];

    while (true) {
      const dayOfWeek = targetDate.getUTCDay();
      const isWeekend = dayOfWeek === 6 || dayOfWeek === 0;

      const adaJadwal = jadwal.some(j => {
        const start = j.tanggalMulai || j.tanggal;
        const end = j.tanggalSelesai || j.tanggalMulai || j.tanggal;
        return start <= targetDateStr && targetDateStr <= end;
      });

      if (adaJadwal || !isWeekend) {
        break;
      }
      targetDate = new Date(targetDate.getTime() + (24 * 60 * 60 * 1000));
      targetDateStr = targetDate.toISOString().split('T')[0];
    }
    return targetDateStr;
  };

  const targetTomorrowStr = getTargetTomorrowStr();
  const hasTomorrowData = jadwal.some(j => {
    const start = j.tanggalMulai || j.tanggal;
    const end = j.tanggalSelesai || j.tanggalMulai || j.tanggal;
    return start <= targetTomorrowStr && targetTomorrowStr <= end;
  });

  if (!isReady) {
    return <div className="p-8 text-center text-slate-500">Memuat izin akses...</div>;
  }

  if (!isAdmin && !read) {
    return (
      <div className="p-8">
        <Alert
          message="Akses Ditolak"
          description="Anda tidak memiliki hak akses untuk membuka halaman Jadwal Pimpinan ini."
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8 font-sans">
      {contextHolder}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
              Jadwal Pimpinan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Kelola jadwal kegiatan Pimpinan OJK Provinsi Banten
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="w-full sm:w-auto">
              <DatePicker.RangePicker
                className="w-full sm:w-auto"
                value={filterDate as any}
                onChange={(dates) => setFilterDate(dates as any)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(isAdmin || create) && (
                <Button
                  onClick={handleSendToGroup}
                  loading={sending}
                  disabled={!hasTomorrowData}
                  className="flex-1 sm:flex-none"
                  style={hasTomorrowData ? { backgroundColor: "#25D366", borderColor: "#25D366", color: "#fff" } : undefined}
                >
                  Kirim via WhatsApp
                </Button>
              )}
              {(isAdmin || create) && (
                <Button type="primary" onClick={() => showModal()} className="flex-1 sm:flex-none" style={{ backgroundColor: "#DA251C" }}>
                  Tambah Jadwal
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border-t-2 border-[#DA251C] overflow-x-auto">
          <Table
            columns={columns}
            dataSource={filteredJadwal}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
            className="[&_.ant-table-thead_th]:bg-slate-50 [&_.ant-table-thead_th]:dark:bg-slate-800 [&_.ant-table-thead_th]:text-slate-500 [&_.ant-table-thead_th]:dark:text-slate-400 [&_.ant-table-thead_th]:font-semibold [&_.ant-table-tbody_td]:border-b [&_.ant-table-tbody_td]:border-slate-100 [&_.ant-table-tbody_td]:dark:border-slate-800/50"
          />
        </div>
      </div>

      <Modal
        title={isEditing ? "Edit Jadwal Pimpinan" : "Tambah Jadwal Pimpinan"}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        forceRender
        centered
        width={560}
        style={{ maxWidth: 'calc(100vw - 32px)' }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ nama: ["Adi Dharma"], status: "Belum Mulai" }}
          className="mt-2"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3.5">
            <Form.Item
              name="nama"
              label="Nama Pimpinan"
              rules={[{ required: true, message: 'Harap pilih nama' }]}
            >
              <Select
                mode="multiple"
                options={PEGAWAI_OPTIONS}
                placeholder="Pilih Nama"
              />
            </Form.Item>

            <Form.Item
              name="status"
              label="Status"
              rules={[{ required: true, message: 'Harap pilih status' }]}
            >
              <Select options={STATUS_OPTIONS} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3.5">
            <Form.Item
              name="kegiatan"
              label="Kegiatan / Acara"
              rules={[{ required: true, message: 'Harap isi nama kegiatan' }]}
            >
              <Input placeholder="Contoh: Rapat Koordinasi internal" />
            </Form.Item>

            <Form.Item
              name="tempat"
              label="Tempat"
              rules={[{ required: true, message: 'Harap isi tempat kegiatan' }]}
            >
              <Input placeholder="Contoh: Ruang Rapat lt. 2" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3.5">
            <Form.Item
              name="tanggalMulai"
              label="Tanggal Mulai"
              rules={[{ required: true, message: 'Pilih tanggal mulai' }]}
            >
              <DatePicker className="w-full" format="YYYY-MM-DD" />
            </Form.Item>

            <Form.Item
              name="tanggalSelesai"
              label="Tanggal Selesai"
              rules={[{ required: true, message: 'Pilih tanggal selesai' }]}
            >
              <DatePicker className="w-full" format="YYYY-MM-DD" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3.5">
            <Form.Item
              name="jamMulai"
              label="Jam Mulai (Opsional)"
            >
              <TimePicker className="w-full" format="HH:mm" />
            </Form.Item>

            <Form.Item
              name="jamSelesai"
              label="Jam Selesai (Opsional)"
            >
              <TimePicker className="w-full" format="HH:mm" />
            </Form.Item>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button onClick={handleCancel} disabled={submitting}>
              Batal
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{ backgroundColor: "#DA251C" }}
            >
              Simpan
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

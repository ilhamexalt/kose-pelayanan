"use client";

import React, { useState, useEffect } from "react";
import { Table, Tag, Popconfirm, message, Button, Modal, Form, Input, Select, DatePicker, TimePicker, Alert } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { usePermissions } from "@/hooks/usePermissions";

interface Jadwal {
  id: string;
  nama: string[];
  kegiatan: string;
  tempat: string;
  tanggal: string;
  jamMulai?: string;
  jamSelesai?: string;
  status: string;
  displayStatus?: string;
}

const PEGAWAI_OPTIONS = [
  { value: "DKA", label: "DKA - Dendy Kurniadi Amintapura" },
  { value: "RFB", label: "RFB - Rija Fathul Bari" },
  { value: "DS", label: "DS - Dwi Savira" },
  { value: "SUW", label: "SUW - Suwariyanti" },
  { value: "TAD", label: "TAD - Tubagus Aria Dwitama" },
  { value: "AIM", label: "AIM - Aried Ihsan Mauludin" },
  { value: "RE", label: "RE - Reni Endriana" },
  { value: "AR", label: "AR - Audi Rumpoko" },
  { value: "MFF", label: "MFF - M. Fikri Fauzan" },
];

const STATUS_OPTIONS = [
  { value: "Belum Mulai", label: "Belum Mulai" },
  { value: "Dalam Proses", label: "Dalam Proses" },
  { value: "Diblokir", label: "Diblokir" },
  { value: "Selesai", label: "Selesai" },
];

export default function JadwalPepkLmstPage() {
  const [jadwal, setJadwal] = useState<Jadwal[]>([]);
  const [loading, setLoading] = useState(true);
  const { create, read, update, delete: del, isAdmin, isReady } = usePermissions('/jadwal-pepk-lmst');

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
      const res = await fetch('/api/jadwal-pepk-lmst');
      const json = await res.json();
      if (json.success) {
        setJadwal(json.data);
      }
    } catch (e) {
      messageApi.error("Gagal mengambil data jadwal");
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
        nama: record.nama,
        kegiatan: record.kegiatan,
        tempat: record.tempat,
        tanggal: record.tanggal ? dayjs(record.tanggal) : null,
        jamMulai: record.jamMulai ? dayjs(record.jamMulai, 'HH:mm') : null,
        jamSelesai: record.jamSelesai ? dayjs(record.jamSelesai, 'HH:mm') : null,
        status: record.status,
      });
    } else {
      setIsEditing(false);
      setEditingId(null);
      form.resetFields();
      form.setFieldsValue({ status: "Belum Mulai" });
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const payload = {
        nama: values.nama,
        kegiatan: values.kegiatan,
        tempat: values.tempat,
        tanggal: values.tanggal ? values.tanggal.format('YYYY-MM-DD') : '',
        jamMulai: values.jamMulai ? values.jamMulai.format('HH:mm') : '',
        jamSelesai: values.jamSelesai ? values.jamSelesai.format('HH:mm') : '',
        status: values.status || 'Belum Mulai',
      };

      const url = isEditing ? `/api/jadwal-pepk-lmst/${editingId}` : '/api/jadwal-pepk-lmst';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        messageApi.success(isEditing ? 'Jadwal berhasil diperbarui' : 'Jadwal berhasil ditambahkan');
        setIsModalVisible(false);
        form.resetFields();
        fetchJadwal();
      } else {
        messageApi.error(json.error || 'Gagal menyimpan data');
      }
    } catch (e) {
      messageApi.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/jadwal-pepk-lmst/${id}`, { method: 'DELETE' });
      if (res.ok) {
        messageApi.success("Jadwal dihapus");
        fetchJadwal();
      }
    } catch (e) {
      messageApi.error("Gagal menghapus jadwal");
    }
  };

  const handleSendToGroup = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/jadwal-pepk-lmst/send-group', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        messageApi.success(json.message || "Pesan berhasil dikirim ke grup");
      } else {
        messageApi.error(json.error || "Gagal mengirim pesan");
      }
    } catch (e) {
      messageApi.error("Terjadi kesalahan saat mengirim pesan");
    } finally {
      setSending(false);
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
        return valArray.filter(Boolean).join(', ');
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
        const dateStr = record.tanggal ? dayjs(record.tanggal).format('DD MMM YYYY') : '-';
        let timeStr = '';
        if (record.jamMulai && record.jamSelesai) {
          timeStr = `${record.jamMulai} - ${record.jamSelesai}`;
        } else if (record.jamMulai) {
          timeStr = record.jamMulai;
        } else if (record.jamSelesai) {
          timeStr = record.jamSelesai;
        }

        return (
          <div className="text-sm text-slate-700 dark:text-slate-300">
            <div>{dateStr}</div>
            <div className="text-slate-500 dark:text-slate-400">{timeStr}</div>
          </div>
        );
      }
    },
    {
      title: 'Status',
      key: 'status',
      align: 'center' as const,
      render: (_: any, record: any) => {
        const status = record.displayStatus || record.status;
        let color = 'default';
        if (status === 'Selesai') color = 'success';
        else if (status === 'Dalam Proses') color = 'processing';
        else if (status === 'Belum Mulai') color = 'default';
        else if (status === 'Diblokir') color = 'error';
        else if (status === 'Overdue') color = 'error';
        return <Tag color={color} className="px-2 py-0.5 rounded-md font-semibold">{status}</Tag>;
      }
    },
    {
      title: 'Aksi',
      key: 'action',
      align: 'right' as const,
      render: (_: any, record: Jadwal) => (
        <div className="flex items-center justify-end gap-2">
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
  ];

  if (!isReady) return null;

  const tomorrowStr = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const hasTomorrowData = jadwal.some(j => j.tanggal === tomorrowStr);

  const filteredJadwal = jadwal.map(j => {
    let displayStatus = j.status;
    if (j.tanggal && j.status !== 'Selesai') {
      // Jika jadwalnya sebelum hari ini (kemarin atau sebelumnya), maka Overdue
      const isPast = dayjs(j.tanggal).startOf('day').isBefore(dayjs().startOf('day'));
      if (isPast) displayStatus = 'Overdue';
    }
    return { ...j, displayStatus };
  }).filter(j => {
    if (filterDate && filterDate[0] && filterDate[1] && j.tanggal) {
      const date = dayjs(j.tanggal);
      const start = filterDate[0].startOf('day');
      const end = filterDate[1].endOf('day');
      return (date.isAfter(start) || date.isSame(start, 'day')) && (date.isBefore(end) || date.isSame(end, 'day'));
    }
    return true;
  });

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 font-sans">
      {contextHolder}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col mb-6 gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
            Jadwal PEPK & LMST
          </h1>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700/50">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Keterangan Kode Nama:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 text-xs text-slate-600 dark:text-slate-400">
              {PEGAWAI_OPTIONS.map(opt => (
                <div key={opt.value}>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{opt.value}</span> - {opt.label.split(' - ')[1]}
                </div>
              ))}
            </div>
          </div>

          <Alert
            title="Perhatian"
            description="Jadwal dengan status berwarna merah (Overdue) menandakan jadwal yang belum terselesaikan. Harap segera perbarui status jadwal tersebut sesuai kondisi sebenarnya."
            type="warning"
            showIcon
            className="text-sm"
          />

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <DatePicker.RangePicker
                className="w-full sm:w-auto"
                value={filterDate as any}
                onChange={(dates) => setFilterDate(dates as any)}
              />
            </div>
            <div className="flex gap-2">
              {(isAdmin || create) && (
                <Button
                  onClick={handleSendToGroup}
                  loading={sending}
                  disabled={!hasTomorrowData}
                  style={hasTomorrowData ? { backgroundColor: "#25D366", borderColor: "#25D366", color: "#fff" } : undefined}
                >
                  Kirim ke Grup
                </Button>
              )}
              {(isAdmin || create) && (
                <Button type="primary" onClick={() => showModal()} style={{ backgroundColor: "#DA251C" }}>
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
            className="[&_.ant-table-thead_th]:bg-slate-50 [&_.ant-table-thead_th]:dark:bg-slate-800 [&_.ant-table-thead_th]:text-slate-500 [&_.ant-table-thead_th]:dark:text-slate-400 [&_.ant-table-thead_th]:font-semibold [&_.ant-table-tbody_td]:border-b [&_.ant-table-tbody_td]:border-slate-100 [&_.ant-table-tbody_td]:dark:border-slate-800/50"
          />
        </div>
      </div>

      <Modal
        title={isEditing ? "Edit Jadwal" : "Tambah Jadwal"}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        forceRender
        centered
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="mt-4"
        >
          <Form.Item
            name="nama"
            label="Nama"
            rules={[{ required: true, message: 'Harap pilih nama' }]}
          >
            <Select
              mode="multiple"
              options={PEGAWAI_OPTIONS}
              placeholder="Pilih Nama"
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="kegiatan"
            label="Kegiatan"
            rules={[{ required: true, message: 'Harap isi kegiatan' }]}
          >
            <Input placeholder="Masukkan nama kegiatan" />
          </Form.Item>

          <Form.Item
            name="tempat"
            label="Tempat"
            rules={[{ required: true, message: 'Harap isi tempat' }]}
          >
            <Input placeholder="Masukkan tempat kegiatan" />
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Form.Item
              name="tanggal"
              label="Tanggal"
              rules={[{ required: true, message: 'Harap pilih tanggal' }]}
            >
              <DatePicker className="w-full" format="YYYY-MM-DD" />
            </Form.Item>

            <Form.Item
              name="jamMulai"
              label="Jam Mulai"
            >
              <TimePicker className="w-full" format="HH:mm" />
            </Form.Item>

            <Form.Item
              name="jamSelesai"
              label="Jam Selesai"
            >
              <TimePicker className="w-full" format="HH:mm" />
            </Form.Item>
          </div>

          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Harap pilih status' }]}
          >
            <Select options={STATUS_OPTIONS} />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={handleCancel}>Batal</Button>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ backgroundColor: "#DA251C" }}>
              {isEditing ? 'Simpan Perubahan' : 'Tambah Jadwal'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

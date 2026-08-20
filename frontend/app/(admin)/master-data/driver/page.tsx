"use client";

import { useEffect, useState } from "react";
import { Button, Form, Input, Modal, Popconfirm, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { usePermissions } from "@/hooks/usePermissions";

interface Driver {
    id: string;
    nama: string;
    platNomor: string;
    nomorTelepon: string;
}

interface DriverFormValues {
    nama: string;
    platNomor: string;
    nomorTelepon: string;
}

export default function DriverPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const { create, read, update, delete: del, isAdmin, isReady } = usePermissions('/master-data/driver');
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm<DriverFormValues>();

    const canCreate = isAdmin || create;
    const canUpdate = isAdmin || update;
    const canDelete = isAdmin || del;

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/driver');
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Gagal mengambil data driver');
            }
            setDrivers(result.data);
        } catch (error) {
            messageApi.error(error instanceof Error ? error.message : 'Gagal mengambil data driver');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isReady && read) {
            fetchDrivers();
        } else if (isReady) {
            setLoading(false);
        }
    }, [isReady, read]);

    const openCreateModal = () => {
        setEditingDriver(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEditModal = (driver: Driver) => {
        setEditingDriver(driver);
        form.setFieldsValue(driver);
        setModalOpen(true);
    };

    const handleSubmit = async (values: DriverFormValues) => {
        setSubmitting(true);
        try {
            const response = await fetch(editingDriver ? `/api/driver/${editingDriver.id}` : '/api/driver', {
                method: editingDriver ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Gagal menyimpan data driver');
            }
            messageApi.success(editingDriver ? 'Data driver berhasil diubah' : 'Driver berhasil ditambahkan');
            setModalOpen(false);
            await fetchDrivers();
        } catch (error) {
            messageApi.error(error instanceof Error ? error.message : 'Gagal menyimpan data driver');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`/api/driver/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Gagal menghapus data driver');
            }
            messageApi.success('Data driver berhasil dihapus');
            await fetchDrivers();
        } catch (error) {
            messageApi.error(error instanceof Error ? error.message : 'Gagal menghapus data driver');
        }
    };

    const columns: ColumnsType<Driver> = [
        {
            title: 'No',
            key: 'index',
            width: 70,
            render: (_value, _record, index) => index + 1,
        },
        { title: 'Nama', dataIndex: 'nama', key: 'nama' },
        { title: 'Plat Nomor', dataIndex: 'platNomor', key: 'platNomor' },
        { title: 'Nomor Telepon', dataIndex: 'nomorTelepon', key: 'nomorTelepon' },
        ...(canUpdate || canDelete
            ? [{
                title: 'Aksi',
                align: 'right' as const,
                fixed: 'right' as const,
                key: 'action',
                render: (_value: unknown, record: Driver) => (
                    <Space>
                        {canUpdate &&
                            <button
                                onClick={() => openEditModal(record)}
                                className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded text-xs transition-colors cursor-pointer"
                                title="Edit"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>

                            // <Button size="small" title="Edit" onClick={() => openEditModal(record)}>
                            //     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            // </Button>
                        }
                        {canDelete && (
                            <Popconfirm
                                title="Hapus data driver?"
                                description="Data yang dihapus tidak dapat dikembalikan."
                                okText="Hapus"
                                cancelText="Batal"
                                onConfirm={() => handleDelete(record.id)}
                            >
                                {/* <Button size="small" title="Hapus" danger>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </Button> */}

                                <button
                                    className="px-2.5 py-1.5 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded text-xs transition-colors cursor-pointer"
                                    title="Hapus"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </Popconfirm>
                        )}
                    </Space>
                ),
            }] : []),
    ];

    return (
        <div className="w-full p-4 sm:p-6 lg:p-8 font-sans">
            {contextHolder}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="mb-3">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Data Driver</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Kelola informasi driver kendaraan operasional.</p>
                </div>
                {canCreate && <Button type="primary" onClick={openCreateModal} style={{ backgroundColor: '#DA251C', marginBottom: 13 }}>Tambah Driver</Button>}
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border-t-2 border-[#DA251C]">
                <Table
                    columns={columns}
                    dataSource={drivers}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 'max-content' }}
                    className="[&_.ant-table-thead_th]:bg-slate-50 [&_.ant-table-thead_th]:dark:bg-slate-800 [&_.ant-table-thead_th]:text-slate-500 [&_.ant-table-thead_th]:dark:text-slate-400 [&_.ant-table-thead_th]:font-semibold [&_.ant-table-tbody_td]:border-b [&_.ant-table-tbody_td]:border-slate-100 [&_.ant-table-tbody_td]:dark:border-slate-800/50"
                />
            </div>
            <Modal
                title={editingDriver ? 'Edit Driver' : 'Tambah Driver'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
                centered
                width={520}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
                    <Form.Item name="nama" label="Nama" rules={[{ required: true, whitespace: true, message: 'Nama wajib diisi' }]}>
                        <Input placeholder="Masukkan nama driver" maxLength={100} />
                    </Form.Item>
                    <Form.Item name="platNomor" label="Plat Nomor" rules={[{ required: true, whitespace: true, message: 'Plat nomor wajib diisi' }]}>
                        <Input placeholder="Contoh: B 1234 XYZ" maxLength={20} />
                    </Form.Item>
                    <Form.Item
                        name="nomorTelepon"
                        label="Nomor Telepon"
                        rules={[{ required: true, whitespace: true, message: 'Nomor telepon wajib diisi' }, { pattern: /^[0-9+\-\s()]+$/, message: 'Format nomor telepon tidak valid' }]}
                    >
                        <Input placeholder="Contoh: 081234567890" maxLength={20} />
                    </Form.Item>
                    <div className="flex justify-end gap-2">
                        <Button onClick={() => setModalOpen(false)}>Batal</Button>
                        <Button type="primary" htmlType="submit" loading={submitting} style={{ backgroundColor: '#DA251C' }}>
                            {editingDriver ? 'Simpan Perubahan' : 'Tambah Driver'}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    )
}
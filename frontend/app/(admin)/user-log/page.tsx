"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { message, Modal, Table, Badge, Input, Button } from "antd";
import type { ColumnsType } from "antd/es/table";

export default function UserLogPage() {
    const [messageApi, messageHolder] = message.useMessage();
    const [modalApi, modalHolder] = Modal.useModal();
    const { user } = useAuth();

    // Asumsi '/user-log' atau bisa menyesuaikan jika ada permission khusus
    const { isAdmin, isReady } = usePermissions('/user-log');

    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (isReady && user && isAdmin) {
            fetchLogs();
        } else if (isReady && !isAdmin) {
            setIsLoading(false);
        }
    }, [isReady, user, isAdmin]);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/user-log');
            const json = await res.json();
            if (json.success) {
                setLogs(json.data);
            } else {
                messageApi.error(json.error || 'Gagal mengambil data user log');
            }
        } catch (error) {
            console.error("Failed to fetch user logs", error);
            messageApi.error("Terjadi kesalahan koneksi");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKillSession = (userId: string, userName: string) => {
        modalApi.confirm({
            title: 'Konfirmasi Kill Session',
            content: `Apakah Anda yakin ingin memutus sesi untuk user ${userName}? User ini akan otomatis keluar dari aplikasi.`,
            okText: 'Ya, Putus Sesi',
            okType: 'danger',
            cancelText: 'Batal',
            onOk: async () => {
                try {
                    const res = await fetch('/api/user-log/kill', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId })
                    });
                    const json = await res.json();
                    if (json.success) {
                        messageApi.success(`Sesi user ${userName} berhasil diputus.`);
                        fetchLogs();
                    } else {
                        messageApi.error(json.error || 'Gagal memutus sesi');
                    }
                } catch (error) {
                    messageApi.error("Terjadi kesalahan koneksi");
                }
            }
        });
    };

    const filteredLogs = logs.filter(log => {
        const query = searchQuery.toLowerCase();
        return (
            (log.nama || '').toLowerCase().includes(query) ||
            (log.nip || '').toString().toLowerCase().includes(query) ||
            (log.role || '').toLowerCase().includes(query)
        );
    }).sort((a, b) => {
        // Urutkan yang aktif di atas, lalu berdasarkan last_login terbaru
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;

        const timeA = a.last_login ? new Date(a.last_login).getTime() : 0;
        const timeB = b.last_login ? new Date(b.last_login).getTime() : 0;
        return timeB - timeA;
    });

    const columns: ColumnsType<any> = [
        {
            title: 'No',
            key: 'no',
            width: 60,
            render: (text, record, index) => (currentPage - 1) * 10 + index + 1,
        },
        {
            title: 'Nama',
            key: 'nama',
            render: (_, record) => (
                <div>
                    <div className="text-sm text-slate-900 dark:text-slate-100 font-medium capitalize">
                        {record.nama}
                    </div>
                </div>
            )
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (text) => <div className="text-sm text-slate-500 dark:text-slate-400">{text || '-'}</div>,
        },
        {
            title: 'Status Login',
            key: 'status',
            render: (_, record) => (
                <Badge
                    status={record.is_active ? 'success' : 'default'}
                    text={<span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{record.is_active ? 'Sedang Aktif' : 'Tidak Aktif'}</span>}
                />
            ),
        },
        {
            title: 'Terakhir Login',
            key: 'last_login',
            render: (_, record) => (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                    {record.last_login
                        ? new Date(record.last_login).toLocaleString('id-ID', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })
                        : '-'}
                </div>
            )
        },
        {
            title: 'Aksi',
            key: 'aksi',
            align: 'right',
            render: (_, record) => {
                // Jangan izinkan kill session untuk admin master
                const isMaster = record.nip === 'admin' || record.id === 'admin';
                return (
                    <div className="flex justify-end">
                        <button
                            onClick={() => handleKillSession(record.id, record.nama)}
                            disabled={!record.is_active || isMaster}
                            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors border-none ${record.is_active && !isMaster
                                ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 cursor-pointer shadow-sm'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                                }`}
                        >
                            Kill Session
                        </button>
                    </div>
                );
            }
        }
    ];

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

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090d16] p-4">
                <div className="text-center bg-white dark:bg-[#0f172a] p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Akses Ditolak</h2>
                    <p className="text-slate-500 dark:text-slate-400">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {messageHolder}
            {modalHolder}
            <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">User Log & Session</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Pantau status login pengguna dan kelola sesi aktif.</p>
                </div>

                {/* Filter & Search */}
                <div className="bg-white dark:bg-[#0f172a] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 transition-colors duration-300">
                    <div className="flex w-full md:w-1/2 gap-2">
                        <div className="relative flex-1">
                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="text"
                                placeholder="Cari Nama, NIP, atau Role..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setSearchQuery(searchInput);
                                        setCurrentPage(1);
                                    }
                                }}
                                className="w-full h-[38px] pl-10 pr-4 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                            />
                        </div>
                        <button
                            onClick={() => {
                                setSearchQuery(searchInput);
                                setCurrentPage(1);
                            }}
                            className="h-[38px] px-4 bg-[#DA251C] hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer border-none flex items-center justify-center shadow-sm shrink-0"
                        >
                            Cari
                        </button>
                        {searchQuery && (
                            <button
                                onClick={() => {
                                    setSearchInput('');
                                    setSearchQuery('');
                                    setCurrentPage(1);
                                }}
                                className="h-[38px] px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm transition-colors cursor-pointer border-none flex items-center justify-center shrink-0"
                                title="Reset Cari"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    <div className="w-full md:w-auto">
                        <button
                            onClick={() => fetchLogs()}
                            className="flex items-center gap-2 px-3 py-2 h-[38px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors border-none cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Table Log */}
                <div className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-2 overflow-hidden transition-colors duration-300">
                    <Table
                        size="small"
                        dataSource={filteredLogs}
                        columns={columns}
                        rowKey="id"
                        pagination={{
                            current: currentPage,
                            pageSize: 10,
                            total: filteredLogs.length,
                            onChange: (page) => setCurrentPage(page),
                            showTotal: (total, range) => `Menampilkan ${range[0]} - ${range[1]} dari ${total} data`
                        }}
                        scroll={{ x: 'max-content' }}
                    />
                </div>
            </main>
        </>
    );
}
"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { message, DatePicker, Pagination } from "antd";

const { RangePicker } = DatePicker;

interface SurveyData {
    id: string;
    pelayananId: string;
    layananName: string;
    namaPegawai: string;
    kebersihan: number;
    keramahan: number;
    solusi: number;
    informasi: number;
    createdAt: number;
}

export default function SurveiKepuasan() {
    const [surveys, setSurveys] = useState<SurveyData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [messageApi, contextHolder] = message.useMessage();
    
    // Filters and pagination state
    const [selectedPegawai, setSelectedPegawai] = useState("Semua");
    const [dateRange, setDateRange] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        fetchSurveys();
    }, []);

    const fetchSurveys = async () => {
        try {
            const res = await fetch('/api/penilaian');
            const data = await res.json();
            if (data.success) {
                const processed = data.data
                    .map((s: any) => ({
                        ...s,
                        namaPegawai: (s.namaPegawai || '').replace(/\b\w/g, (c: string) => c.toUpperCase())
                    }))
                    .sort((a: any, b: any) => b.createdAt - a.createdAt);
                setSurveys(processed);
            } else {
                messageApi.error('Gagal mengambil data survei');
            }
        } catch (error) {
            messageApi.error('Terjadi kesalahan jaringan');
        } finally {
            setIsLoading(false);
        }
    };

    const getEmojiAndText = (score: number) => {
        switch (score) {
            case 3:
                return <span className="flex items-center gap-2"><span>😄</span> Baik</span>;
            case 2:
                return <span className="flex items-center gap-2"><span>😐</span> Cukup</span>;
            case 1:
                return <span className="flex items-center gap-2"><span>😞</span> Kurang</span>;
            default:
                return <span>-</span>;
        }
    };

    const getKepuasanEmoji = (totalScore: number) => {
        const avg = totalScore / 4;
        if (avg >= 2.5) return <span className="text-2xl">😍</span>;
        if (avg >= 2.0) return <span className="text-2xl">😊</span>;
        if (avg >= 1.5) return <span className="text-2xl">😐</span>;
        return <span className="text-2xl">😞</span>;
    };

    const handlePegawaiChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedPegawai(e.target.value);
        setCurrentPage(1);
    };

    const handleDateRangeChange = (dates: any) => {
        setDateRange(dates);
        setCurrentPage(1);
    };

    const uniquePegawai = Array.from(new Set(surveys.map(s => s.namaPegawai))).sort();
    
    // Apply filters
    const filteredSurveys = surveys.filter(s => {
        if (selectedPegawai !== "Semua" && s.namaPegawai !== selectedPegawai) {
            return false;
        }
        
        if (dateRange && dateRange[0] && dateRange[1]) {
            const start = dateRange[0].startOf('day').valueOf();
            const end = dateRange[1].endOf('day').valueOf();
            if (s.createdAt < start || s.createdAt > end) {
                return false;
            }
        }
        
        return true;
    });

    // Apply pagination
    const paginatedSurveys = filteredSurveys.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const exportExcel = () => {
        const dataToExport = filteredSurveys.map((s) => ({
            Tanggal: new Date(s.createdAt).toLocaleString('id-ID', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }).replace(/\./g, ':'),
            'Nama Pegawai': s.namaPegawai,
            'Kebersihan Loket': s.kebersihan === 3 ? 'Baik' : s.kebersihan === 2 ? 'Cukup' : 'Kurang',
            'Keramahan Petugas': s.keramahan === 3 ? 'Baik' : s.keramahan === 2 ? 'Cukup' : 'Kurang',
            'Solusi Pelayanan': s.solusi === 3 ? 'Baik' : s.solusi === 2 ? 'Cukup' : 'Kurang',
            'Informasi Pelayanan': s.informasi === 3 ? 'Baik' : s.informasi === 2 ? 'Cukup' : 'Kurang',
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Survei Kepuasan");
        XLSX.writeFile(wb, "Data_Survei_Kepuasan.xlsx");
    };

    // Calculate Stats based on filtered data
    let totalSkor = 0;
    const pegawaiCount: Record<string, number> = {};

    filteredSurveys.forEach(s => {
        totalSkor += (s.kebersihan + s.keramahan + s.solusi + s.informasi);
        pegawaiCount[s.namaPegawai] = (pegawaiCount[s.namaPegawai] || 0) + 1;
    });

    const sortedPegawai = Object.entries(pegawaiCount).sort((a, b) => b[1] - a[1]);
    const top1 = sortedPegawai.length > 0 ? sortedPegawai[0] : ['-', 0];
    const top2 = sortedPegawai.length > 1 ? sortedPegawai[1] : ['-', 0];

    const totalSurvei = filteredSurveys.length;
    const indeksKepuasan = totalSurvei > 0 ? Math.round((totalSkor / (totalSurvei * 12)) * 100) : 0;

    if (isLoading) {
        return <div className="p-8 text-center text-slate-600">Memuat data survei...</div>;
    }

    return (
        <>
            {contextHolder}
            <div className="p-8 bg-[#f8fafc] min-h-screen">
                <h1 className="text-3xl font-bold text-slate-800 mb-1">Dashboard Peningkatan Pelayanan</h1>
                <p className="text-slate-500 mb-8 text-sm">Monitoring Survei Kepuasan Konsumen</p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-[#4b5563] rounded-xl p-6 text-white shadow-sm flex flex-col justify-between">
                        <h3 className="text-slate-200 text-sm font-medium mb-2 line-clamp-1 capitalize">{top1[0]}</h3>
                        <p className="text-4xl font-bold">{top1[1]}</p>
                    </div>

                    <div className="bg-[#4b5563] rounded-xl p-6 text-white shadow-sm flex flex-col justify-between">
                        <h3 className="text-slate-200 text-sm font-medium mb-2 line-clamp-1 capitalize">{top2[0]}</h3>
                        <p className="text-4xl font-bold">{top2[1]}</p>
                    </div>

                    <div className="bg-[#0ea5e9] rounded-xl p-6 text-white shadow-sm flex flex-col justify-between">
                        <h3 className="text-blue-100 text-sm font-medium mb-2">Total Survei</h3>
                        <p className="text-4xl font-bold">{totalSurvei}</p>
                    </div>

                    <div className="bg-[#ef4444] rounded-xl p-6 text-white shadow-sm flex flex-col justify-between">
                        <h3 className="text-red-100 text-sm font-medium mb-2">Indeks Kepuasan</h3>
                        <p className="text-4xl font-bold">{indeksKepuasan}%</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 mb-6">
                    <select
                        className="border border-slate-300 rounded-lg px-4 py-2 bg-white text-slate-700 text-sm outline-none focus:border-blue-500 w-40"
                        value={selectedPegawai}
                        onChange={handlePegawaiChange}
                    >
                        <option value="Semua">Semua</option>
                        {uniquePegawai.map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                    
                    <RangePicker 
                        onChange={handleDateRangeChange}
                        className="py-2 px-4 rounded-lg border-slate-300 w-64"
                    />

                    <button
                        onClick={exportExcel}
                        className="bg-[#16a34a] hover:bg-green-700 text-white px-6 py-2 text-sm rounded-lg font-medium transition-colors"
                    >
                        Export Excel
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-800">Data Hasil Survei</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="p-4 font-bold text-slate-800 text-sm whitespace-nowrap">Tanggal</th>
                                    <th className="p-4 font-bold text-slate-800 text-sm whitespace-nowrap">Nama Pegawai</th>
                                    <th className="p-4 font-bold text-slate-800 text-sm whitespace-nowrap">Kebersihan Loket</th>
                                    <th className="p-4 font-bold text-slate-800 text-sm whitespace-nowrap">Keramahan Petugas</th>
                                    <th className="p-4 font-bold text-slate-800 text-sm whitespace-nowrap">Solusi Pelayanan</th>
                                    <th className="p-4 font-bold text-slate-800 text-sm whitespace-nowrap">Informasi Pelayanan</th>
                                    <th className="p-4 font-bold text-slate-800 text-sm whitespace-nowrap text-center">Kepuasan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedSurveys.map((s, idx) => (
                                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-sm text-slate-700">
                                            {new Date(s.createdAt).toLocaleString('id-ID', {
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            }).replace(/\./g, ':')}
                                        </td>
                                        <td className="p-4 text-sm text-slate-700 font-medium">{s.namaPegawai}</td>
                                        <td className="p-4 text-sm text-slate-700">{getEmojiAndText(s.kebersihan)}</td>
                                        <td className="p-4 text-sm text-slate-700">{getEmojiAndText(s.keramahan)}</td>
                                        <td className="p-4 text-sm text-slate-700">{getEmojiAndText(s.solusi)}</td>
                                        <td className="p-4 text-sm text-slate-700">{getEmojiAndText(s.informasi)}</td>
                                        <td className="p-4 text-center">
                                            {getKepuasanEmoji(s.kebersihan + s.keramahan + s.solusi + s.informasi)}
                                        </td>
                                    </tr>
                                ))}

                                {paginatedSurveys.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-slate-500 text-sm">
                                            Belum ada data survei
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {filteredSurveys.length > 0 && (
                        <div className="p-4 border-t border-slate-100 flex justify-end">
                            <Pagination
                                current={currentPage}
                                total={filteredSurveys.length}
                                pageSize={pageSize}
                                onChange={(page) => setCurrentPage(page)}
                                showSizeChanger={false}
                            />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
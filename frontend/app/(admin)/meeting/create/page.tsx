"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Select, TimePicker, Calendar, Input, InputNumber, Button, DatePicker, message } from "antd";
import dayjs, { Dayjs } from "dayjs";

export default function CreateMeetingPage() {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();

  const [pesertaInternal, setPesertaInternal] = useState<{ jumlah: number | null, jabatan: string }[]>([{ jumlah: 0, jabatan: '' }]);
  const [pesertaEksternal, setPesertaEksternal] = useState<{ jumlah: number | null, jabatan: string }[]>([{ jumlah: 0, jabatan: '' }]);

  const [ruang, setRuang] = useState<string | null>(null);
  const [waktu, setWaktu] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [tanggal, setTanggal] = useState<Dayjs>(dayjs());

  const [instansi, setInstansi] = useState<string>('');
  const [keterangan, setKeterangan] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!ruang || !waktu || !waktu[0] || !waktu[1] || !tanggal || !instansi) {
      messageApi.error("Harap lengkapi Instansi, Ruang, Waktu Penggunaan, dan Tanggal!");
      return;
    }

    setLoading(true);
    try {
      const selectedDate = tanggal.format("YYYY-MM-DD");
      const startTime = waktu[0].format("HH:mm");
      const endTime = waktu[1].format("HH:mm");

      const res = await fetch('/api/meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruang,
          tanggal: selectedDate,
          waktuMulai: startTime,
          waktuSelesai: endTime,
          instansi,
          pesertaInternal,
          pesertaEksternal,
          keterangan
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Gagal menyimpan jadwal');
      }

      messageApi.success("Jadwal berhasil disimpan!");
      router.push("/meeting");
    } catch (error: any) {
      messageApi.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addPesertaInternal = () => setPesertaInternal([...pesertaInternal, { jumlah: 0, jabatan: '' }]);
  const updatePesertaInternal = (index: number, field: 'jumlah' | 'jabatan', value: any) => {
    const newList = [...pesertaInternal];
    newList[index] = { ...newList[index], [field]: value };
    setPesertaInternal(newList);
  };
  const removePesertaInternal = (index: number) => {
    if (pesertaInternal.length > 1) {
      setPesertaInternal(pesertaInternal.filter((_, i) => i !== index));
    }
  };

  const addPesertaEksternal = () => setPesertaEksternal([...pesertaEksternal, { jumlah: 0, jabatan: '' }]);
  const updatePesertaEksternal = (index: number, field: 'jumlah' | 'jabatan', value: any) => {
    const newList = [...pesertaEksternal];
    newList[index] = { ...newList[index], [field]: value };
    setPesertaEksternal(newList);
  };
  const removePesertaEksternal = (index: number) => {
    if (pesertaEksternal.length > 1) {
      setPesertaEksternal(pesertaEksternal.filter((_, i) => i !== index));
    }
  };

  return (
    <>
      {contextHolder}
      <div className="min-h-screen bg-slate-50 dark:bg-[#020817] p-4 sm:p-6 lg:p-8 transition-colors duration-300 font-sans">
        <div className="max-w-6xl mx-auto">

          {/* Header Section */}
          <div className="bg-[#8b1510] rounded-xl p-6 mb-6 shadow-sm flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Form Input Jadwal Meeting</h1>
              <p className="text-red-100 text-sm">Lengkapi semua kolom bertanda bintang "*" untuk mengajukan jadwal</p>
            </div>
            <Button
              onClick={() => router.back()}
              type="text"
              className="text-white! hover:text-white! bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors h-auto border-0"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-4 flex flex-col gap-6">

              {/* Tanggal */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 h-full">
                <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <h2 className="font-semibold text-lg">Tanggal <span className="text-red-500">*</span></h2>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl p-2 shadow-sm">
                  <Calendar
                    fullscreen={false}
                    value={tanggal || dayjs()}
                    onChange={(date) => setTanggal(date)}
                    headerRender={({ value, onChange }) => {
                      return (
                        <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800 mb-2">
                          <Button
                            type="text"
                            size="small"
                            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>}
                            onClick={() => {
                              const newDate = value.clone().subtract(1, 'month');
                              onChange(newDate);
                              setTanggal(newDate);
                            }}
                          />
                          <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                            {value.format('MMMM YYYY')}
                          </div>
                          <Button
                            type="text"
                            size="small"
                            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                            onClick={() => {
                              const newDate = value.clone().add(1, 'month');
                              onChange(newDate);
                              setTanggal(newDate);
                            }}
                          />
                        </div>
                      );
                    }}
                  />
                </div>
              </div>

              {/* Ruang & Waktu */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  <h2 className="font-semibold text-lg">Ruang & Waktu</h2>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Ruang Meeting <span className="text-red-500">*</span></label>
                  <Select
                    className="w-full"
                    size="large"
                    placeholder="--Pilih Ruang Meeting--"
                    value={ruang}
                    onChange={(val) => setRuang(val)}
                    options={[
                      { value: "Pulau Sangiang", label: "Pulau Sangiang" },
                      { value: "Pulau Umang", label: "Pulau Umang" },
                      { value: "Tanjung Lesung", label: "Tanjung Lesung" },
                      { value: "Pulau Tunda", label: "Pulau Tunda" },
                      { value: "Ujung Kulon", label: "Ujung Kulon" }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Waktu Penggunaan <span className="text-red-500">*</span>
                    </div>
                  </label>
                  <TimePicker.RangePicker
                    className="w-full"
                    size="large"
                    format="HH:mm"
                    minuteStep={15}
                    value={waktu as any}
                    onChange={(dates) => setWaktu(dates as any)}
                    placeholder={['Mulai', 'Selesai']}
                  />
                </div>
              </div>

            </div>

            {/* Right Column */}
            <div className="lg:col-span-8 flex flex-col gap-4">

              {/* Identitas Penyelenggara */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  <h2 className="font-semibold text-lg">Identitas Penyelenggara</h2>
                </div>

                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1.5">Perusahaan / Instansi / Perorangan <span className="text-red-500">*</span></label>
                  <Input
                    size="large"
                    placeholder="Contoh: PT BPR XYZ"
                    className="bg-red-50/30 hover:bg-red-50/50 focus:bg-white"
                    value={instansi}
                    onChange={(e) => setInstansi(e.target.value)}
                  />
                </div>
              </div>

              {/* Peserta Internal */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  <h2 className="font-semibold text-lg">Peserta Internal</h2>
                </div>

                <div className="flex flex-col gap-2">
                  {pesertaInternal.map((peserta, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-4">
                      <div className="w-full sm:w-1/3">
                        {index === 0 && <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1.5">Jumlah Peserta Internal <span className="text-red-500">*</span></label>}
                        <InputNumber
                          min={0}
                          value={peserta.jumlah}
                          onChange={(val) => updatePesertaInternal(index, 'jumlah', val)}
                          size="large"
                          className="w-full! bg-red-50/30 hover:bg-red-50/50 focus:bg-white"
                        />
                      </div>
                      <div className="w-full sm:w-2/3">
                        {index === 0 && <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1.5">Jabatan Peserta Internal</label>}
                        <Input
                          size="large"
                          value={peserta.jabatan}
                          onChange={(e) => updatePesertaInternal(index, 'jabatan', e.target.value)}
                          placeholder="Contoh: Direksi, Manajer"
                          className="bg-red-50/30 hover:bg-red-50/50 focus:bg-white"
                          suffix={
                            index === pesertaInternal.length - 1 ? (
                              <svg onClick={addPesertaInternal} className="w-4 h-4 text-slate-400 cursor-pointer hover:text-[#DA251C] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            ) : (
                              <svg onClick={() => removePesertaInternal(index)} className="w-4 h-4 text-slate-400 cursor-pointer hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Peserta Eksternal */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  <h2 className="font-semibold text-lg">Peserta Eksternal</h2>
                </div>

                <div className="flex flex-col gap-2">
                  {pesertaEksternal.map((peserta, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-4">
                      <div className="w-full sm:w-1/3">
                        {index === 0 && <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1.5">Jumlah Peserta Eksternal <span className="text-red-500">*</span></label>}
                        <InputNumber
                          min={0}
                          value={peserta.jumlah}
                          onChange={(val) => updatePesertaEksternal(index, 'jumlah', val)}
                          size="large"
                          className="w-full! bg-red-50/30 hover:bg-red-50/50 focus:bg-white"
                        />
                      </div>
                      <div className="w-full sm:w-2/3">
                        {index === 0 && <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1.5">Jabatan Peserta Eksternal <span className="text-red-500">*</span></label>}
                        <Input
                          size="large"
                          value={peserta.jabatan}
                          onChange={(e) => updatePesertaEksternal(index, 'jabatan', e.target.value)}
                          placeholder="Contoh: Direksi, Manajer"
                          className="bg-red-50/30 hover:bg-red-50/50 focus:bg-white"
                          suffix={
                            index === pesertaEksternal.length - 1 ? (
                              <svg onClick={addPesertaEksternal} className="w-4 h-4 text-slate-400 cursor-pointer hover:text-[#DA251C] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            ) : (
                              <svg onClick={() => removePesertaEksternal(index)} className="w-4 h-4 text-slate-400 cursor-pointer hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Keterangan */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  <h2 className="font-semibold text-lg">Keterangan</h2>
                </div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 mb-1.5">Pisahkan dengan koma (,) jika terdapat beberapa item</label>

                <div>
                  <Input.TextArea
                    rows={4}
                    placeholder="Tuliskan agenda, kebutuhan khusus, atau informasi tambahan lainnya....."
                    className="bg-red-50/30 hover:bg-red-50/50 focus:bg-white resize-none"
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end items-center gap-4 mt-6 pb-12">
            <Button size="medium" type="primary" onClick={handleSave} loading={loading} style={{ backgroundColor: "#b22222", border: "none" }} className="font-medium shadow-sm hover:opacity-90">
              Simpan Jadwal
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

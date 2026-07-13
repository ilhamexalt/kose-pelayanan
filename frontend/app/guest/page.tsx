"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { message } from "antd";
import { toPng } from "html-to-image";
import ThemeToggle from "@/components/ThemeToggle";
import CustomSelect from "@/components/CustomSelect";
import Footer from '@/components/Footer';

export default function GuestPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queueNumber, setQueueNumber] = useState<string | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  const [nik, setNik] = useState("");
  const [nama, setNama] = useState("");
  const [alamat, setAlamat] = useState("");
  const [phone, setPhone] = useState("");
  const [jenis, setJenis] = useState("");
  const [instansi, setInstansi] = useState("");
  const [keperluan, setKeperluan] = useState("");
  const [keperluanOther, setKeperluanOther] = useState("");
  const [bertemu, setBertemu] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [jenisDebitur, setJenisDebitur] = useState("");
  const [slikNikNpwp, setSlikNikNpwp] = useState("");
  const [email, setEmail] = useState("");
  const [pengaduanNik, setPengaduanNik] = useState("");
  const [klasifikasi, setKlasifikasi] = useState("");
  const [sektors, setSektors] = useState<string[]>([]);
  const [sektorOther, setSektorOther] = useState("");
  const [perusahaan, setPerusahaan] = useState("");
  const [produk, setProduk] = useState("");
  const [permasalahan, setPermasalahan] = useState("");
  const [ringkasan, setRingkasan] = useState("");
  const [pernyataan, setPernyataan] = useState(false);
  const [isNikFound, setIsNikFound] = useState<boolean | null>(null);
  const [isCheckingNik, setIsCheckingNik] = useState(false);
  const [useMainNikPengaduan, setUseMainNikPengaduan] = useState(false);

  useEffect(() => {
    if (jenisDebitur === "Perseorangan") {
      setSlikNikNpwp(nik);
    } else if (jenisDebitur === "") {
      setSlikNikNpwp("");
    }
  }, [jenisDebitur, nik]);

  const handleSektorChange = (val: string, checked: boolean) => {
    if (checked) {
      setSektors((prev) => [...prev, val]);
    } else {
      setSektors((prev) => prev.filter((item) => item !== val));
    }
  };

  const checkNik = async () => {
    if (!nik) return;
    if (!/^\d{16}$/.test(nik)) {
      messageApi.warning("NIK harus berupa 16 digit angka (tidak boleh ada huruf)!");
      return;
    }
    setIsCheckingNik(true);
    messageApi.loading({ content: "Mengecek data NIK...", key: "checkNikLoading", duration: 0 });
    try {
      const res = await fetch(`/api/pelayanan/check?nik=${nik}`);
      const json = await res.json();
      if (json.success && json.found) {
        setNama(json.data.nama || "");
        setAlamat(json.data.alamat || "");
        setPhone(json.data.phone || "");
        setIsNikFound(true);
        messageApi.success({ content: "Data NIK ditemukan!", key: "checkNikLoading", duration: 2.5 });
      } else {
        setIsNikFound(false);
        setNama("");
        setAlamat("");
        setPhone("");
        messageApi.info({ content: "Data NIK belum terdaftar. Silakan lengkapi data Anda.", key: "checkNikLoading", duration: 3 });
      }
    } catch (err) {
      console.error(err);
      messageApi.error({ content: "Gagal mengecek data NIK.", key: "checkNikLoading", duration: 2.5 });
    } finally {
      setIsCheckingNik(false);
    }
  };

  const handleNikChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 16);
    setNik(value);
    if (value.length < 16 && isNikFound !== null) {
      setIsNikFound(null);
      setNama("");
      setAlamat("");
      setPhone("");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!/^\d{16}$/.test(nik)) {
      messageApi.warning("NIK utama harus berupa 16 digit angka (tidak boleh ada huruf)!");
      setIsSubmitting(false);
      return;
    }

    const data: any = {
      nik,
      nama,
      alamat,
      phone,
      jenis,
    };

    if (jenis === "umum") {
      data.instansi = instansi;
      data.keperluan = keperluan === "Other:" ? (keperluanOther ? `Other: ${keperluanOther}` : "Other") : keperluan;
      data.bertemu = bertemu;
      data.keterangan = keterangan;
    }

    if (jenis === "slik") {
      if (jenisDebitur !== "Badan Usaha" && !/^\d{16}$/.test(slikNikNpwp)) {
        messageApi.warning("NIK Debitur SLIK harus berupa 16 digit angka!");
        setIsSubmitting(false);
        return;
      }
      if (jenisDebitur === "Badan Usaha" && !/^\d{15,16}$/.test(slikNikNpwp)) {
        messageApi.warning("NPWP Badan Usaha harus berupa 15 atau 16 digit angka!");
        setIsSubmitting(false);
        return;
      }
      data.jenisDebitur = jenisDebitur;
      data.slikNikNpwp = slikNikNpwp;
      data.email = email;
    }

    if (jenis === "pengaduan") {
      if (!/^\d{16}$/.test(pengaduanNik)) {
        messageApi.warning("NIK Pengaduan harus berupa 16 digit angka (tidak boleh ada huruf)!");
        setIsSubmitting(false);
        return;
      }
      if (sektors.length === 0) {
        messageApi.warning("Pilih minimal satu Sektor layanan.");
        setIsSubmitting(false);
        return;
      }
      if (!pernyataan) {
        messageApi.warning("Anda harus menyetujui Pernyataan Kebenaran Informasi.");
        setIsSubmitting(false);
        return;
      }
      const formattedSektor = sektors.map(s => s === "Other:" ? (sektorOther ? `Other: ${sektorOther}` : "Other") : s);
      data.pengaduanNik = pengaduanNik;
      data.klasifikasi = klasifikasi;
      data.sektor = formattedSektor;
      data.perusahaan = perusahaan;
      data.produk = produk;
      data.permasalahan = permasalahan;
      data.ringkasan = ringkasan;
    }

    try {
      const res = await fetch('/api/pelayanan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (json.success) {
        setQueueNumber(json.queueNumber);
        messageApi.success("Berhasil mengambil antrean!");
      } else {
        messageApi.error(json.error || 'Terjadi kesalahan pada server');
      }
    } catch (err) {
      messageApi.error('Terjadi kesalahan koneksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadTicket = async () => {
    if (!ticketRef.current) return;
    try {
      const dataUrl = await toPng(ticketRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2
      });
      const link = document.createElement('a');
      link.download = `tiket-antrean-${queueNumber}.png`;
      link.href = dataUrl;
      link.click();
      messageApi.success("Tiket berhasil disimpan!");
    } catch (err) {
      console.error(err);
      messageApi.error("Gagal menyimpan tiket");
    }
  };

  return (
    <>
    <div className="flex flex-1 items-center justify-center p-6">
      {contextHolder}
      <div className="w-full max-w-xl">
        {/* <div className="mb-6 flex justify-between items-center">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#DA251C] transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Kembali
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Image
              src="/assets/images/ojk-banten-logo.png"
              alt="Logo OJK"
              width={100}
              height={40}
              className="object-contain p-1 rounded dark:hidden"
              style={{ width: 'auto', height: 'auto' }}
            />
            <Image
              src="/assets/images/logo-ojk-putih.png"
              alt="Logo OJK"
              width={100}
              height={40}
              className="object-contain p-1 rounded hidden dark:block"
              style={{ width: 'auto', height: 'auto' }}
            />
          </div>
        </div> */}

        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl transition-colors duration-300">
          {queueNumber ? (
            <div className="text-center py-4">
              <div ref={ticketRef} className="bg-white p-8 rounded-xl">
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Pelayanan Berhasil Terkirim</h1>
                <p className="text-slate-500 mb-8">Terima kasih telah menyampaikan permintaan pelayanan Anda. Silakan simpan nomor antrian di bawah ini untuk pengecekan status.</p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-4">
                  <p className="text-sm font-medium text-slate-500 mb-2">Nomor Antrian Anda</p>
                  <div className="text-4xl font-black text-[#DA251C] tracking-widest">{queueNumber}</div>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-4">
                <button onClick={downloadTicket} className="w-full bg-[#DA251C] hover:bg-[#B91C1C] text-white font-medium py-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Simpan Tiket ke Galeri
                </button>
                <button onClick={() => {
                  setQueueNumber(null);
                  setNik("");
                  setNama("");
                  setAlamat("");
                  setPhone("");
                  setJenis("");
                  setInstansi("");
                  setKeperluan("");
                  setKeperluanOther("");
                  setBertemu("");
                  setKeterangan("");
                  setJenisDebitur("");
                  setSlikNikNpwp("");
                  setEmail("");
                  setPengaduanNik("");
                  setKlasifikasi("");
                  setSektors([]);
                  setSektorOther("");
                  setPerusahaan("");
                  setProduk("");
                  setPermasalahan("");
                  setRingkasan("");
                  setPernyataan(false);
                  setIsNikFound(null);
                }} className="w-full bg-white dark:bg-slate-800 border-2 border-[#DA251C] text-[#DA251C] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-medium py-3 rounded-lg transition-all cursor-pointer">
                  Ajukan Pelayanan Lain
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="w-12 h-12 bg-red-50 dark:bg-red-950/60 text-[#DA251C] dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Formulir Pelayanan</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Silakan lengkapi data di bawah ini untuk menyampaikan permintaan pelayanan Anda.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="nik" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">NIK <span className="text-[#DA251C]">*</span></label>
                  <div className="relative">
                    <input
                      type="text"
                      id="nik"
                      name="nik"
                      value={nik}
                      onChange={handleNikChange}
                      onBlur={checkNik}
                      maxLength={16}
                      required
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all pr-10"
                      placeholder="Masukkan 16 digit NIK"
                    />
                    {isCheckingNik && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="animate-spin h-5 w-5 text-[#DA251C]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  {isCheckingNik ? (
                    <div className="flex items-center gap-2 mt-2 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg text-[#DA251C] dark:text-red-400 text-xs font-medium animate-pulse">
                      <svg className="animate-spin h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Mengecek data NIK ke sistem... Mohon tunggu sebentar.</span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Digunakan untuk verifikasi data (harus 16 digit).</p>
                  )}
                </div>

                <div>
                  <label htmlFor="nama" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap <span className="text-[#DA251C]">*</span></label>
                  <input
                    type="text"
                    id="nama"
                    name="nama"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    disabled={isNikFound === null || isNikFound === true}
                    required
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-500"
                    placeholder="Masukkan nama lengkap Anda"
                  />
                </div>

                <div>
                  <label htmlFor="alamat" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Alamat Lengkap <span className="text-[#DA251C]">*</span></label>
                  <textarea
                    id="alamat"
                    name="alamat"
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    disabled={isNikFound === null || isNikFound === true}
                    required
                    rows={2}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-500"
                    placeholder="Masukkan alamat lengkap Anda sesuai KTP"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nomor HP <span className="text-[#DA251C]">*</span></label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isNikFound === null || isNikFound === true}
                    required
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-500"
                    placeholder="Contoh: 08123456789"
                  />
                </div>

                <div>
                  <label htmlFor="jenis" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Jenis Pelayanan <span className="text-[#DA251C]">*</span></label>
                  <CustomSelect
                    id="jenis"
                    value={jenis}
                    onChange={(val) => setJenis(val)}
                    disabled={isNikFound === null}
                    placeholder="-- Pilih Jenis Pelayanan --"
                    options={[
                      { value: "slik", label: "SLIK" },
                      { value: "pengaduan", label: "Pengaduan" },
                      { value: "umum", label: "Kunjungan Umum/Kedinasan" },
                    ]}
                  />
                </div>

                {jenis === "umum" && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-red-100 dark:border-red-950/60 rounded-xl p-5 space-y-4 animate-fadeIn transition-all">
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/80 pb-3">
                      <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950 text-[#DA251C] dark:text-red-400 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      </div>
                      <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                        REGISTRASI TAMU (Kunjungan Umum/Kedinasan)
                      </h2>
                    </div>

                    <div>
                      <label htmlFor="instansi" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Nama Instansi / Perusahaan <span className="text-[#DA251C]">*</span>
                      </label>
                      <input
                        type="text"
                        id="instansi"
                        name="instansi"
                        value={instansi}
                        onChange={(e) => setInstansi(e.target.value)}
                        required={jenis === "umum"}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all"
                        placeholder="Masukkan nama instansi atau perusahaan"
                      />
                    </div>

                    <div>
                      <label htmlFor="keperluan" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Keperluan <span className="text-[#DA251C]">*</span>
                      </label>
                      <CustomSelect
                        id="keperluan"
                        value={keperluan}
                        onChange={(val) => setKeperluan(val)}
                        placeholder="-- Pilih Keperluan --"
                        options={[
                          { value: "Undangan Rapat / Meeting", label: "Undangan Rapat / Meeting" },
                          { value: "PKK/Fit & Propper", label: "PKK/Fit & Propper" },
                          { value: "Penawaran", label: "Penawaran" },
                          { value: "Other:", label: "Other:" },
                        ]}
                      />
                    </div>

                    {keperluan === "Other:" && (
                      <div className="pt-1">
                        <label htmlFor="keperluanOther" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Sebutkan Keperluan Lainnya <span className="text-[#DA251C]">*</span>
                        </label>
                        <input
                          type="text"
                          id="keperluanOther"
                          name="keperluanOther"
                          value={keperluanOther}
                          onChange={(e) => setKeperluanOther(e.target.value)}
                          required={jenis === "umum" && keperluan === "Other:"}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all"
                          placeholder="Tuliskan keperluan Anda..."
                        />
                      </div>
                    )}

                    <div>
                      <label htmlFor="bertemu" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Bertemu dengan Pegawai (Nama Pejabat/Bagian yang dituju) <span className="text-[#DA251C]">*</span>
                      </label>
                      <input
                        type="text"
                        id="bertemu"
                        name="bertemu"
                        value={bertemu}
                        onChange={(e) => setBertemu(e.target.value)}
                        required={jenis === "umum"}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all"
                        placeholder="Contoh: Bpk. Ahmad / Bagian Perizinan"
                      />
                    </div>

                    <div>
                      <label htmlFor="keterangan" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Keterangan (Jumlah Orang) <span className="text-[#DA251C]">*</span>
                      </label>
                      <input
                        type="text"
                        id="keterangan"
                        name="keterangan"
                        value={keterangan}
                        onChange={(e) => setKeterangan(e.target.value)}
                        required={jenis === "umum"}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all"
                        placeholder="Contoh: 3 Orang"
                      />
                    </div>
                  </div>
                )}

                {jenis === "slik" && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-red-100 dark:border-red-950/60 rounded-xl p-5 space-y-5 animate-fadeIn transition-all">
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/80 pb-3">
                      <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950 text-[#DA251C] dark:text-red-400 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                        PELAYANAN SISTEM LAYANAN INFORMASI KEUANGAN (SLIK)
                      </h2>
                    </div>

                    <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 text-xs text-slate-700 dark:text-slate-300 space-y-3">
                      <div className="font-bold text-blue-900 dark:text-blue-300 text-sm flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Persyaratan Dokumen Permohonan SLIK :
                      </div>
                      <div className="space-y-2 pl-1">
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block">1. Debitur Perseorangan</span>
                          <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 pl-2 space-y-0.5 mt-0.5">
                            <li>KTP Asli / Paspor (untuk WNA)</li>
                            <li>Dalam hal dikuasakan, membawa Identitas Asli Debitur dan Pemohon, disertakan Surat Kuasa yang bertanda tangan diatas materai 10.000</li>
                          </ul>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block">2. Debitur yang telah Meninggal Dunia</span>
                          <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 pl-2 space-y-0.5 mt-0.5">
                            <li>KTP Asli ahli waris</li>
                            <li>Dokumen kematian debitur yang dikeluarkan oleh pihak berwenang</li>
                            <li>Dokumen yang menunjukkan hubungan kekeluargaan/ahli waris (cth: Kartu Keluarga)</li>
                          </ul>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block">3. Badan Usaha</span>
                          <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 pl-2 space-y-0.5 mt-0.5">
                            <li>KTP Asli pengurus</li>
                            <li>NPWP badan usaha</li>
                            <li>Akta Pendirian badan usaha</li>
                            <li>Perubahan anggaran dasar terakhir badan usaha</li>
                            <li>Dalam hal terjadi perubahan nama badan usaha, membawa dokumen Akta Perubahan</li>
                            <li>Dalam hal dikuasakan, membawa surat kuasa dan identitas asli pemohon</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="jenisDebitur" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        1. Jenis Debitur <span className="text-[#DA251C]">*</span>
                      </label>
                      <CustomSelect
                        id="jenisDebitur"
                        value={jenisDebitur}
                        onChange={(val) => setJenisDebitur(val)}
                        placeholder="-- Pilih Jenis Debitur --"
                        options={[
                          { value: "Perseorangan", label: "Perseorangan" },
                          { value: "Perseorangan Dikuasakan", label: "Perseorangan Dikuasakan" },
                          { value: "Badan Usaha", label: "Badan Usaha" },
                          { value: "Debitur Meninggal Dunia", label: "Debitur Meninggal Dunia" },
                        ]}
                      />
                    </div>

                    <div>
                      <label htmlFor="slikNikNpwp" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        2. NIK (Nomor Induk Kependudukan) / NPWP (Apabila Badan Usaha) <span className="text-[#DA251C]">*</span>
                      </label>
                      <input
                        type="text"
                        id="slikNikNpwp"
                        name="slikNikNpwp"
                        value={slikNikNpwp}
                        onChange={(e) => setSlikNikNpwp(e.target.value.replace(/\D/g, '').slice(0, 16))}
                        maxLength={16}
                        required={jenis === "slik"}
                        readOnly={jenisDebitur === "Perseorangan"}
                        className={`w-full border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all ${jenisDebitur === "Perseorangan" ? "bg-slate-100 dark:bg-slate-900 text-slate-500" : "bg-white dark:bg-slate-800"}`}
                        placeholder="Masukkan NIK atau NPWP"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        3. Email Aktif (Pastikan penyimpanan tidak penuh) <span className="text-[#DA251C]">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required={jenis === "slik"}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all"
                        placeholder="Contoh: nama@domain.com"
                      />
                    </div>
                  </div>
                )}

                {jenis === "pengaduan" && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-red-100 dark:border-red-950/60 rounded-xl p-5 space-y-5 animate-fadeIn transition-all">
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/80 pb-3">
                      <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950 text-[#DA251C] dark:text-red-400 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </div>
                      <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                        PELAYANAN PENGADUAN
                      </h2>
                    </div>

                    <div>
                      <label htmlFor="pengaduanNik" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        NIK (Nomor Induk Kependudukan) <span className="text-[#DA251C]">*</span>
                      </label>
                      <div className="flex items-center gap-2 mb-2">
                        <input type="checkbox" id="useMainNikPengaduan" checked={useMainNikPengaduan} onChange={(e) => {
                          setUseMainNikPengaduan(e.target.checked);
                          if (e.target.checked) setPengaduanNik(nik);
                          else setPengaduanNik("");
                        }} className="rounded border-slate-300 text-[#DA251C] focus:ring-[#DA251C] w-4 h-4 cursor-pointer" />
                        <label htmlFor="useMainNikPengaduan" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">Sama dengan NIK utama</label>
                      </div>
                      <input
                        type="text"
                        id="pengaduanNik"
                        name="pengaduanNik"
                        value={pengaduanNik}
                        onChange={(e) => setPengaduanNik(e.target.value.replace(/\D/g, '').slice(0, 16))}
                        maxLength={16}
                        required={jenis === "pengaduan"}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all"
                        placeholder="Masukkan 16 digit NIK"
                      />
                    </div>

                    <div>
                      <label htmlFor="klasifikasi" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Klasifikasi Layanan <span className="text-[#DA251C]">*</span>
                      </label>
                      <CustomSelect
                        id="klasifikasi"
                        value={klasifikasi}
                        onChange={(val) => setKlasifikasi(val)}
                        placeholder="-- Pilih Klasifikasi --"
                        options={[
                          { value: "Pemberian Informasi / Pertanyaan", label: "Pemberian Informasi / Pertanyaan" },
                          { value: "Penerimaan Informasi", label: "Penerimaan Informasi" },
                          { value: "Konsultasi Pengaduan", label: "Konsultasi Pengaduan" },
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Sektor <span className="text-[#DA251C]">*</span> <span className="text-xs font-normal text-slate-500">(dapat pilih lebih dari satu)</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-white dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        {[
                          "Perbankan",
                          "Pasar Modal",
                          "IKNB",
                          "Asuransi",
                          "Lembaga Pembiayaan",
                          "Pegadaian",
                          "Dana Pensiun",
                          "Other:"
                        ].map((item) => (
                          <label key={item} className="flex items-center space-x-3 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sektors.includes(item)}
                              onChange={(e) => handleSektorChange(item, e.target.checked)}
                              className="rounded border-slate-300 text-[#DA251C] focus:ring-[#DA251C] w-4 h-4"
                            />
                            <span>{item}</span>
                          </label>
                        ))}
                      </div>
                      {sektors.includes("Other:") && (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={sektorOther}
                            onChange={(e) => setSektorOther(e.target.value)}
                            required={jenis === "pengaduan" && sektors.includes("Other:")}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all"
                            placeholder="Sebutkan sektor lainnya..."
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="perusahaan" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Nama Perusahaan yang diadukan <span className="text-[#DA251C]">*</span>
                      </label>
                      <input
                        type="text"
                        id="perusahaan"
                        name="perusahaan"
                        value={perusahaan}
                        onChange={(e) => setPerusahaan(e.target.value)}
                        required={jenis === "pengaduan"}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all"
                        placeholder="Contoh: PT Bank Contoh Indonesia"
                      />
                    </div>

                    <div>
                      <label htmlFor="produk" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Jenis Produk <span className="text-[#DA251C]">*</span>
                      </label>
                      <input
                        type="text"
                        id="produk"
                        name="produk"
                        value={produk}
                        onChange={(e) => setProduk(e.target.value)}
                        required={jenis === "pengaduan"}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all"
                        placeholder="Contoh : Pinjaman Online, Asuransi Jiwa, Dana Pensiun, Pembiayaan Multiguna, dll"
                      />
                    </div>

                    <div>
                      <label htmlFor="permasalahan" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Jenis Permasalahan <span className="text-[#DA251C]">*</span>
                      </label>
                      <input
                        type="text"
                        id="permasalahan"
                        name="permasalahan"
                        value={permasalahan}
                        onChange={(e) => setPermasalahan(e.target.value)}
                        required={jenis === "pengaduan"}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all"
                        placeholder="Contoh: Persoalan Klaim, Keberatan atas Bunga/Denda, Penipuan/Fraud, dll"
                      />
                    </div>

                    <div>
                      <label htmlFor="ringkasan" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        RINGKASAN PENGADUAN <span className="text-[#DA251C]">*</span>
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        Tuliskan uraian singkat mengenai permasalahan atau keluhan yang Anda alami terkait layanan, produk, atau pihak pelaku usaha sektor jasa keuangan.
                      </p>
                      <textarea
                        id="ringkasan"
                        name="ringkasan"
                        rows={4}
                        value={ringkasan}
                        onChange={(e) => setRingkasan(e.target.value)}
                        required={jenis === "pengaduan"}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all text-sm"
                        placeholder="Uraikan kronologi singkat permasalahan Anda di sini..."
                      />
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 rounded-xl">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pernyataan}
                          onChange={(e) => setPernyataan(e.target.checked)}
                          required={jenis === "pengaduan"}
                          className="mt-1 rounded border-slate-300 text-[#DA251C] focus:ring-[#DA251C] w-4 h-4 flex-shrink-0"
                        />
                        <span className="text-xs font-medium text-amber-900 dark:text-amber-200 leading-relaxed">
                          <strong className="block mb-0.5 text-amber-950 dark:text-amber-100">Pernyataan Kebenaran Informasi <span className="text-[#DA251C]">*</span></strong>
                          Saya menyatakan bahwa seluruh informasi yang saya sampaikan adalah benar, sesuai pengetahuan dan dokumen yang saya miliki.
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={isSubmitting} className="w-full bg-[#DA251C] hover:bg-red-700 text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center mt-6">
                  {isSubmitting ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : "Kirim Pelayanan"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}

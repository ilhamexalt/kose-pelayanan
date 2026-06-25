"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { message } from "antd";

export default function GuestPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queueNumber, setQueueNumber] = useState<string | null>(null);

  const [nik, setNik] = useState("");
  const [nama, setNama] = useState("");
  const [phone, setPhone] = useState("");
  const [jenis, setJenis] = useState("");
  const [isNikFound, setIsNikFound] = useState<boolean | null>(null);
  const [isCheckingNik, setIsCheckingNik] = useState(false);

  const checkNik = async () => {
    if (!nik || nik.length < 16) return;
    setIsCheckingNik(true);
    try {
      const res = await fetch(`/api/pelayanan/check?nik=${nik}`);
      const json = await res.json();
      if (json.success && json.found) {
        setNama(json.data.nama || "");
        setPhone(json.data.phone || "");
        setIsNikFound(true);
      } else {
        setIsNikFound(false);
        setNama("");
        setPhone("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingNik(false);
    }
  };

  const handleNikChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNik(value);
    if (value.length < 16 && isNikFound !== null) {
      setIsNikFound(null);
      setNama("");
      setPhone("");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const data = {
      nik,
      nama,
      phone,
      jenis,
    };

    try {
      const res = await fetch('/api/pelayanan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      
      if (json.success) {
        setQueueNumber(json.queueNumber);
        message.success("Berhasil mengambil antrean!");
      } else {
        message.error(json.error || 'Terjadi kesalahan pada server');
      }
    } catch (err) {
      message.error('Terjadi kesalahan koneksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex justify-between items-center">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-[#DA251C] transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Kembali
          </Link>
          <Image
            src="/assets/images/ojk-logo.png"
            alt="Logo OJK"
            width={100}
            height={40}
            className="object-contain"
            style={{ width: 'auto', height: 'auto' }}
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl">
          {queueNumber ? (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Pelayanan Berhasil Terkirim</h1>
              <p className="text-slate-500 mb-8">Terima kasih telah menyampaikan permintaan pelayanan Anda. Silakan simpan nomor antrian di bawah ini untuk pengecekan status.</p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8">
                <p className="text-sm font-medium text-slate-500 mb-2">Nomor Antrian Anda</p>
                <div className="text-4xl font-black text-[#DA251C] tracking-widest">{queueNumber}</div>
              </div>

              <button onClick={() => {
                setQueueNumber(null);
                setNik("");
                setNama("");
                setPhone("");
                setJenis("");
                setIsNikFound(null);
              }} className="w-full bg-white border-2 border-[#DA251C] text-[#DA251C] hover:bg-red-50 font-medium py-3 rounded-lg transition-all">
                Ajukan Pelayanan Lain
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center border-b border-slate-100 pb-6">
                <div className="w-12 h-12 bg-red-50 text-[#DA251C] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Formulir Pelayanan</h1>
                <p className="text-slate-500 text-sm">Silakan lengkapi data di bawah ini untuk menyampaikan permintaan pelayanan Anda.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="nik" className="block text-sm font-medium text-slate-700 mb-1">NIK <span className="text-[#DA251C]">*</span></label>
                  <input 
                    type="text" 
                    id="nik" 
                    name="nik" 
                    value={nik}
                    onChange={handleNikChange}
                    onBlur={checkNik}
                    required 
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all" 
                    placeholder="Masukkan 16 digit NIK" 
                  />
                  {isCheckingNik ? (
                    <p className="text-xs text-blue-500 mt-1">Mengecek data NIK...</p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">Digunakan untuk verifikasi data.</p>
                  )}
                </div>

                <div>
                  <label htmlFor="nama" className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap <span className="text-[#DA251C]">*</span></label>
                  <input 
                    type="text" 
                    id="nama" 
                    name="nama" 
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    disabled={isNikFound === null || isNikFound === true}
                    required 
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all disabled:bg-slate-100 disabled:text-slate-500" 
                    placeholder="Masukkan nama lengkap Anda" 
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Nomor HP <span className="text-[#DA251C]">*</span></label>
                  <input 
                    type="tel" 
                    id="phone" 
                    name="phone" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isNikFound === null || isNikFound === true}
                    required 
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all disabled:bg-slate-100 disabled:text-slate-500" 
                    placeholder="Contoh: 08123456789" 
                  />
                </div>

                <div>
                  <label htmlFor="jenis" className="block text-sm font-medium text-slate-700 mb-1">Jenis Pelayanan <span className="text-[#DA251C]">*</span></label>
                  <select 
                    id="jenis" 
                    name="jenis" 
                    value={jenis}
                    onChange={(e) => setJenis(e.target.value)}
                    disabled={isNikFound === null}
                    required 
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all appearance-none disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="" disabled>-- Pilih --</option>
                    <option value="slik">SLIK</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>

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
  );
}

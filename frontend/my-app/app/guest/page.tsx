"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function GuestPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queueNumber, setQueueNumber] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      // Generate a random queue number e.g. A-102
      const randomNum = Math.floor(100 + Math.random() * 900);
      setQueueNumber(`A-${randomNum}`);
    }, 1500);
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

              <button onClick={() => setQueueNumber(null)} className="w-full bg-white border-2 border-[#DA251C] text-[#DA251C] hover:bg-red-50 font-medium py-3 rounded-lg transition-all">
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
                  <input type="text" id="nik" required className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all" placeholder="Masukkan 16 digit NIK" />
                  <p className="text-xs text-slate-500 mt-1">Digunakan untuk verifikasi data.</p>
                </div>

                <div>
                  <label htmlFor="nama" className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap <span className="text-[#DA251C]">*</span></label>
                  <input type="text" id="nama" required className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all" placeholder="Masukkan nama lengkap Anda" />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Nomor HP <span className="text-[#DA251C]">*</span></label>
                  <input type="tel" id="phone" required className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all" placeholder="Contoh: 08123456789" />
                </div>

                <div>
                  <label htmlFor="jenis" className="block text-sm font-medium text-slate-700 mb-1">Jenis Pelayanan <span className="text-[#DA251C]">*</span></label>
                  <select id="jenis" required defaultValue="" className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all appearance-none">
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

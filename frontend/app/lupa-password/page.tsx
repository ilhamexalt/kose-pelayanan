"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { message } from 'antd';
import Footer from '@/components/Footer';

export default function LupaPasswordPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  
  // State for step 1
  const [identifier, setIdentifier] = useState("");
  
  // State for step 2
  const [userId, setUserId] = useState("");
  const [phoneMasked, setPhoneMasked] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  const handleRequestOtp = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (countdown > 0) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/lupa-password/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const json = await res.json();

      if (json.success) {
        setUserId(json.userId);
        setPhoneMasked(json.phoneMasked);
        messageApi.success(json.message || "OTP terkirim!");
        setCountdown(60);
        setStep(2);
      } else {
        messageApi.error(json.error || 'Gagal mengirim OTP');
      }
    } catch (err) {
      messageApi.error('Terjadi kesalahan koneksi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      messageApi.error('Konfirmasi password tidak cocok!');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/lupa-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otp, newPassword }),
      });
      const json = await res.json();

      if (json.success) {
        messageApi.success(json.message || "Password berhasil diubah!");
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        messageApi.error(json.error || 'Gagal mengubah password');
      }
    } catch (err) {
      messageApi.error('Terjadi kesalahan koneksi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col sm:relative sm:flex-1 w-full bg-slate-50">
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6 relative overflow-y-auto w-full">
        {contextHolder}
        <div className="absolute top-0 w-full h-1 bg-[#F1B434]"></div>

        <div className="w-full max-w-md">
          <div className="mb-4 flex justify-between items-center">
            <Link href="/login" className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-[#F1B434] transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Kembali ke Login
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl transition-colors duration-300">
            <div className="mb-6 text-center">
              <Image
                src="/assets/images/ojk-banten-logo.png"
                alt="Logo OJK"
                width={80}
                height={48}
                priority
                className="mx-auto mb-4 object-contain p-1 rounded"
                style={{ width: 'auto', height: 'auto' }}
              />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1">Lupa Password</h1>
              <p className="text-slate-500 text-xs sm:text-sm">
                {step === 1 ? "Masukkan NIP/Username untuk menerima OTP via WhatsApp." : `Masukkan kode OTP yang dikirim ke nomor WhatsApp ${phoneMasked}`}
              </p>
            </div>

            {step === 1 ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label htmlFor="identifier" className="block text-sm font-medium text-slate-700 mb-1">NIP / Username</label>
                  <input 
                    type="text" 
                    id="identifier" 
                    name="identifier" 
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required 
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F1B434] focus:border-transparent transition-all" 
                    placeholder="Masukkan NIP atau Username" 
                  />
                </div>

                <button type="submit" disabled={isLoading || countdown > 0} className={`w-full ${countdown > 0 ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-[#F1B434] hover:bg-amber-500 text-slate-900 cursor-pointer'} font-medium py-2.5 rounded-lg transition-all flex items-center justify-center mt-5`}>
                  {isLoading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : countdown > 0 ? `Tunggu ${countdown} detik...` : "Kirim OTP via WhatsApp"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyReset} className="space-y-4">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-slate-700 mb-1">Kode OTP</label>
                  <input 
                    type="text" 
                    id="otp" 
                    name="otp" 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required 
                    maxLength={6}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F1B434] focus:border-transparent transition-all tracking-widest text-center text-lg font-bold" 
                    placeholder="••••••" 
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-1">Password Baru</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="newPassword"
                      name="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 pr-11 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F1B434] focus:border-transparent transition-all"
                      placeholder="Masukkan password baru"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">Konfirmasi Password Baru</label>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    id="confirmPassword" 
                    name="confirmPassword" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required 
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F1B434] focus:border-transparent transition-all" 
                    placeholder="Ulangi password baru" 
                  />
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-[#F1B434] hover:bg-amber-500 text-slate-900 font-medium py-2.5 rounded-lg transition-all flex items-center justify-center mt-5 cursor-pointer">
                  {isLoading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : "Ubah Password"}
                </button>
                
                <div className="text-center mt-4">
                   <button 
                     type="button" 
                     onClick={() => handleRequestOtp()} 
                     disabled={countdown > 0}
                     className={`text-xs ${countdown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-slate-500 hover:text-[#DA251C]'}`}
                   >
                     {countdown > 0 ? `Kirim ulang OTP (${countdown}s)` : "Kirim ulang OTP"}
                   </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}

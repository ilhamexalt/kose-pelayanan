"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { message } from 'antd';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email'), // refers to input id/name 'email'
      password: formData.get('password'),
    };

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      
      if (json.success) {
        // In a real application, you'd save a token or session here
        // For simplicity, we'll store basic user info in localStorage to persist login state across reloads on the dashboard
        localStorage.setItem('user', JSON.stringify(json.user));
        message.success("Login berhasil!");
        router.push('/dashboard');
      } else {
        message.error(json.error || 'Login gagal');
      }
    } catch (err) {
      message.error('Terjadi kesalahan koneksi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center p-6 relative">
      <div className="absolute top-0 w-full h-1 bg-[#F1B434]"></div>
      
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-between items-center">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-[#F1B434] transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Kembali
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl">
          <div className="mb-8 text-center">
            <Image 
              src="/assets/images/ojk-logo.png" 
              alt="Logo OJK" 
              width={160} 
              height={60} 
              className="mx-auto mb-6 object-contain"
              style={{ width: 'auto', height: 'auto' }}
            />
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Portal Pegawai</h1>
            <p className="text-slate-500 text-sm">Masuk untuk melanjutkan ke dasbor internal.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">NIP / Email</label>
              <input type="text" id="email" name="email" required className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F1B434] focus:border-transparent transition-all" placeholder="Masukkan NIP atau Email" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
                <a href="#" className="text-xs text-slate-500 hover:text-[#DA251C] transition-colors">Lupa password?</a>
              </div>
              <input type="password" id="password" name="password" required className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#F1B434] focus:border-transparent transition-all" placeholder="••••••••" />
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-[#F1B434] hover:bg-amber-500 text-slate-900 font-medium py-3 rounded-lg transition-all flex items-center justify-center mt-6">
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : "Masuk"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

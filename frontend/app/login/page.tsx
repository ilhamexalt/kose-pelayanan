"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { message } from 'antd';
import ThemeToggle from '@/components/ThemeToggle';
import Footer from '@/components/Footer';

export default function LoginPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const identifier = formData.get('email') || formData.get('identifier');
    const data = {
      identifier: identifier,
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
        localStorage.removeItem('cached_menus');
        localStorage.removeItem('cached_permissions');
        localStorage.setItem('user', JSON.stringify(json.user));
        if (json.user.update_password === false) {
          messageApi.warning("Keamanan Akun: Anda wajib memperbarui password terlebih dahulu.");
          router.push('/update-password');
        } else {
          messageApi.success("Login berhasil!");
          router.push('/dashboard');
        }
      } else {
        messageApi.error(json.error || 'Login gagal');
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
            <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#F1B434] transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Kembali
            </Link>
          </div>

          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl transition-colors duration-300">
            <div className="mb-6 text-center">
              <Image
                src="/assets/images/ojk-banten-logo.png"
                alt="Logo OJK"
                width={80}
                height={48}
                priority
                className="mx-auto mb-4 object-contain p-1 rounded dark:hidden"
                style={{ width: 'auto', height: 'auto' }}
              />
              <Image
                src="/assets/images/logo-ojk-putih.png"
                alt="Logo OJK"
                width={80}
                height={48}
                priority
                className="mx-auto mb-4 object-contain p-1 rounded hidden dark:block"
                style={{ width: 'auto', height: 'auto' }}
              />
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Portal Pegawai</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Masuk menggunakan NIP, Username Anda.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">NIP / Username</label>
                <input type="text" id="email" name="email" required className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#F1B434] focus:border-transparent transition-all" placeholder="Masukkan NIP, Username" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                  <Link href="/lupa-password" className="text-xs text-slate-500 hover:text-[#DA251C] transition-colors">Lupa password?</Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    required
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 pr-11 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#F1B434] focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full bg-[#F1B434] hover:bg-amber-500 text-slate-900 font-medium py-2.5 rounded-lg transition-all flex items-center justify-center mt-5 cursor-pointer">
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
      <div className="hidden sm:block mt-auto">
        <Footer />
      </div>
    </div>
  );
}

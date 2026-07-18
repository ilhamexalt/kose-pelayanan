"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import { message } from "antd";
import ThemeToggle from "@/components/ThemeToggle";

export default function UpdatePasswordPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();
  const { user, refreshSession } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
  }, [user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    if (!newPassword || !confirmPassword) {
      messageApi.warning("Harap lengkapi semua kolom password.");
      return;
    }

    if (newPassword.length < 6) {
      messageApi.warning("Password baru minimal terdiri dari 6 karakter.");
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      messageApi.warning("Password baru harus mengandung kombinasi huruf dan angka.");
      return;
    }

    if (newPassword !== confirmPassword) {
      messageApi.error("Konfirmasi password tidak cocok dengan password baru.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/pegawai/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id || user.nip,
          nip: user.nip,
          newPassword,
        }),
      });
      const json = await res.json();

      if (json.success) {
        await refreshSession();
        messageApi.success("Password Anda berhasil diperbarui!");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        messageApi.error(json.error || "Gagal memperbarui password.");
      }
    } catch (err) {
      console.error(err);
      messageApi.error("Terjadi kesalahan koneksi saat memperbarui password.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-1 items-center justify-center p-6 relative min-h-screen bg-slate-50 dark:bg-slate-950">
      {contextHolder}
      <div className="absolute top-0 w-full h-1 bg-[#DA251C]"></div>

      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-end items-center">
          <ThemeToggle />
        </div>

        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl transition-colors duration-300">
          <div className="mb-8 text-center">
            <Image
              src="/assets/images/ojk-banten-logo.png"
              alt="Logo OJK"
              width={100}
              height={60}
              className="mx-auto mb-6 object-contain p-1 rounded dark:hidden"
              style={{ width: "auto", height: "auto" }}
            />
            <Image
              src="/assets/images/logo-ojk-putih.png"
              alt="Logo OJK"
              width={100}
              height={60}
              className="mx-auto mb-6 object-contain p-1 rounded hidden dark:block"
              style={{ width: "auto", height: "auto" }}
            />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-950/60 text-[#DA251C] dark:text-red-400 rounded-full text-xs font-semibold mb-3">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Keamanan Akun Wajib
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Pembaruan Password</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Halo <span className="font-semibold text-slate-800 dark:text-slate-200">{user.nama}</span>, demi keamanan akun, Anda diwajibkan untuk mengganti password sementara dengan password baru Anda sebelum melanjutkan.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Password Baru <span className="text-[#DA251C]">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 pr-11 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all text-sm"
                  placeholder="Minimal 6 karakter, paduan huruf & angka"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showNewPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Konfirmasi Password Baru <span className="text-[#DA251C]">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 pr-11 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DA251C] focus:border-transparent transition-all text-sm"
                  placeholder="Ketik ulang password baru"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#DA251C] hover:bg-[#b81d15] text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 cursor-pointer flex items-center justify-center mt-6"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                  <span>Memperbarui Password...</span>
                </div>
              ) : (
                "Simpan & Masuk ke Dasbor"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

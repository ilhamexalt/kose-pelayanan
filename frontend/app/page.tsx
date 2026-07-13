import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '@/components/ThemeToggle';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <div className="flex flex-col flex-1 items-center justify-center p-4 sm:p-6 relative w-full h-full">
      <div className="flex items-center gap-4 absolute top-4 right-6 z-20">
        <Link href="/login" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#F1B434] transition-colors">Login</Link>
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-5xl my-auto">
        <div className="text-center mb-6 sm:mb-8 flex flex-col items-center">
          <Image
            src="/assets/images/ojk-banten-logo.png"
            alt="Logo OJK"
            width={160}
            height={58}
            className="mb-4 p-1.5 dark:hidden"
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
          <Image
            src="/assets/images/logo-ojk-putih.png"
            alt="Logo OJK"
            width={160}
            height={58}
            className="mb-4 p-1.5 hidden dark:block"
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2 sm:mb-3 tracking-tight">
            One Portal OJK - KOSE
          </h1>
          {/* <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto px-4">
            Silakan pilih portal akses Anda untuk melanjutkan ke One Portal OJK - KOSE.
          </p> */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto px-2 sm:px-0">
          {/* Guest Card */}
          {/* <Link href="/guest" className="group flex flex-col items-center text-center p-5 sm:p-6 md:p-8 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-lg hover:border-red-500/30 dark:hover:border-red-500/50">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mb-4 sm:mb-5 rounded-full bg-red-50 dark:bg-red-950/60 flex items-center justify-center text-[#DA251C] dark:text-red-400 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 sm:mb-3">Portal Guest</h2>
            <p className="text-xs sm:text-sm md:text-base text-slate-500 dark:text-slate-400 mb-4 sm:mb-6 line-clamp-2 md:line-clamp-none">
              Akses untuk masyarakat umum. Ajukan pelayanan, pertanyaan, atau sampaikan aspirasi Anda di sini.
            </p>
            <span className="mt-auto px-5 sm:px-6 py-2 bg-[#DA251C] hover:bg-red-700 text-white rounded-full text-xs sm:text-sm font-medium transition-colors">Masuk Guest</span>
          </Link> */}

          {/* Pegawai Card */}
          {/* <Link href="/login" className="group flex flex-col items-center text-center p-5 sm:p-6 md:p-8 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-lg hover:border-amber-400/50 dark:hover:border-amber-400/60">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mb-4 sm:mb-5 rounded-full bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-[#F1B434] dark:text-amber-400 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 sm:mb-3">Portal Pegawai</h2>
            <p className="text-xs sm:text-sm md:text-base text-slate-500 dark:text-slate-400 mb-4 sm:mb-6 line-clamp-2 md:line-clamp-none">
              Akses khusus untuk pegawai internal. Masuk ke dasbor untuk mengelola data dan layanan operasional.
            </p>
            <span className="mt-auto px-5 sm:px-6 py-2 bg-[#F1B434] hover:bg-amber-500 text-slate-900 font-medium rounded-full text-xs sm:text-sm transition-colors">Login Pegawai</span>
          </Link> */}
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}

import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '@/components/ThemeToggle';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen lg:h-screen flex flex-col relative bg-slate-50 dark:bg-[#090d16] transition-colors duration-300 overflow-x-hidden lg:overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#DA251C]/10 to-transparent blur-3xl opacity-70 dark:opacity-40" />
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-bl from-[#F1B434]/15 to-transparent blur-3xl opacity-70 dark:opacity-40" />
        <div className="absolute -bottom-[20%] left-[20%] w-[70%] h-[70%] rounded-full bg-gradient-to-tr from-[#DA251C]/5 to-[#F1B434]/10 blur-3xl opacity-70 dark:opacity-40" />
      </div>

      {/* Header */}
      <header className="relative z-20 w-full px-4 py-4 sm:px-6 sm:py-4 flex justify-between items-center max-w-screen-2xl mx-auto flex-shrink-0">
        <div className="flex items-center">
          <div>
            <Image
              src="/assets/images/ojk-banten-logo.png"
              alt="Logo OJK Banten"
              width={140}
              height={50}
              className="h-6 sm:h-14 w-auto"
              priority
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row items-center justify-center px-4 sm:px-8 py-6 lg:py-2 relative z-10 max-w-screen-2xl mx-auto w-full gap-8 lg:gap-10">

        {/* Left: Text Content */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800/80 text-[#DA251C] dark:text-[#f87171] text-xs font-bold mb-4 lg:mb-5 shadow-sm border border-slate-200 dark:border-slate-700 backdrop-blur-sm cursor-default">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DA251C] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#DA251C]"></span>
            </span>
            One Portal
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-slate-900 dark:text-white mb-3 sm:mb-4 tracking-tight leading-tight">
            {/* OJK <br className="hidden lg:block" /> */}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#DA251C] to-[#F1B434] drop-shadow-sm">
              OJK Provinsi Banten
            </span>
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base lg:text-lg xl:text-xl mb-6 sm:mb-8 max-w-xl font-medium leading-relaxed">
            Platform terintegrasi untuk seluruh kebutuhan operasional dan administrasi di lingkungan kerja Otoritas Jasa Keuangan (OJK) Provinsi Banten.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#DA251C] to-[#b01c14] hover:from-[#b01c14] hover:to-[#8c1610] text-white text-sm sm:text-base font-semibold transition-all shadow-lg shadow-[#DA251C]/25 hover:shadow-[#DA251C]/40 transform hover:-translate-y-0.5 group"
            >
              Masuk Portal
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Right: Illustration/Image */}
        <div className="flex-1 flex justify-center items-center w-full relative group mt-8 lg:mt-0 min-h-0">
          <div className="relative inline-block w-full max-w-[320px] sm:max-w-[380px] lg:max-w-none lg:w-auto">
            {/* Glowing blur behind image */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#DA251C]/30 to-[#F1B434]/30 rounded-3xl transform rotate-3 scale-105 transition-transform group-hover:rotate-6 group-hover:scale-110 duration-700 blur-xl"></div>

            <div className="relative bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 p-2 sm:p-3 rounded-3xl shadow-2xl transition-transform duration-700 group-hover:-translate-y-2 z-10 w-full lg:w-auto">
              <div className="overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 flex justify-center items-center">
                <Image
                  src="/assets/images/gedung-kose.png"
                  alt="Gedung OJK Banten"
                  width={500}
                  height={350}
                  className="w-full h-auto lg:w-auto lg:h-[55vh] max-w-full object-contain transform transition-transform duration-1000 group-hover:scale-105"
                  priority
                />
              </div>

              {/* Floating Info Cards */}
              <div className="absolute -left-2 sm:-left-6 top-[40%] bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-2 sm:p-3 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 items-center gap-2 sm:gap-3 animate-bounce z-20 flex md:hidden lg:flex" style={{ animationDuration: '4s' }}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#DA251C]/10 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-[#DA251C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="shrink-0">
                  <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Akses Cepat</p>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">Kinerja Optimal</p>
                </div>
              </div>

              <div className="absolute -right-2 sm:-right-5 bottom-1/6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-2 sm:p-3 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 flex items-center gap-2 sm:gap-3 animate-bounce z-20" style={{ animationDuration: '3.5s', animationDelay: '1s' }}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#F1B434]/20 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-[#F1B434]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="shrink-0">
                  <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Keamanan</p>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">Terjamin</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>

      <div className="relative z-20 flex-shrink-0 mt-8 lg:mt-auto">
        <Footer />
      </div>
    </div>
  );
}

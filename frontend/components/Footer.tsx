import ThemeToggle from "./ThemeToggle";

export default function Footer() {
  return (
    <footer className="w-full bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 py-6 mt-auto z-20 relative transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-slate-500 dark:text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} Otoritas Jasa Keuangan. Hak Cipta Dilindungi.
        </div>
        <div className="flex space-x-6 text-sm text-slate-500 dark:text-slate-400 font-medium items-center">
          {/* <ThemeToggle /> */}
          <span className="flex items-center gap-1">
            Made with <span className="text-[#DA251C]">❤️</span> PCT3
          </span>
        </div>
      </div>
    </footer>
  );
}

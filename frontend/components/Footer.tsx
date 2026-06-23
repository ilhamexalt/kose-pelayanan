export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-slate-200 py-6 mt-auto z-20 relative">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between">
        <div className="text-slate-500 text-sm mb-4 md:mb-0">
          &copy; {new Date().getFullYear()} Otoritas Jasa Keuangan. Hak Cipta Dilindungi.
        </div>
        <div className="flex space-x-6 text-sm text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            Made with <span className="text-[#DA251C]">❤️</span> PCT3
          </span>
        </div>
      </div>
    </footer>
  );
}

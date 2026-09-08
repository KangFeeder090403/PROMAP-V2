export function AuthSystemFooter() {
  return (
    <footer className="w-full border-t border-slate-800 bg-[#0F172A] px-4 sm:px-6 py-3">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
        <a href="#" className="hover:text-slate-200 transition-colors">
          Ketentuan Layanan
        </a>
        <span>•</span>
        <a href="#" className="hover:text-slate-200 transition-colors">
          Kebijakan Privasi
        </a>
        <span>•</span>
        <a href="#" className="hover:text-slate-200 transition-colors">
          Status Layanan
        </a>
      </div>
    </footer>
  )
}
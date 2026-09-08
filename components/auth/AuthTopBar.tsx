import { Check } from 'lucide-react'

export function AuthTopBar() {
  return (
    <header className="w-full border-b border-slate-800/80 bg-[#0F172A]/80 backdrop-blur-md px-4 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between z-20">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
          <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
        </div>
        <span className="text-white font-bold text-base sm:text-lg tracking-tight">ProMaP</span>
        <div className="hidden sm:block h-4 w-px bg-slate-700" />
        <span className="hidden md:inline-block text-xs text-slate-400 font-medium">
          Platform Eksekusi &amp; Tata Kelola Tim
        </span>
      </div>

      <a
        href="#help"
        className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-medium"
      >
        <span className="hidden sm:inline">Panduan Hak Akses</span>
      </a>
    </header>
  )
}
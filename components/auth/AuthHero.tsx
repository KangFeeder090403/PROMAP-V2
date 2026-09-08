import { CheckSquare, ClipboardCheck, Eye, Network } from 'lucide-react'

const ROLES = [
  {
    icon: Eye,
    name: 'Super Admin',
    desc: 'Memantau semua tenant & alur prospek',
  },
  {
    icon: Network,
    name: 'Admin Operasional',
    desc: 'Mengelola seluruh divisi satu perusahaan',
  },
  {
    icon: ClipboardCheck,
    name: 'Manager',
    desc: 'Meninjau & menyetujui pekerjaan divisi',
  },
  {
    icon: CheckSquare,
    name: 'PIC',
    desc: 'Mengeksekusi tugas & mengunggah bukti',
  },
]

export function AuthHero() {
  return (
    <div className="text-white space-y-8 sm:space-y-12">
      {/* Headline */}
      <div className="space-y-5 sm:space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs text-slate-300 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          Sebuah ruang kerja untuk semua ide tim Anda
        </div>
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15]">
          Satu Tempat untuk Mengubah{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
            Rencana Menjadi Nyata.
          </span>
        </h1>
        <p className="text-slate-300 text-sm sm:text-base lg:text-lg max-w-xl leading-relaxed">
          Rapikan alur kerja tim Anda — dari ide, tugas, hingga aksi nyata. Setiap langkah
          tercatat, setiap penyelesaian terbukti, dan setiap pencapaian terukur dalam satu
          wadah yang sama.
        </p>
      </div>

      {/* Role badges — grid di desktop, horizontal scroll di mobile */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {ROLES.map((role) => (
          <div
            key={role.name}
            className="group p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.12] hover:-translate-y-0.5"
          >
            <div
              className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${'bg-white/[0.06] text-slate-300 border-white/[0.08]'} mb-3 transition-transform duration-300 group-hover:scale-110`}
            >
              <role.icon className="w-[18px] h-[18px]" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-slate-100">{role.name}</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{role.desc}</p>
          </div>
        ))}
      </div>

      {/* Trust note */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08] transition-colors duration-300 hover:border-white/[0.14]">
        <p className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" aria-hidden="true" />
          Data Anda terlindungi
        </p>
        <p className="text-slate-400 leading-relaxed text-xs mt-1.5">
          Akses hanya untuk tim yang berwenang. Kehadiran tercatat, keputusan terdokumentasi,
          dan setiap tim bekerja dalam lingkupnya sendiri.
        </p>
      </div>
    </div>
  )
}
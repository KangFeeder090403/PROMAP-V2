import { BarChart3, CheckCircle, FileText } from 'lucide-react'

const FEATURES = [
  {
    icon: BarChart3,
    badge: '📊 Monitoring & Pantau',
    title: 'Pantau Eksekusi Rencana',
    description:
      'Monitoring progress dari inisiatif strategis tinggi, Kanban Board dinamis, dan Calendar jadwal — setiap eksekusi terpantau real-time.',
    cta: 'Project → Task → Action Plan Eksekusi',
  },
  {
    icon: CheckCircle,
    badge: '✅ Verifikasi & Approval',
    title: 'Alur Persetujuan dengan Bukti Kerja',
    description:
      'Pengumpulan evidence kerja, alur tiga lapis persetujuan, dan aksi tindak lanjut yang tercatat selama masa input berlangsung.',
    cta: 'AP → Evidence Upload → Approval 3 Lapis',
  },
  {
    icon: FileText,
    badge: '📄 Analitik & Ekspor',
    title: 'Laporan untuk Manajemen',
    description:
      'Ekspor PDF/Excel laporan performa eksekusi yang bisa langsung dipresentasikan ke Dewan Direksi. Transparan, akurat, siap audit.',
    cta: 'Ekspor PDF langsung ke presentasi PDF',
  },
]

export function FeatureCards() {
  return (
    <section id="fitur" className="bg-white py-16 sm:py-20 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Keunggulan Utama Promap
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Dirancang untuk Ketepatan Eksekusi &amp; Audit Tanpa Celah
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 dark:text-slate-400">
            Hilangkan silo operasional, gentikan operasional padat kertas, dan pastikan setiap individu manajemen
            terlibat dalam satu alur yang satu — tanpa kebingungan.
          </p>
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className="group flex flex-col rounded-xl border border-slate-200 bg-slate-50/50 p-6 transition-all hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-800/30 dark:hover:border-blue-900/50 dark:hover:bg-blue-950/20"
            >
              {/* Icon */}
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm group-hover:border-blue-200 group-hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:group-hover:bg-blue-950/40">
                <feat.icon
                  className="h-5 w-5 text-slate-500 group-hover:text-blue-600 dark:text-slate-400 dark:group-hover:text-blue-400"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </div>

              {/* Badge */}
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {feat.badge}
              </p>

              {/* Title */}
              <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
                {feat.title}
              </h3>

              {/* Description */}
              <p className="flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {feat.description}
              </p>

              {/* CTA text */}
              <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  → {feat.cta}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

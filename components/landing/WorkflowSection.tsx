import { CheckCircle2, FileUp, UserCheck } from 'lucide-react'

const STEPS = [
  {
    number: '01',
    icon: UserCheck,
    title: 'Pendelegasian & Breakdown',
    description:
      'Dewan Direksi atau Manager mendelegasikan target kerja ke masing-masing PIC dengan scope, deadline, dan prioritas yang spesifik.',
  },
  {
    number: '02',
    icon: FileUp,
    title: 'Unggah Dokumen / Bukti (Evidence)',
    description:
      'PIC mengerjakan rencana aksi dan mengunggah bukti penyelesaian (PDF, Excel, gambar) — sistem mencatat selama masa input berlangsung.',
  },
  {
    number: '03',
    icon: CheckCircle2,
    title: 'Verifikasi & Pengesahan Manajer',
    description:
      'Manajer mereview evidence yang diunggah, bisa menolak atau menyetujui. Setiap keputusan terekam dalam audit log otomatis.',
  },
]

// Evidence panel preview data
const EVIDENCE_ITEMS = [
  { name: 'Kontrak Kerjasama Terbaru.pdf', type: 'PDF', size: '2.4 MB', status: 'Approved' },
  { name: 'Bambang Wijaya Foto Pengesahan.jpg', type: 'IMG', size: '840 KB', status: 'Approved' },
  { name: 'Akhir Durasi Kontrak.xlsx', type: 'XLS', size: '1.1 MB', status: 'Review' },
]

export function WorkflowSection() {
  return (
    <section id="alur" className="bg-slate-50 py-16 sm:py-20 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mb-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Struktur Standar Korporasi
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Alur Terstruktur: Dari Arahan Dewan Direksi Menjadi Tindakan Nyata
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Sistem pengawasan eksekusi berlangsung menyeluruh — recommendation target setiap satu
            tingkat ke bawah, dan setiap langkah dapat diaudit. Tidak ada tugas yang hilang dari pengamatan.
          </p>
        </div>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Left: Steps */}
          <div className="flex flex-col gap-8">
            {STEPS.map((step, idx) => (
              <div key={step.number} className="flex gap-5">
                {/* Step number + line */}
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-800 text-sm font-bold text-white">
                    {step.number}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className="mt-2 w-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  )}
                </div>
                {/* Content */}
                <div className="pb-2">
                  <div className="mb-1.5 flex items-center gap-2">
                    <step.icon
                      className="h-4 w-4 text-blue-600 dark:text-blue-400"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Evidence panel preview */}
          <div className="flex flex-col justify-center">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
              {/* Panel header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Panel Validasi Evidence
                  </p>
                  <h4 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
                    AP-1142 · Pembaruan Kontrak
                  </h4>
                </div>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  Approval Pending
                </span>
              </div>

              {/* Evidence items */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {EVIDENCE_ITEMS.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 px-5 py-3.5"
                  >
                    {/* File type badge */}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      {item.type}
                    </span>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-400">{item.size}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        item.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                <button
                  type="button"
                  className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Tolak & Minta Revisi
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Mulai & Verif Task
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

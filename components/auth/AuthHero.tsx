import { ClipboardCheck, ListTodo, Target } from 'lucide-react'

const FLOW = [
  {
    icon: Target,
    name: 'Rencana',
    desc: 'Project dipecah jadi task dengan penanggung jawab yang jelas.',
  },
  {
    icon: ListTodo,
    name: 'Eksekusi',
    desc: 'PIC mengerjakan action plan, statusnya terlihat oleh seluruh tim.',
  },
  {
    icon: ClipboardCheck,
    name: 'Bukti',
    desc: 'Manager menyetujui setelah bukti penyelesaian diunggah.',
  },
]

export function AuthHero() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="space-y-5">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Satu tempat kerja
          <br />
          untuk seluruh tim.
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
          Dari rencana sampai bukti selesai. Project, task, dan action plan berjalan dalam
          satu alur yang sama — setiap langkah tercatat, setiap penyelesaian terbukti.
        </p>
      </div>

      {/* Alur kerja produk — bukan daftar role, karena role ditentukan sistem, bukan dipilih saat masuk */}
      <ol className="space-y-4">
        {FLOW.map((step, i) => (
          <li key={step.name} className="flex gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800">
              <step.icon
                className="h-4 w-4 text-slate-500 dark:text-slate-300"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {i + 1}. {step.name}
              </p>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {step.desc}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

'use client'

import { AlertTriangle, ShieldCheck, ShieldAlert, Layers } from 'lucide-react'
import type { Priority } from '@/lib/generated/prisma/client'

interface PriorityRiskMatrixProps {
  priorityBreakdown: { priority: Priority; count: number }[]
  total: number
  overdueCount?: number
}

const PRIORITY_META: Record<
  Priority,
  {
    label: string
    sublabel: string
    dot: string
    bar: string
    badge: string
    bg: string
    border: string
  }
> = {
  HIGH: {
    label: 'Prioritas Tinggi',
    sublabel: 'Kritis & berdampak langsung',
    dot: 'bg-red-500',
    bar: 'bg-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    bg: 'bg-red-50/50 dark:bg-red-950/20',
    border: 'border-red-100 dark:border-red-900/40',
  },
  MEDIUM: {
    label: 'Prioritas Sedang',
    sublabel: 'Rutinitas operasional standar',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    bg: 'bg-amber-50/50 dark:bg-amber-950/20',
    border: 'border-amber-100 dark:border-amber-900/40',
  },
  LOW: {
    label: 'Prioritas Rendah',
    sublabel: 'Dukungan & pemeliharaan berkala',
    dot: 'bg-blue-500',
    bar: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    bg: 'bg-blue-50/50 dark:bg-blue-950/20',
    border: 'border-blue-100 dark:border-blue-900/40',
  },
}

export function PriorityRiskMatrix({
  priorityBreakdown,
  total,
  overdueCount = 0,
}: PriorityRiskMatrixProps) {
  const safeTotal = Math.max(total, 1)

  const highPriority = priorityBreakdown.find((p) => p.priority === 'HIGH')
  const highCount = highPriority?.count ?? 0
  const highRatio = Math.round((highCount / safeTotal) * 100)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 flex flex-col justify-between w-full min-w-0">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <Layers className="w-4 h-4" aria-hidden="true" />
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Matriks Prioritas &amp; Risiko
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Sebaran tingkat kepentingan rencana aksi terhadap risiko keterlambatan
            </p>
          </div>

          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
            Total {total} AP
          </span>
        </div>

        {total === 0 ? (
          <p className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
            Belum ada rencana aksi dalam rentang pemantauan ini.
          </p>
        ) : (
          <div className="space-y-3.5 mt-2">
            {priorityBreakdown.map((item) => {
              const meta = PRIORITY_META[item.priority]
              const pct = Math.round((item.count / safeTotal) * 100)

              return (
                <div
                  key={item.priority}
                  className={`p-3.5 rounded-xl border ${meta.bg} ${meta.border} transition-colors space-y-2`}
                >
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.dot}`} aria-hidden="true" />
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1.5 hidden sm:inline">
                          &bull; {meta.sublabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs shrink-0">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {item.count} AP
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${meta.badge}`}>
                        {pct}%
                      </span>
                    </div>
                  </div>

                  <div className="h-2 w-full bg-white/80 dark:bg-slate-800 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
                    <div
                      className={`h-full rounded-full transition-all ${meta.bar}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer Status Kesiapan */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 truncate">
          {overdueCount > 0 ? (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
              <span className="text-slate-600 dark:text-slate-400 truncate">
                Terdapat <strong>{overdueCount} tugas terlambat</strong> pada beban saat ini.
              </span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden="true" />
              <span className="text-slate-600 dark:text-slate-400 truncate">
                Kondisi aman — tidak ada rencana aksi prioritas tinggi yang terhambat.
              </span>
            </>
          )}
        </div>

        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
          Rasio Kritis: {highRatio}%
        </span>
      </div>
    </div>
  )
}

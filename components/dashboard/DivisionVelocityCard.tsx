'use client'

import { AlertTriangle, Building2, CheckCircle2, TrendingUp } from 'lucide-react'
import type { PortfolioSummary } from '@/lib/types/dashboard'
import { DashboardSectionHeader } from './DashboardSectionHeader'

interface DivisionVelocityCardProps {
  portfolio: PortfolioSummary
}

export function DivisionVelocityCard({ portfolio }: DivisionVelocityCardProps) {
  const { divisionProgress } = portfolio

  const bestDivision = divisionProgress[0]
  const bottleneckDivision = [...divisionProgress].sort((a, b) => b.overdueRate - a.overdueRate)[0]

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 flex flex-col justify-between w-full min-w-0">
      <div>
        <DashboardSectionHeader
          icon={<Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />}
          title="Kinerja &amp; Beban Kerja per Divisi"
          subtitle="Perbandingan penyelesaian tugas dan kendala keterlambatan antar divisi"
        />

        {divisionProgress.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
            Belum ada data divisi yang terpetakan dalam portofolio ini.
          </p>
        ) : (
          <div className="space-y-4">
            {divisionProgress.map((d) => (
              <div key={d.id} className="space-y-1.5 min-w-0">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {d.name}
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                    <span className="text-slate-500 dark:text-slate-400">
                      {d.done}/{d.total} selesai
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {d.completionRate}%
                    </span>
                    {d.overdue > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-[10px] font-bold">
                        {d.overdue} terlambat
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full bg-emerald-500 rounded-l-full transition-all"
                    style={{ width: `${d.completionRate}%` }}
                    title={`Selesai: ${d.completionRate}%`}
                  />
                  {d.overdueRate > 0 && (
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{ width: `${d.overdueRate}%` }}
                      title={`Terlambat: ${d.overdueRate}%`}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {bestDivision && bottleneckDivision && (
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 truncate">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <span className="truncate">
              Kinerja Tertinggi:{' '}
              <strong className="font-semibold text-slate-800 dark:text-slate-200">
                {bestDivision.name}
              </strong>{' '}
              ({bestDivision.completionRate}%)
            </span>
          </div>

          {bottleneckDivision.overdue > 0 && (
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 shrink-0 font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {bottleneckDivision.name} ({bottleneckDivision.overdue} terlambat)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

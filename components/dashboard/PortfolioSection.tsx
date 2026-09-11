'use client'

import Link from 'next/link'
import { Activity, Building2, CalendarClock } from 'lucide-react'
import type { PortfolioSummary } from '@/lib/types/dashboard'

const HEALTH_META = {
  ON_TRACK: { label: 'Sesuai Rencana', dot: 'bg-emerald-500', bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
  AT_RISK: { label: 'Perlu Perhatian', dot: 'bg-amber-500', bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  DELAYED: { label: 'Terlambat', dot: 'bg-red-500', bar: 'bg-red-500', text: 'text-red-700 dark:text-red-300' },
} as const

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-5">
      {children}
    </div>
  )
}

function Head({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2 pb-4">
      <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
        {icon}
      </span>
      <div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</span>
      </div>
    </div>
  )
}

export function PortfolioSection({ portfolio }: { portfolio: PortfolioSummary }) {
  const { healthSummary, projectHealth, divisionProgress, upcomingMilestones } = portfolio
  const totalProjects = projectHealth.length

  const best = divisionProgress[0]
  const bottleneck = [...divisionProgress].sort((a, b) => b.overdueRate - a.overdueRate)[0]

  return (
    <div className="space-y-6">
      {/* 1. Ringkasan Kesehatan Proyek */}
      <Card>
        <Head
          icon={<Activity className="w-5 h-5" aria-hidden="true" />}
          title="Kesehatan Proyek"
          subtitle={`${totalProjects} project aktif dalam pantauan Anda`}
        />

        {totalProjects === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
            Belum ada project aktif untuk dipantau.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {(['ON_TRACK', 'AT_RISK', 'DELAYED'] as const).map((key) => {
                const meta = HEALTH_META[key]
                const value =
                  key === 'ON_TRACK'
                    ? healthSummary.onTrack
                    : key === 'AT_RISK'
                      ? healthSummary.atRisk
                      : healthSummary.delayed
                return (
                  <div
                    key={key}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-3 py-2.5"
                  >
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                      <span className={`w-2 h-2 rounded-full ${meta.dot}`} aria-hidden="true" />
                      {meta.label}
                    </span>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
                      {value}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              {projectHealth.slice(0, 6).map((p) => {
                const meta = HEALTH_META[p.health]
                return (
                  <div key={p.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <Link
                        href={`/projects/${p.id}`}
                        className="truncate font-medium text-slate-700 hover:text-blue-600 hover:underline dark:text-slate-300 dark:hover:text-blue-400"
                      >
                        {p.name}
                      </Link>
                      <span className={`shrink-0 font-mono ${meta.text}`}>
                        {p.progress}%
                        {p.overdueTasks > 0 && ` · ${p.overdueTasks} telat`}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                      <div className={`h-full ${meta.bar}`} style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Perbandingan Lintas Divisi */}
        <Card>
          <Head
            icon={<Building2 className="w-5 h-5" aria-hidden="true" />}
            title="Progres Lintas Divisi"
            subtitle="Divisi mana yang paling lancar, mana yang tersendat"
          />

          {divisionProgress.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Belum ada task yang bisa dibandingkan antar divisi.
            </p>
          ) : (
            <>
              <div className="space-y-3.5">
                {divisionProgress.map((d) => (
                  <div key={d.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate font-medium text-slate-700 dark:text-slate-300">{d.name}</span>
                      <span className="shrink-0 font-mono text-slate-500 dark:text-slate-400">
                        {d.done}/{d.total} · {d.completionRate}%
                        {d.overdue > 0 && (
                          <span className="ml-1.5 text-red-600 dark:text-red-400">{d.overdue} telat</span>
                        )}
                      </span>
                    </div>
                    <div className="flex h-2.5 w-full overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                      <div className="h-full bg-emerald-500" style={{ width: `${d.completionRate}%` }} />
                      <div className="h-full bg-red-500" style={{ width: `${d.overdueRate}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {best && bottleneck && (
                <p className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-500 dark:text-slate-400">
                  Tercepat: <span className="font-medium text-slate-700 dark:text-slate-300">{best.name}</span> ({best.completionRate}%).
                  {bottleneck.overdue > 0 && (
                    <>
                      {' '}Paling tersendat:{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">{bottleneck.name}</span> ({bottleneck.overdueRate}% telat).
                    </>
                  )}
                </p>
              )}
            </>
          )}
        </Card>

        {/* 3. Radar Tenggat 14 hari */}
        <Card>
          <Head
            icon={<CalendarClock className="w-5 h-5" aria-hidden="true" />}
            title="Radar Tenggat"
            subtitle="Target besar yang jatuh tempo dalam 14 hari ke depan"
          />

          {upcomingMilestones.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Tidak ada tenggat dalam 14 hari ke depan.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {upcomingMilestones.map((m, i) => {
                const urgent = m.daysLeft <= 3
                return (
                  <li key={`${m.projectId}-${i}`} className="flex items-center gap-3 py-2.5">
                    <span
                      className={`w-14 shrink-0 rounded-md px-2 py-1 text-center text-xs font-semibold tabular-nums ${
                        urgent
                          ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {m.daysLeft}h lagi
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{m.title}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {m.projectName} · {m.divisionName}
                      </p>
                    </div>
                    <Link
                      href={`/projects/${m.projectId}`}
                      className="shrink-0 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Lihat →
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

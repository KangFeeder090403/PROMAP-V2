'use client'

import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Layers,
  TrendingUp,
  Zap,
} from 'lucide-react'
import type { PortfolioSummary, ProjectHealth } from '@/lib/types/dashboard'

const HEALTH_CONFIG: Record<
  ProjectHealth,
  {
    label: string
    dot: string
    badge: string
    bar: string
    text: string
  }
> = {
  ON_TRACK: {
    label: 'Sesuai Target',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    bar: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  AT_RISK: {
    label: 'Perlu Perhatian',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    bar: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
  },
  DELAYED: {
    label: 'Terlambat',
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
    bar: 'bg-red-500',
    text: 'text-red-700 dark:text-red-300',
  },
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 transition-all ${className}`}
    >
      {children}
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function PortfolioSection({ portfolio }: { portfolio: PortfolioSummary }) {
  const { healthSummary, projectHealth, divisionProgress, upcomingMilestones } = portfolio
  const totalProjects = projectHealth.length

  // Health Score Calculation (% on track)
  const healthScore =
    totalProjects > 0
      ? Math.round(
          ((healthSummary.onTrack * 1.0 + healthSummary.atRisk * 0.5) / totalProjects) * 100
        )
      : 100

  const totalOverdueTasks = projectHealth.reduce((acc, p) => acc + p.overdueTasks, 0)
  const totalTasks = projectHealth.reduce((acc, p) => acc + p.taskCount, 0)

  const bestDivision = divisionProgress[0]
  const bottleneckDivision = [...divisionProgress].sort((a, b) => b.overdueRate - a.overdueRate)[0]

  if (totalProjects === 0) {
    return (
      <Card>
        <SectionHeader
          icon={<Layers className="w-4 h-4" aria-hidden="true" />}
          title="Helicopter View &amp; Portofolio Proyek"
          subtitle="Tinjauan eksekutif progres dan kapasitas seluruh inisiatif"
        />
        <div className="py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
            <Layers className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Belum ada proyek aktif
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Buat proyek baru untuk mengaktifkan ringkasan kesehatan portofolio, progres lintas divisi, dan radar tenggat waktu.
          </p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 mt-4 px-3.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors shadow-xs"
          >
            Buka Menu Proyek &rarr;
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. EXECUTIVE HEALTH STRIP (Command Header) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Overall Health Score */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Kesehatan Portofolio
            </span>
            <div className="p-1.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Zap className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums">
              {healthScore}%
            </span>
            <span
              className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                healthScore >= 80
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : healthScore >= 50
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
              }`}
            >
              {healthScore >= 80 ? 'Optimal' : healthScore >= 50 ? 'Waspada' : 'Kritis'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Dari total {totalProjects} proyek aktif
          </p>
        </div>

        {/* Metric 2: On Track */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Sesuai Target (On Track)
            </span>
            <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              {healthSummary.onTrack}
            </span>
            <span className="text-xs text-slate-400">proyek</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {Math.round((healthSummary.onTrack / totalProjects) * 100)}% dari portofolio
          </p>
        </div>

        {/* Metric 3: Needs Attention */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Perlu Perhatian (At Risk)
            </span>
            <div className="p-1.5 rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
              {healthSummary.atRisk}
            </span>
            <span className="text-xs text-slate-400">proyek</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Mendekati tenggat waktu
          </p>
        </div>

        {/* Metric 4: Delayed / Overdue Bottlenecks */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Terlambat / Tertahan
            </span>
            <div className="p-1.5 rounded-md bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-red-600 dark:text-red-400 tabular-nums">
              {healthSummary.delayed}
            </span>
            <span className="text-xs text-slate-400">proyek</span>
          </div>
          <p className="text-[11px] text-red-500/80 dark:text-red-400/80 mt-1 font-medium">
            {totalOverdueTasks > 0 ? `${totalOverdueTasks} task telat terdeteksi` : 'Nol task terlambat'}
          </p>
        </div>
      </div>

      {/* 2. PROJECT PORTFOLIO MATRIX & MINI GANTT HORIZON */}
      <Card>
        <SectionHeader
          icon={<Activity className="w-4 h-4" aria-hidden="true" />}
          title="Matriks Progres &amp; Kesehatan Inisiatif"
          subtitle="Pantau laju penyelesaian, status kesehatan, dan risiko setiap proyek aktif"
          action={
            <Link
              href="/projects"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
            >
              <span>Semua Proyek</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        />

        <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800/70">
          {projectHealth.map((p) => {
            const meta = HEALTH_CONFIG[p.health]
            const isFinished = p.progress === 100
            return (
              <div key={p.id} className="pt-4 first:pt-0 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.dot}`} />
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-medium text-sm text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 truncate hover:underline"
                      title={p.name}
                    >
                      {p.name}
                    </Link>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${meta.badge}`}
                    >
                      {meta.label}
                    </span>
                    <span className="text-xs font-semibold font-mono tabular-nums text-slate-700 dark:text-slate-300 w-12 text-right">
                      {p.progress}%
                    </span>
                  </div>
                </div>

                {/* Visual Progress Bar (Multi-Segment) */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isFinished
                        ? 'bg-emerald-500'
                        : meta.bar
                    }`}
                    style={{ width: `${Math.max(p.progress, 2)}%` }}
                  />
                </div>

                {/* Sub-details (Tasks count, Due, Overdue alerts) */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3 text-slate-400" />
                      {p.taskCount} Sub-Task
                    </span>
                    {p.overdueTasks > 0 && (
                      <span className="flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-3 w-3" />
                        {p.overdueTasks} Terlambat
                      </span>
                    )}
                  </div>

                  {p.endDate && (
                    <div className="flex items-center gap-1 font-mono">
                      <CalendarClock className="h-3 w-3 text-slate-400" />
                      <span>Target: {new Date(p.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* 3. DUAL COLUMN: DIVISION VELOCITY & RADAR TENGGAT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom Kiri: Kecepatan & Progres Lintas Divisi */}
        <Card className="flex flex-col justify-between">
          <div>
            <SectionHeader
              icon={<Building2 className="w-4 h-4" aria-hidden="true" />}
              title="Kapasitas &amp; Progres Lintas Divisi"
              subtitle="Komparasi laju eksekusi dan bottleneck per divisi"
            />

            {divisionProgress.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                Belum ada data pembagian divisi yang terpetakan.
              </p>
            ) : (
              <div className="space-y-4">
                {divisionProgress.map((d) => (
                  <div key={d.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                        {d.name}
                      </span>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-slate-600 dark:text-slate-400">
                          {d.done}/{d.total} selesai
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {d.completionRate}%
                        </span>
                        {d.overdue > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 text-[10px] font-bold">
                            {d.overdue} telat
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full bg-emerald-500 rounded-l-full transition-all"
                        style={{ width: `${d.completionRate}%` }}
                      />
                      {d.overdueRate > 0 && (
                        <div
                          className="h-full bg-red-500 transition-all"
                          style={{ width: `${d.overdueRate}%` }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {bestDivision && bottleneckDivision && (
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 truncate">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Tercepat: <strong className="font-medium text-slate-700 dark:text-slate-300">{bestDivision.name}</strong> ({bestDivision.completionRate}%)</span>
              </div>
              {bottleneckDivision.overdue > 0 && (
                <div className="flex items-center gap-1 text-red-600 dark:text-red-400 shrink-0 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{bottleneckDivision.name} ({bottleneckDivision.overdue} telat)</span>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Kolom Kanan: Radar Tenggat 14 Hari */}
        <Card className="flex flex-col justify-between">
          <div>
            <SectionHeader
              icon={<CalendarClock className="w-4 h-4" aria-hidden="true" />}
              title="Radar Tenggat Waktu (14 Hari)"
              subtitle="Milestone dan target kritis yang jatuh tempo segera"
            />

            {upcomingMilestones.length === 0 ? (
              <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  Semua target aman
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tidak ada tenggat kritis dalam 14 hari ke depan.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {upcomingMilestones.map((m, i) => {
                  const urgent = m.daysLeft <= 3
                  return (
                    <div
                      key={`${m.projectId}-${i}`}
                      className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                        urgent
                          ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200/80 dark:border-red-900/50'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-12 h-10 rounded-md flex flex-col items-center justify-center font-mono shrink-0 leading-none ${
                            urgent
                              ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-bold'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span className="text-xs">{m.daysLeft}</span>
                          <span className="text-[9px] uppercase">hari</span>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate" title={m.title}>
                            {m.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {m.projectName} &bull; {m.divisionName}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/projects/${m.projectId}`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-900 transition-colors shrink-0"
                        title="Buka Proyek"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Horizon pemantauan: <strong>14 Hari ke Depan</strong></span>
            <Link href="/calendar" className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-medium">
              Buka Kalender &rarr;
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}

'use client'

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Layers,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react'
import type { DashboardUser, PortfolioSummary } from '@/lib/types/dashboard'
import Link from 'next/link'

interface ExecutiveNarrativeDigestProps {
  portfolio: PortfolioSummary
  user: DashboardUser
  greeting?: string
  actionRequiredCount?: number
}

export function ExecutiveNarrativeDigest({
  portfolio,
  user,
  actionRequiredCount,
}: ExecutiveNarrativeDigestProps) {
  const {
    executiveDigest,
    healthSummary,
    predictabilityScore,
    projectHealth,
    bottleneckSummary,
  } = portfolio

  const totalProjects = projectHealth.length
  const { headline, healthScore, keyBlockers, keyMilestones, urgentDecisions } = executiveDigest

  const isOptimal = healthScore >= 80
  const isWarning = healthScore >= 50 && healthScore < 80
  const isCritical = healthScore < 50

  const totalPendingDecisions =
    actionRequiredCount ??
    ((keyBlockers.length > 0 && urgentDecisions[0]?.includes('Tidak ada') ? 0 : 1) *
      urgentDecisions.filter((d) => !d.includes('Tidak ada')).length)

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden w-full min-w-0">
      {/* 1. Header Ringkasan & Diagnosis Eksekutif */}
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800/40">
              Ringkasan Eksekutif Portofolio
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              &bull; {user.companyName ?? 'Perusahaan'}
              {user.divisionName ? ` · Divisi ${user.divisionName}` : ''}
            </span>
          </div>

          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 max-w-4xl leading-relaxed pt-1">
            {headline}
          </p>
        </div>

        {/* 2. Empat Pilar Metrik Makro Terintegrasi */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5 pt-5 border-t border-slate-200/60 dark:border-slate-800/80">
          {/* Pilar 1: Kesehatan Portofolio */}
          <div className="bg-white/80 dark:bg-slate-800/60 p-3.5 sm:p-4 rounded-xl border border-slate-200/70 dark:border-slate-700/60 shadow-xs">
            <div className="flex items-center justify-between gap-1 text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Kesehatan Portofolio</span>
              <Activity className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-slate-50 tabular-nums">
                {healthScore}%
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isOptimal
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                    : isWarning
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300'
                }`}
              >
                {healthScore >= 80 ? 'Sesuai Target' : healthScore >= 50 ? 'Perlu Perhatian' : 'Kritis'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              {totalProjects} proyek aktif dipantau
            </p>
          </div>

          {/* Pilar 2: Ketepatan Jadwal */}
          <div className="bg-white/80 dark:bg-slate-800/60 p-3.5 sm:p-4 rounded-xl border border-slate-200/70 dark:border-slate-700/60 shadow-xs">
            <div className="flex items-center justify-between gap-1 text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Ketepatan Jadwal</span>
              <Compass className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-slate-50 tabular-nums">
                {predictabilityScore}%
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  predictabilityScore >= 80
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                }`}
              >
                {predictabilityScore >= 80 ? 'Tepat Waktu' : 'Ada Keterlambatan'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              Persentase tugas bebas keterlambatan
            </p>
          </div>

          {/* Pilar 3: Status Proyek */}
          <div className="bg-white/80 dark:bg-slate-800/60 p-3.5 sm:p-4 rounded-xl border border-slate-200/70 dark:border-slate-700/60 shadow-xs">
            <div className="flex items-center justify-between gap-1 text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Status Proyek</span>
              <Layers className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </div>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {healthSummary.onTrack}
              </span>
              <span className="text-xs text-slate-400">/</span>
              <span className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {healthSummary.atRisk}
              </span>
              <span className="text-xs text-slate-400">/</span>
              <span className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">
                {healthSummary.delayed}
              </span>
              <span className="text-[10px] text-slate-400 ml-1 font-sans">
                (Tepat / Perhatian / Terlambat)
              </span>
            </div>
            <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              {totalProjects > 0 && (
                <>
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${(healthSummary.onTrack / totalProjects) * 100}%` }}
                  />
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${(healthSummary.atRisk / totalProjects) * 100}%` }}
                  />
                  <div
                    className="h-full bg-red-500 transition-all"
                    style={{ width: `${(healthSummary.delayed / totalProjects) * 100}%` }}
                  />
                </>
              )}
            </div>
          </div>

          {/* Pilar 4: Persetujuan Tertunda */}
          <div className="bg-white/80 dark:bg-slate-800/60 p-3.5 sm:p-4 rounded-xl border border-slate-200/70 dark:border-slate-700/60 shadow-xs">
            <div className="flex items-center justify-between gap-1 text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Persetujuan Tertunda</span>
              <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-slate-50 tabular-nums">
                {totalPendingDecisions}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">butuh tindakan</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              Proposal dan verifikasi bukti
            </p>
          </div>
        </div>
      </div>

      {/* 3. Tiga Kolom Sintesis Naratif (Konteks Kualitatif Nyata) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800 p-5 sm:p-6 gap-6 lg:gap-0">
        {/* Kolom 1: Kendala & Hambatan Kritis */}
        <div className="lg:pr-6 space-y-3">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <div className="p-1.5 rounded-lg bg-red-100/80 dark:bg-red-950/60 text-red-700 dark:text-red-400 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Kendala &amp; Hambatan Kritis
            </h3>
          </div>

          <div className="space-y-2.5">
            {keyBlockers.map((blocker, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
              >
                {blocker}
              </div>
            ))}
          </div>
        </div>

        {/* Kolom 2: Pencapaian & Kinerja Positif */}
        <div className="lg:px-6 space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <div className="p-1.5 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Pencapaian &amp; Kinerja Positif
            </h3>
          </div>

          <div className="space-y-2.5">
            {keyMilestones.map((milestone, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
              >
                {milestone}
              </div>
            ))}
          </div>
        </div>

        {/* Kolom 3: Persetujuan Menunggu Tindakan */}
        <div className="lg:pl-6 space-y-3">
          <div className="flex items-center justify-between gap-2 text-amber-700 dark:text-amber-400">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-100/80 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 shrink-0">
                <Zap className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Persetujuan Menunggu Tindakan
              </h3>
            </div>
            <Link
              href="/proposals"
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
            >
              <span>Tinjau Semua</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {urgentDecisions.map((decision, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
              >
                {decision}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

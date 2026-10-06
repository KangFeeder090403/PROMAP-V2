'use client'

import { useEffect, useState } from 'react'
import {
  Users,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Activity,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'
import type { ContributorAnalysisResponse, ContributorProjectRow } from '@/app/api/dashboard/contributor-analysis/route'

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function RateBar({ rate }: { rate: number }) {
  const color =
    rate >= 80
      ? 'bg-emerald-500'
      : rate >= 50
        ? 'bg-amber-500'
        : 'bg-red-500'
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${rate}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 w-8 text-right shrink-0">
        {rate}%
      </span>
    </div>
  )
}

function ProjectTable({ projects }: { projects: ContributorProjectRow[] }) {
  return (
    <div className="mt-2 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
          <tr>
            <th className="py-2 px-3 text-left font-medium">Proyek / Inisiatif</th>
            <th className="py-2 px-2 text-center font-medium w-14">Total</th>
            <th className="py-2 px-2 text-center font-medium w-16">Selesai</th>
            <th className="py-2 px-2 text-center font-medium w-16">Terlambat</th>
            <th className="py-2 px-3 font-medium w-32">Penyelesaian</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {projects.map((p) => (
            <tr key={`${p.projectId}-${p.taskId}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="py-2 px-3 text-slate-700 dark:text-slate-200 font-medium">
                <div className="truncate max-w-[180px]">
                  {p.projectName === 'Personal' ? (
                    <span className="italic text-slate-400 dark:text-slate-500">Personal</span>
                  ) : (
                    p.projectName
                  )}
                </div>
                {p.taskTitle && p.taskTitle !== p.projectName && (
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[180px]">
                    {p.taskTitle}
                  </div>
                )}
              </td>
              <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400">{p.total}</td>
              <td className="py-2 px-2 text-center">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{p.complete}</span>
              </td>
              <td className="py-2 px-2 text-center">
                {p.overdue > 0 ? (
                  <span className="text-red-600 dark:text-red-400 font-medium">{p.overdue}</span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="py-2 px-3">
                <RateBar rate={p.completionRate} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ContributorCard({ contributor }: { contributor: ContributorAnalysisResponse }) {
  const [expanded, setExpanded] = useState(false)
  const rateColor =
    contributor.overallRate >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : contributor.overallRate >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400'

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
            {initials(contributor.picName)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {contributor.picName}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {contributor.projects.length} proyek · {contributor.totalAP} AP
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Selesai</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {contributor.completedAP}/{contributor.totalAP}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Rate</p>
            <p className={`text-sm font-bold ${rateColor}`}>{contributor.overallRate}%</p>
          </div>
          <button
            type="button"
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label={expanded ? 'Tutup detail' : 'Lihat detail proyek'}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 pt-3">
          <ProjectTable projects={contributor.projects} />
        </div>
      )}
    </div>
  )
}

export function ContributorAnalysisSection() {
  const [data, setData] = useState<ContributorAnalysisResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/contributor-analysis')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((json) => setData(Array.isArray(json.contributors) ? json.contributors : []))
      .catch(() => setError('Gagal memuat data analisis kontributor'))
      .finally(() => setLoading(false))
  }, [])

  const totalAP = data.reduce((s, c) => s + c.totalAP, 0)
  const totalComplete = data.reduce((s, c) => s + c.completedAP, 0)
  const overallRate = totalAP > 0 ? Math.round((totalComplete / totalAP) * 100) : 0

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center">
            <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Analisis Proyek Kontributor
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Capaian kerja per kontributor berdasarkan proyek
            </p>
          </div>
        </div>

        {!loading && !error && data.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {totalComplete}/{totalAP} AP
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-violet-500" />
              {overallRate}% selesai
            </span>
          </div>
        )}
      </div>

      {/* Summary stat tiles */}
      {!loading && !error && data.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-center">
            <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{data.length}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Kontributor</p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-center">
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalAP}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Total AP</p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-center">
            <p className={`text-lg font-bold ${overallRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : overallRate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
              {overallRate}%
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Penyelesaian</p>
          </div>
        </div>
      )}

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center py-10 text-slate-400 dark:text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Memuat analisis kontributor…</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500">
          <Activity className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">Belum ada data action plan kontributor</p>
        </div>
      )}

      {/* Cards */}
      {!loading && !error && data.length > 0 && (
        <div className="space-y-2">
          {data.map((contributor) => (
            <ContributorCard key={contributor.picId} contributor={contributor} />
          ))}
        </div>
      )}
    </section>
  )
}

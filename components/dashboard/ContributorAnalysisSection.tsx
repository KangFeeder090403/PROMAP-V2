'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, TrendingUp, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import type { ContributorAnalysisResponse, ContributorProjectRow } from '@/app/api/dashboard/contributor-analysis/route'

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function rateText(rate: number) {
  return rate >= 80
    ? 'text-emerald-600 dark:text-emerald-400'
    : rate >= 50
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400'
}

function RateBar({ rate }: { rate: number }) {
  const color = rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
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
    <div className="overflow-x-auto">
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

function ContributorRow({ contributor }: { contributor: ContributorAnalysisResponse }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      >
        <div className="h-9 w-9 rounded-full bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-blue-700 dark:text-blue-200">{initials(contributor.picName)}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">{contributor.picName}</p>
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
            <p className={`text-sm font-bold ${rateText(contributor.overallRate)}`}>{contributor.overallRate}%</p>
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800">
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

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/dashboard/contributor-analysis')
      if (res.status === 403) {
        setError('Anda tidak punya akses')
        return
      }
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(Array.isArray(json.contributors) ? json.contributors : [])
    } catch {
      setError('Gagal memuat data analisis kontributor')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const totalAP = data.reduce((s, c) => s + c.totalAP, 0)
  const totalComplete = data.reduce((s, c) => s + c.completedAP, 0)
  const overallRate = totalAP > 0 ? Math.round((totalComplete / totalAP) * 100) : 0
  const ready = !loading && !error && data.length > 0

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center">
            <Users className="h-4 w-4 text-blue-700 dark:text-blue-200" aria-hidden />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Analisis Proyek Kontributor</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Capaian kerja per kontributor berdasarkan proyek
            </p>
          </div>
        </div>

        {ready && (
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
              {totalComplete}/{totalAP} AP
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-300" aria-hidden />
              {overallRate}% selesai
            </span>
          </div>
        )}
      </div>

      {loading && (
        <div className="space-y-2" aria-busy="true" aria-label="Memuat analisis kontributor">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">{error}</span>
          {error !== 'Anda tidak punya akses' && (
            <button
              type="button"
              onClick={() => void load()}
              className="h-7 px-3 rounded-md bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Coba lagi
            </button>
          )}
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada action plan di cakupan Anda</p>
          <Link
            href="/action-plans?new=1"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Buat Action Plan
          </Link>
        </div>
      )}

      {ready && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800">
            <div className="p-3 text-center">
              <p className="text-lg font-bold text-blue-600 dark:text-blue-300">{data.length}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Kontributor</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-lg font-bold text-blue-600 dark:text-blue-300">{totalAP}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Total AP</p>
            </div>
            <div className="p-3 text-center">
              <p className={`text-lg font-bold ${rateText(overallRate)}`}>{overallRate}%</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Penyelesaian</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.map((contributor) => (
              <ContributorRow key={contributor.picId} contributor={contributor} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

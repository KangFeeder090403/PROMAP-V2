'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, TrendingUp, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Plus, ArrowRight } from 'lucide-react'
import type { ContributorAnalysisResponse, ContributorProjectRow } from '@/app/api/dashboard/contributor-analysis/route'

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

const LINK_CLASS =
  'inline-flex items-center gap-1 rounded-sm text-xs font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

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
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${rate}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-fg-secondary w-8 text-right shrink-0">
        {rate}%
      </span>
    </div>
  )
}

function ProjectTable({ projects }: { projects: ContributorProjectRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="py-2 px-3 text-left font-medium">Proyek / Inisiatif</th>
            <th className="py-2 px-2 text-center font-medium w-14">Total</th>
            <th className="py-2 px-2 text-center font-medium w-16">Selesai</th>
            <th className="py-2 px-2 text-center font-medium w-16">Terlambat</th>
            <th className="py-2 px-3 font-medium w-32">Penyelesaian</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.map((p) => (
            <tr key={`${p.projectId}-${p.taskId}`} className="hover:bg-accent transition-colors">
              <td className="py-2 px-3 text-fg-secondary font-medium">
                <div className="truncate max-w-[180px]">
                  {p.projectName === 'Personal' ? (
                    <span className="italic text-muted-foreground">Personal</span>
                  ) : (
                    p.projectName
                  )}
                </div>
                {p.taskTitle && p.taskTitle !== p.projectName && (
                  <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                    {p.taskTitle}
                  </div>
                )}
              </td>
              <td className="py-2 px-2 text-center text-fg-secondary">{p.total}</td>
              <td className="py-2 px-2 text-center">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{p.complete}</span>
              </td>
              <td className="py-2 px-2 text-center">
                {p.overdue > 0 ? (
                  <span className="text-red-600 dark:text-red-400 font-medium">{p.overdue}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
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
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-fg-secondary">{initials(contributor.picName)}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{contributor.picName}</p>
          <p className="text-[11px] text-muted-foreground">
            {contributor.projects.length} proyek · {contributor.totalAP} AP
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] text-muted-foreground">Selesai</p>
            <p className="text-sm font-bold text-fg-secondary">
              {contributor.completedAP}/{contributor.totalAP}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Rate</p>
            <p className={`text-sm font-bold ${rateText(contributor.overallRate)}`}>{contributor.overallRate}%</p>
          </div>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-border">
          <ProjectTable projects={contributor.projects} />
          <div className="flex justify-end border-t border-border px-4 py-2">
            <Link href={`/action-plans?pic=${encodeURIComponent(contributor.picId)}`} className={LINK_CLASS}>
              Lihat {contributor.totalAP} AP {contributor.picName}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
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
          <div className="h-7 w-7 rounded-md bg-muted text-fg-secondary flex items-center justify-center">
            <Users className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Analisis Proyek Kontributor</h2>
            <p className="text-[11px] text-muted-foreground">
              Capaian kerja per kontributor berdasarkan proyek
            </p>
          </div>
        </div>

        {ready && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
              {totalComplete}/{totalAP} AP
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-fg-secondary" aria-hidden />
              {overallRate}% selesai
            </span>
            <Link href="/action-plans" className={LINK_CLASS}>
              Lihat semua AP
            </Link>
          </div>
        )}
      </div>

      {loading && (
        <div className="space-y-2" aria-busy="true" aria-label="Memuat analisis kontributor">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-md animate-pulse bg-muted" />
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
              className="h-7 px-3 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Coba lagi
            </button>
          )}
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">Belum ada action plan di cakupan Anda</p>
          <Link
            href="/action-plans?new=1"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Buat Action Plan
          </Link>
        </div>
      )}

      {ready && (
        <div className="rounded-lg border border-border bg-card shadow-sm dark:shadow-none overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
            <div className="p-3 text-center">
              <p className="text-lg font-bold text-foreground">{data.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Kontributor</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-lg font-bold text-foreground">{totalAP}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Total AP</p>
            </div>
            <div className="p-3 text-center">
              <p className={`text-lg font-bold ${rateText(overallRate)}`}>{overallRate}%</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Penyelesaian</p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {data.map((contributor) => (
              <ContributorRow key={contributor.picId} contributor={contributor} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

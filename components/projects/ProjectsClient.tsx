'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  MoreHorizontal,
  Plus,
  Search,
  SortDesc,
} from 'lucide-react'
import type { Role } from '@/lib/generated/prisma/client'
import { ProjectForm } from '@/components/projects/ProjectForm'

export interface Project {
  id: string
  name: string
  description: string | null
  companyId: string
  divisionId: string | null
  isActive: boolean
  startDate: string | null
  endDate: string | null
  createdAt: string
  company?: { id: string; name: string } | null
  division: { id: string; name: string } | null
  /** Semua divisi yang terlibat (divisi project + divisi tiap PIC task). */
  divisions?: { id: string; name: string }[]
  taskCount: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  actionPlanCount: number
}

const CAN_MANAGE: Role[] = ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER']

const PAGE_SIZE = 5

type SortOrder = 'NEWEST' | 'OLDEST' | 'DEADLINE' | 'ALPHA'

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ProjectsClient({ role, openCreate }: { role: Role; openCreate?: boolean }) {
  const router = useRouter()
  const [data, setData] = useState<Project[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)

  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [divisionFilter, setDivisionFilter] = useState('ALL')
  const [sortOrder, setSortOrder] = useState<SortOrder>('NEWEST')
  const [page, setPage] = useState(1)
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null)

  const canManage = CAN_MANAGE.includes(role)

  useEffect(() => {
    fetchData()
    fetch('/api/divisions')
      .then((r) => (r.ok ? r.json() : []))
      .then(setDivisions)
      .catch(() => setDivisions([]))
  }, [])

  // Header "+ New > Project" mengarah ke /projects?new=1. Buka modal, lalu
  // bersihkan param pakai replace supaya back/refresh tidak membukanya lagi.
  useEffect(() => {
    if (!openCreate) return
    setEditing(null)
    setFormOpen(true)
    router.replace('/projects', { scroll: false })
  }, [openCreate])

  // Reset halaman saat kriteria berubah.
  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter, divisionFilter, sortOrder])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/projects')
      if (!res.ok) throw new Error('Gagal memuat data')
      setData(await res.json())
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (!data) return []
    const q = searchQuery.trim().toLowerCase()
    let rows = data.filter((p) => {
      if (statusFilter === 'ACTIVE' && !p.isActive) return false
      if (statusFilter === 'INACTIVE' && p.isActive) return false
      // Project lintas divisi harus tetap muncul di filter divisi manapun yang terlibat.
      if (
        divisionFilter !== 'ALL' &&
        p.divisionId !== divisionFilter &&
        !p.divisions?.some((d) => d.id === divisionFilter)
      ) {
        return false
      }
      if (q) {
        const haystack = `${p.name} ${p.description ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })

    rows = [...rows].sort((a, b) => {
      switch (sortOrder) {
        case 'OLDEST':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'DEADLINE': {
          const ae = a.endDate ? new Date(a.endDate).getTime() : Number.POSITIVE_INFINITY
          const be = b.endDate ? new Date(b.endDate).getTime() : Number.POSITIVE_INFINITY
          return ae - be
        }
        case 'ALPHA':
          return a.name.localeCompare(b.name)
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })
    return rows
  }, [data, searchQuery, statusFilter, divisionFilter, sortOrder])

  const activeCount = useMemo(() => (data ?? []).filter((p) => p.isActive).length, [data])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length)

  if (loading && !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-9 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="flex items-center justify-between gap-4">
          <div className="h-9 w-full sm:w-80 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded"></div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800"></div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <p className="text-sm text-slate-700 dark:text-slate-300">{error}</p>
        <button
          onClick={fetchData}
          className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          Coba lagi
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Content Header — judul + KPI micro strip */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Inisiatif & Proyek</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Wadah program kerja strategis dan kolaborasi deliverable lintas divisi.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="px-2.5 text-left">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Inisiatif
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-slate-900 dark:text-slate-50">{data.length}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Inisiatif</span>
            </div>
          </div>
          <div className="w-px h-7 bg-slate-200 dark:bg-slate-700"></div>
          <div className="px-2.5 text-left">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Status Aktif
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-slate-900 dark:text-slate-50">{activeCount}</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Berjalan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama inisiatif atau deskripsi..."
              className="w-full h-9 pl-9 pr-3 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              aria-label="Filter Status"
              className="h-9 appearance-none pr-8 pl-3 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Divisi filter */}
          <div className="relative">
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              aria-label="Filter Divisi"
              className="h-9 appearance-none pr-8 pl-3 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              <option value="ALL">Semua Divisi</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              aria-label="Urutkan"
              className="h-9 appearance-none pr-8 pl-3 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              <option value="NEWEST">Terbaru</option>
              <option value="OLDEST">Terlama</option>
              <option value="DEADLINE">Deadline Terdekat</option>
              <option value="ALPHA">Nama A-Z</option>
            </select>
            <SortDesc className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="inline-flex items-center gap-2 h-9 px-4 self-end xl:self-auto rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Buat Project Baru
          </button>
        )}
      </div>

      {/* Zero-Data: tenant/belum ada project sama sekali */}
      {data.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-500 mb-4">
            <FolderKanban className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Belum ada inisiatif program kerja
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
            {canManage
              ? 'Mulai inisiatif pertama Anda untuk menyusun sasaran besar dan program kerja tim lintas divisi.'
              : 'Saat ini belum ada inisiatif yang ditugaskan ke divisi Anda. Tugas dan komitmen kerja harian Anda dapat dipantau langsung di My Work.'}
          </p>
          {canManage ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              className="mt-6 inline-flex items-center gap-2 px-4 h-9 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Buat Project Baru
            </button>
          ) : (
            <Link
              href="/my-work"
              className="mt-6 inline-flex items-center gap-2 px-4 h-9 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors shadow-sm"
            >
              Buka Konsol My Work
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/40 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
                  <th className="px-5 py-3 min-w-[320px]">Nama Inisiatif</th>
                  <th className="px-4 py-3 min-w-[190px]">Divisi</th>
                  <th className="px-4 py-3 min-w-[210px]">Periode</th>
                  <th className="px-4 py-3 min-w-[140px]">Jumlah Task</th>
                  <th className="px-4 py-3 min-w-[180px]">Progress</th>
                  <th className="px-4 py-3 min-w-[110px]">Status</th>
                  <th className="px-4 py-3 w-16 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Tidak ada inisiatif yang cocok dengan filter atau pencarian Anda.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('')
                          setStatusFilter('ALL')
                          setDivisionFilter('ALL')
                          setSortOrder('NEWEST')
                        }}
                        className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Reset Filter
                      </button>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((p) => {
                    const pct = p.taskCount > 0 ? Math.round((p.completedTasks / p.taskCount) * 100) : 0
                    return (
                      <tr
                        key={p.id}
                        className="cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                        onClick={() => router.push(`/projects/${p.id}`)}
                      >
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {p.name}
                            </span>
                            {p.company?.name && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="font-medium text-slate-600 dark:text-slate-400">{p.company.name}</span>
                              </div>
                            )}
                            {p.description && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                {p.description}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {p.divisions && p.divisions.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {p.divisions.map((d) => (
                                <span
                                  key={d.id}
                                  className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
                                >
                                  {d.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-medium">
                              {p.division?.name ?? 'Semua Divisi (Lintas Divisi)'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-mono">
                              {formatDate(p.startDate)} – {formatDate(p.endDate)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {p.taskCount} Task
                            </span>
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              {p.actionPlanCount} Action Plan
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1 w-full max-w-[150px]">
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                              <span>Selesai</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-200">{pct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  pct === 100
                                    ? 'bg-emerald-500'
                                    : pct > 0
                                    ? 'bg-blue-500'
                                    : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {p.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              Nonaktif
                            </span>
                          )}
                        </td>
                        <td
                          className="px-4 py-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              aria-label="Aksi Project"
                              onClick={() => setMenuOpenFor(menuOpenFor === p.id ? null : p.id)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {menuOpenFor === p.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setMenuOpenFor(null)}
                                />
                                <div
                                  role="menu"
                                  className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-md"
                                >
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setMenuOpenFor(null)
                                      router.push(`/projects/${p.id}`)
                                    }}
                                    className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                  >
                                    Buka Detail
                                  </button>
                                  {canManage && (
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        setMenuOpenFor(null)
                                        setEditing(p)
                                        setFormOpen(true)
                                      }}
                                      className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {rangeStart}-{rangeEnd}
              </span>{' '}
              dari{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {filtered.length}
              </span>{' '}
              project
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Halaman sebelumnya"
                className="p-1.5 rounded-md text-slate-400 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={pageCount <= 1}
                className={`px-3 py-1 rounded-md text-xs font-semibold shadow-sm transition-colors ${
                  safePage >= 1
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {safePage}
              </button>
              <button
                type="button"
                disabled={safePage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                aria-label="Halaman berikutnya"
                className="p-1.5 rounded-md text-slate-400 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {canManage && (
        <ProjectForm
          open={formOpen}
          onOpenChange={setFormOpen}
          project={editing}
          role={role}
          onSuccess={() => {
            setFormOpen(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}
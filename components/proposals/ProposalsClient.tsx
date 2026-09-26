'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Role } from '@/lib/generated/prisma/client'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ProposalFormModal } from '@/components/proposals/ProposalFormModal'
import { ProposalReviewDialog } from '@/components/proposals/ProposalReviewDialog'
import { ProposalConvertModal } from '@/components/proposals/ProposalConvertModal'
import { ProposalDetailModal } from '@/components/proposals/ProposalDetailModal'
import {
  Search,
  SlidersHorizontal,
  Plus,
  CheckCircle2,
  XCircle,
  FileEdit,
  SendHorizonal,
  ChevronDown,
  Lightbulb,
  Rocket,
  FolderKanban,
  X,
} from 'lucide-react'
import { FilterPopover } from '@/components/ui/FilterPopover'
import { ActiveChip } from '@/components/ui/FilterToolbar'

export interface Proposal {
  id: string
  proposerId: string
  title: string
  description: string
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
  reviewNote: string | null
  createdAt: string
  updatedAt: string
  projectId: string | null
  proposer: { id: string; name: string; role?: string; divisionId?: string | null } | null
}

// ── helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-indigo-500', 'bg-emerald-500',
  'bg-teal-500', 'bg-amber-500', 'bg-sky-500', 'bg-slate-600', 'bg-blue-600',
]

function colorForString(s: string): string {
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = (s.codePointAt(i) ?? 0) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function initials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ── status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  DRAFT:     { dot: 'bg-slate-400',  text: 'text-slate-600 dark:text-slate-300',  label: 'Draft' },
  SUBMITTED: { dot: 'bg-blue-500',   text: 'text-blue-700 dark:text-blue-300',    label: 'Menunggu Review' },
  APPROVED:  { dot: 'bg-emerald-500',text: 'text-emerald-700 dark:text-emerald-300', label: 'Disetujui' },
  REJECTED:  { dot: 'bg-red-500',    text: 'text-red-700 dark:text-red-300',      label: 'Ditolak' },
} as const

type StatusKey = keyof typeof STATUS_CONFIG

const SORT_OPTIONS = [
  { value: 'newest',   label: 'Terbaru diajukan' },
  { value: 'oldest',   label: 'Terlama diajukan' },
  { value: 'title',    label: 'Judul (A-Z)' },
]

// ── role label map (best-effort) ──────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN:       'Super Admin',
  ADMIN_OPERATIONAL: 'Admin Operational',
  MANAGER:           'Manager',
  STAFF:             'Staff',
  GUEST:             'Guest',
}

// ── main component ────────────────────────────────────────────────────────────

// Cermin canManageProject — PIC tidak bisa bikin project.
const CAN_CREATE_PROJECT = ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER']

export function ProposalsClient({
  role,
  userId,
  currentUserDivisionId = null,
  openCreate,
}: {
  role: Role
  userId: string
  currentUserDivisionId?: string | null
  openCreate?: boolean
}) {
  const canCreateProject = CAN_CREATE_PROJECT.includes(role)
  const router = useRouter()
  const [data, setData] = useState<Proposal[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [divisionFilter, setDivisionFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [divisionMap, setDivisionMap] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [sortOpen, setSortOpen] = useState(false)
  const [serverCounts, setServerCounts] = useState<{
    all: number
    DRAFT: number
    SUBMITTED: number
    APPROVED: number
    REJECTED: number
  } | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Proposal | null>(null)
  const [deleting, setDeleting] = useState<Proposal | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState<Proposal | null>(null)
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [convertingProposal, setConvertingProposal] = useState<Proposal | null>(null)
  const [projectFromProposal, setProjectFromProposal] = useState<Proposal | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(message: string) {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const q = new URLSearchParams()
      if (statusFilter) q.set('status', statusFilter)
      if (search.trim()) q.set('search', search.trim())
      if (sort) q.set('sortBy', sort)

      const res = await fetch(`/api/proposals?${q.toString()}`)
      if (res.status === 401 || res.status === 403) {
        setDenied(true)
        return
      }
      if (!res.ok) throw new Error('Gagal memuat data')
      const json = await res.json()
      setError(null)
      if (Array.isArray(json)) {
        setData(json)
      } else {
        setData(json.items ?? [])
        if (json.counts) {
          setServerCounts(json.counts)
        }
      }
    } catch {
      setError('Terjadi kesalahan saat memuat proposal. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, sort])

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchData()
    }, 250)
    return () => clearTimeout(timer)
  }, [fetchData])

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  async function handleSubmit(proposal: Proposal) {
    setSubmittingId(proposal.id)
    try {
      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit' }),
      })
      if (!res.ok) throw new Error()
      fetchData()
    } catch {
      setError('Gagal submit proposal')
    } finally {
      setSubmittingId(null)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/proposals/${deleting.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setDeleting(null)
      fetchData()
    } catch {
      setError('Gagal menghapus proposal')
    } finally {
      setDeleteLoading(false)
    }
  }

  useEffect(() => {
    fetch('/api/divisions')
      .then((r) => (r.ok ? r.json() : []))
      .then((divs: { id: string; name: string }[]) => {
        setDivisionMap(Object.fromEntries(divs.map((d) => [d.id, d.name])))
      })
      .catch(() => {})
  }, [])

  // ── counts per status ─────────────────────────────────────────────────────
  const counts = useMemo(() => {
    if (serverCounts) return serverCounts
    if (!data) return { all: 0, DRAFT: 0, SUBMITTED: 0, APPROVED: 0, REJECTED: 0 }
    return data.reduce(
      (acc, p) => {
        acc.all++
        acc[p.status] = (acc[p.status] ?? 0) + 1
        return acc
      },
      { all: 0, DRAFT: 0, SUBMITTED: 0, APPROVED: 0, REJECTED: 0 } as Record<string, number>
    )
  }, [serverCounts, data])

  // ── filtered + sorted ─────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    if (!data) return []
    let rows = data
    if (statusFilter) rows = rows.filter((p) => p.status === statusFilter)
    if (divisionFilter) rows = rows.filter((p) => p.proposer?.divisionId === divisionFilter)
    if (dateFrom) {
      const fromTime = new Date(dateFrom).setHours(0, 0, 0, 0)
      rows = rows.filter((p) => new Date(p.createdAt).getTime() >= fromTime)
    }
    if (dateTo) {
      const toTime = new Date(dateTo).setHours(23, 59, 59, 999)
      rows = rows.filter((p) => new Date(p.createdAt).getTime() <= toTime)
    }
    const q = search.trim().toLowerCase()
    if (q) rows = rows.filter((p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    return [...rows].sort((a, b) => {
      if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return a.title.localeCompare(b.title)
    })
  }, [data, statusFilter, divisionFilter, dateFrom, dateTo, search, sort])

  // ── tab definition ────────────────────────────────────────────────────────
  const TABS = [
    { key: '',          label: 'Semua',           count: counts.all },
    { key: 'DRAFT',     label: 'Draft',           count: counts.DRAFT },
    { key: 'SUBMITTED', label: 'Menunggu Review',  count: counts.SUBMITTED },
    { key: 'APPROVED',  label: 'Disetujui',        count: counts.APPROVED },
    { key: 'REJECTED',  label: 'Ditolak',          count: counts.REJECTED },
  ]

  const canReview = (p: Proposal) =>
    !['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER'].includes(role)
      ? false
      : p.status === 'SUBMITTED' && p.proposerId !== userId

  // ── render ─────────────────────────────────────────────────────────────────

  if (denied) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-red-200 dark:border-red-900/50 shadow-sm p-8 text-center max-w-md mx-auto my-12">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Anda tidak punya akses</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Anda tidak memiliki izin untuk melihat usulan proposal ini.
        </p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          Kembali ke Beranda
        </button>
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Proposals</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pengajuan usulan inisiatif dan action plan baru untuk review tim.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-5">
          <p className="text-sm text-slate-700 dark:text-slate-300">{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
          >
            Coba lagi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Usulan Bottom-Up Tim
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Inisiatif perbaikan proses operasional dari staf langsung ke meja review manajer.
          </p>
        </div>

        {/* Create button (desktop) */}
        <button
          type="button"
          onClick={() => { setEditing(null); setFormOpen(true) }}
          className="hidden sm:inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          Buat Usulan Baru
        </button>
      </div>

      {/* ── Search + Filter + create (mobile) ── */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari usulan ide..."
              className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Bersihkan pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Popover Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border text-sm font-semibold transition-colors cursor-pointer ${
                filterOpen || divisionFilter || dateFrom || dateTo
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" />
              <span>Filter</span>
              {(divisionFilter || dateFrom || dateTo) && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white text-blue-700 px-1 text-xs font-bold">
                  {(divisionFilter ? 1 : 0) + (dateFrom || dateTo ? 1 : 0)}
                </span>
              )}
            </button>

            <FilterPopover
              isOpen={filterOpen}
              onClose={() => setFilterOpen(false)}
              onApply={(draft) => {
                setDivisionFilter(draft.divisionIds[0] ?? '')
                setDateFrom(draft.dateFrom)
                setDateTo(draft.dateTo)
              }}
              initialValues={{
                divisionIds: divisionFilter ? [divisionFilter] : [],
                dateFrom,
                dateTo,
              }}
              config={{
                divisions: true,
                dateRange: true,
                statuses: false,
                priorities: false,
                pics: false,
                projects: false,
                entityName: 'Usulan Proposal',
                totalEntities: data?.length ?? 0,
              }}
              totalResults={displayed.length}
            />
          </div>

          {/* Create button (mobile only) */}
          <button
            type="button"
            onClick={() => { setEditing(null); setFormOpen(true) }}
            className="sm:hidden inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Buat Usulan Baru
          </button>
        </div>

        {/* Active Chips Row */}
        {(divisionFilter || dateFrom || dateTo) && (
          <div className="flex flex-wrap items-center gap-1.5 px-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 shrink-0">
              FILTER AKTIF:
            </span>

            {divisionFilter && (
              <ActiveChip
                label={`Divisi: ${divisionMap[divisionFilter] ?? 'Terpilih'}`}
                dot="bg-teal-500"
                onRemove={() => setDivisionFilter('')}
              />
            )}

            {(dateFrom || dateTo) && (
              <ActiveChip
                label={`Tanggal: ${dateFrom || '...'} s/d ${dateTo || '...'}`}
                dot="bg-amber-500"
                onRemove={() => {
                  setDateFrom('')
                  setDateTo('')
                }}
              />
            )}

            <button
              type="button"
              onClick={() => {
                setDivisionFilter('')
                setDateFrom('')
                setDateTo('')
              }}
              className="text-xs font-semibold text-red-500 hover:text-red-600 dark:text-red-400 hover:underline underline-offset-2 transition-colors ml-1 cursor-pointer"
            >
              Hapus filter
            </button>
          </div>
        )}
      </div>

      {/* ── Filter tabs + sort ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map((tab) => {
            const active = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setSortOpen((v) => !v)}
            className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <span className="text-slate-400 dark:text-slate-500 font-normal">URUTAN:</span>
            {SORT_OPTIONS.find((o) => o.value === sort)?.label}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSort(opt.value); setSortOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    sort === opt.value
                      ? 'text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── Grid cards ── */}
      {displayed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 py-16 text-center">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {search || divisionFilter || dateFrom || dateTo || statusFilter
              ? 'Tidak ada usulan yang cocok dengan pencarian dan filter.'
              : 'Belum ada usulan.'}
          </p>
          {(search || divisionFilter || dateFrom || dateTo || statusFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatusFilter('')
                setDivisionFilter('')
                setDateFrom('')
                setDateTo('')
              }}
              className="mt-3 inline-flex items-center gap-2 h-8 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Reset Filter &amp; Pencarian
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((p) => {
            const isOwner = p.proposerId === userId
            const cfg = STATUS_CONFIG[p.status as StatusKey] ?? STATUS_CONFIG.DRAFT
            const avatarColor = colorForString(p.proposer?.name ?? p.proposerId)
            const proposerInitials = initials(p.proposer?.name)
            const proposerRoleLabel = p.proposer?.role ? (ROLE_LABEL[p.proposer.role] ?? p.proposer.role) : null

            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedProposal(p)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedProposal(p)
                  }
                }}
                className="flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-150 overflow-hidden cursor-pointer group"
              >
                {/* Card body */}
                <div className="flex-1 p-4">
                  {/* Status + date */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                      <span className={`text-[11px] font-semibold uppercase tracking-wide ${cfg.text}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {formatDate(p.createdAt)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug mb-1.5">
                    {p.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mb-3">
                    {p.description}
                  </p>

                  {/* Review note box (APPROVED / REJECTED) */}
                  {p.reviewNote && (p.status === 'APPROVED' || p.status === 'REJECTED') && (
                    <div className={`rounded-lg p-3 mb-3 border ${
                      p.status === 'APPROVED'
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    }`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${
                        p.status === 'APPROVED'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        Catatan Review Manajer
                      </p>
                      <p className={`text-xs italic line-clamp-3 ${
                        p.status === 'APPROVED'
                          ? 'text-blue-800 dark:text-blue-200'
                          : 'text-amber-800 dark:text-amber-200'
                      }`}>
                        &ldquo;{p.reviewNote}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Proposer info */}
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-white text-[11px] font-bold ${avatarColor}`}
                      title={p.proposer?.name ?? 'Pengaju'}
                    >
                      {proposerInitials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {isOwner ? 'Anda' : (p.proposer?.name ?? '—')}
                      </p>
                      {proposerRoleLabel && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                          {proposerRoleLabel}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card footer actions */}
                <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3">
                  {/* DRAFT owner: Edit + Ajukan */}
                  {isOwner && p.status === 'DRAFT' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEditing(p); setFormOpen(true) }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors"
                      >
                        <FileEdit className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSubmit(p) }}
                        disabled={submittingId === p.id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <SendHorizonal className="h-3.5 w-3.5" />
                        {submittingId === p.id ? 'Mengirim...' : 'Ajukan'}
                      </button>
                    </div>
                  )}

                  {/* DRAFT non-owner (Super Admin / Admin Ops): View/Buka Draft */}
                  {/* DRAFT non-owner (Super Admin, Admin Ops, Manager): View/Buka Draft */}
                  {!isOwner && p.status === 'DRAFT' && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                        Masih dalam penulisan oleh pengaju
                      </span>
                      {['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER'].includes(role) && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditing(p); setFormOpen(true) }}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Buka Draft &rsaquo;
                        </button>
                      )}
                    </div>
                  )}

                  {/* Reviewer: Setujui + Tolak */}
                  {canReview(p) && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setReviewing(p) }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Setujui
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setReviewing(p) }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Tolak
                      </button>
                    </div>
                  )}

                  {/* SUBMITTED owner: waiting info */}
                  {isOwner && p.status === 'SUBMITTED' && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                        Menunggu review manajer...
                      </span>
                    </div>
                  )}

                  {/* APPROVED: satu primary (Jadikan Project), sisanya turun derajat */}
                  {p.status === 'APPROVED' && (
                    <div className="flex flex-wrap items-center gap-2">
                      {p.projectId ? (
                        <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
                          <FolderKanban className="h-3.5 w-3.5" />
                          Sudah jadi Project
                        </span>
                      ) : (
                        canCreateProject && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setProjectFromProposal(p) }}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition-colors"
                            title="Wujudkan usulan ini menjadi Project lintas divisi"
                          >
                            <FolderKanban className="h-3.5 w-3.5" />
                            Jadikan Project
                          </button>
                        )
                      )}

                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setConvertingProposal(p) }}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
                        title="Jadikan usulan ini Action Plan eksekusi nyata"
                      >
                        <Rocket className="h-3.5 w-3.5" />
                        Jadikan Action Plan
                      </button>

                      {p.projectId ? (
                        <Link
                          href={`/projects/${p.projectId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          Lihat Project &rsaquo;
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setReviewing(p) }}
                          className="ml-auto text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                        >
                          Detail &rsaquo;
                        </button>
                      )}
                    </div>
                  )}

                  {/* REJECTED: detail penolakan */}
                  {p.status === 'REJECTED' && (
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setReviewing(p) }}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
                      >
                        Detail Penolakan &rsaquo;
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modals ── */}
      <ProposalFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        proposal={editing}
        onSuccess={() => { setFormOpen(false); void fetchData() }}
      />

      <ProposalReviewDialog
        open={!!reviewing}
        onOpenChange={(open) => !open && setReviewing(null)}
        proposal={reviewing}
        onSuccess={() => { setReviewing(null); void fetchData() }}
      />

      <ProposalConvertModal
        open={!!convertingProposal}
        onOpenChange={(open) => !open && setConvertingProposal(null)}
        proposal={convertingProposal}
        onSuccess={(ap) => {
          setConvertingProposal(null)
          void fetchData()
          showToast(`Usulan berhasil dikonversi ke Action Plan "${ap.title}"!`)
        }}
      />

      {canCreateProject && projectFromProposal && (
        <ProjectForm
          open={Boolean(projectFromProposal)}
          onOpenChange={(open) => !open && setProjectFromProposal(null)}
          project={null}
          role={role}
          currentUserDivisionId={currentUserDivisionId}
          prefill={{
            name: projectFromProposal.title,
            description: projectFromProposal.description,
          }}
          submitTo={{
            url: `/api/proposals/${projectFromProposal.id}/convert`,
            extra: { target: 'PROJECT' },
          }}
          onSuccess={(created) => {
            setProjectFromProposal(null)
            void fetchData()
            showToast(
              created?.name
                ? `Usulan berhasil menjadi Project "${created.name}".`
                : 'Usulan berhasil menjadi Project.'
            )
          }}
        />
      )}

      <ProposalDetailModal
        open={!!selectedProposal}
        onOpenChange={(open) => !open && setSelectedProposal(null)}
        proposal={selectedProposal}
        role={role}
        userId={userId}
        onEdit={(p) => {
          setSelectedProposal(null)
          setEditing(p)
          setFormOpen(true)
        }}
        onSubmit={(p) => {
          setSelectedProposal(null)
          void handleSubmit(p)
        }}
        onReview={(p) => {
          setSelectedProposal(null)
          setReviewing(p)
        }}
        onConvert={(p) => {
          setSelectedProposal(null)
          setConvertingProposal(p)
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Hapus Proposal"
        message={`Yakin ingin menghapus "${deleting?.title}"?`}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] max-w-md rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium px-4 py-2.5 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

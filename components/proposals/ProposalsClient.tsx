'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Role } from '@/lib/generated/prisma/client'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ProposalFormModal } from '@/components/proposals/ProposalFormModal'
import { ProposalReviewDialog } from '@/components/proposals/ProposalReviewDialog'
import { ProposalConvertModal } from '@/components/proposals/ProposalConvertModal'
import {
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  FileEdit,
  SendHorizonal,
  ChevronDown,
  Lightbulb,
  Rocket,
  X,
} from 'lucide-react'

export interface Proposal {
  id: string
  proposerId: string
  title: string
  description: string
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
  reviewNote: string | null
  createdAt: string
  updatedAt: string
  proposer: { id: string; name: string; role?: string } | null
}

// ── helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-rose-500', 'bg-amber-500', 'bg-teal-500', 'bg-indigo-500', 'bg-pink-500',
]

function colorForString(s: string): string {
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash)
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

export function ProposalsClient({
  role,
  userId,
  openCreate,
}: {
  role: Role
  userId: string
  openCreate?: boolean
}) {
  const router = useRouter()
  const [data, setData] = useState<Proposal[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
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
  const [convertingProposal, setConvertingProposal] = useState<Proposal | null>(null)
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
      if (!res.ok) throw new Error('Gagal memuat data')
      const json = await res.json()
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
    const q = search.trim().toLowerCase()
    if (q) rows = rows.filter((p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    return [...rows].sort((a, b) => {
      if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return a.title.localeCompare(b.title)
    })
  }, [data, statusFilter, search, sort])

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
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
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

      {/* ── Search + create (mobile) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari usulan ide..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {search ? 'Tidak ada usulan yang cocok dengan pencarian.' : 'Belum ada usulan.'}
          </p>
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
                className="flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-150 overflow-hidden"
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
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug mb-1.5">
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
                        ❝ Catatan Review Manajer
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
                        onClick={() => { setEditing(p); setFormOpen(true) }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors"
                      >
                        <FileEdit className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubmit(p)}
                        disabled={submittingId === p.id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <SendHorizonal className="h-3.5 w-3.5" />
                        {submittingId === p.id ? 'Mengirim...' : 'Ajukan'}
                      </button>
                    </div>
                  )}

                  {/* Reviewer: Setujui + Tolak */}
                  {canReview(p) && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setReviewing(p)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Setujui
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewing(p)}
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

                  {/* APPROVED: Jadikan Action Plan + detail */}
                  {p.status === 'APPROVED' && (
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setConvertingProposal(p)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-xs"
                        title="Jadikan usulan ini Action Plan eksekusi nyata"
                      >
                        <Rocket className="h-3.5 w-3.5" />
                        Jadikan Action Plan
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewing(p)}
                        className="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
                      >
                        Detail &rsaquo;
                      </button>
                    </div>
                  )}

                  {/* REJECTED: detail penolakan */}
                  {p.status === 'REJECTED' && (
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setReviewing(p)}
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

      {/* ── Footer banner ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-5 py-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-9 w-9 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
              Panduan Standar Pengajuan Proposal Bottom-Up
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
              Usulan yang disetujui manajer akan langsung diekspansi menjadi draf resmi Action Plan organisasi.
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] text-blue-500 dark:text-blue-400 whitespace-nowrap">
            Rata-rata respons: <span className="font-bold text-blue-700 dark:text-blue-300">1.8 hari kerja</span>
          </p>
        </div>
      </div>

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

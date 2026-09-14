'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  ArrowUpDown,
  LayoutList,
  LayoutGrid,
  Calendar,
  Check,
  Building2,
  FolderKanban,
  Plus,
} from 'lucide-react'
import type { FilterState, FilterStateActions } from '@/lib/use-filter-state'

// ──────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ──────────────────────────────────────────────────────────────────────────────

export interface StatusOption {
  value: string
  label: string
  dot?: string
}

export interface SortOption {
  value: string
  label: string
}

export interface FilterToolbarConfig {
  statuses?: StatusOption[]
  priorities?: boolean
  divisions?: boolean
  pics?: boolean
  projects?: boolean
  dateRange?: boolean
  entityName?: string
  totalEntities?: number
}

export type ViewMode = 'table' | 'board' | 'calendar'

export interface FilterToolbarProps {
  filterState: FilterState & FilterStateActions
  sortOptions?: SortOption[]
  filterConfig?: FilterToolbarConfig
  currentView?: ViewMode
  onViewChange?: (v: ViewMode) => void
  totalResults?: number
  loading?: boolean
  onNew?: () => void
  newLabel?: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Defaults
// ──────────────────────────────────────────────────────────────────────────────

const DEFAULT_SORT_OPTIONS: SortOption[] = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'priority_desc', label: 'Prioritas Tertinggi' },
  { value: 'deadline_asc', label: 'Deadline Terdekat' },
  { value: 'deadline_desc', label: 'Deadline Terjauh' },
  { value: 'oldest', label: 'Terlama' },
]

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Rendah' },
  { value: 'MEDIUM', label: 'Sedang' },
  { value: 'HIGH', label: 'Tinggi' },
  { value: 'URGENT', label: 'Mendesak' },
]

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [ref, onClose])
}

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-indigo-600',
  'bg-slate-600',
  'bg-amber-600',
  'bg-sky-600',
  'bg-teal-600',
]

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase()
}

// Chip filter aktif 24px Pill
function ActiveChip({
  label,
  dot,
  onRemove,
}: {
  label: string
  dot?: string
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1.5 h-6 pl-2.5 pr-1.5 rounded-full bg-blue-50/90 dark:bg-blue-950/40 text-xs font-medium text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs">
      {dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />}
      <span className="truncate max-w-[200px]">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center justify-center h-3.5 w-3.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-500 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-100 transition-colors ml-0.5"
        aria-label={`Hapus filter ${label}`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  )
}

// Checkbox item bergaya UI-11
function CheckItem({
  checked,
  label,
  subLabel,
  isOverdue,
  dot,
  avatar,
  checkboxPosition = 'left',
  onToggle,
}: {
  checked: boolean
  label: string
  subLabel?: string
  isOverdue?: boolean
  dot?: string
  avatar?: { name: string }
  checkboxPosition?: 'left' | 'right'
  onToggle: () => void
}) {
  const checkIndicator = (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
        checked
          ? 'border-blue-600 bg-blue-600 text-white'
          : isOverdue
          ? 'border-red-400 dark:border-red-600 bg-white dark:bg-slate-900'
          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
      }`}
    >
      {checked && <Check className="h-3 w-3 stroke-[2.5]" />}
    </span>
  )

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
        checked
          ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-medium'
          : isOverdue
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {checkboxPosition === 'left' && checkIndicator}

        {avatar && (
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${getAvatarColor(
              avatar.name
            )}`}
          >
            {getInitials(avatar.name)}
          </span>
        )}

        {dot && <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />}

        <span
          className={`truncate text-left ${
            isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : ''
          }`}
        >
          {label}
          {subLabel && (
            <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">
              ({subLabel})
            </span>
          )}
        </span>
      </div>

      {checkboxPosition === 'right' && checkIndicator}
    </button>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Sort Dropdown with "Sort: [Label]"
// ──────────────────────────────────────────────────────────────────────────────

function SortDropdown({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: SortOption[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))

  const current = options.find((o) => o.value === value) ?? options[0]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg border text-sm font-medium transition-colors ${
          open
            ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
      >
        <ArrowUpDown className="h-4 w-4 shrink-0 text-slate-500" />
        <span className="whitespace-nowrap">
          Sort: <span className="font-semibold text-slate-900 dark:text-slate-100">{current?.label ?? 'Terbaru'}</span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 min-w-[210px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1.5">
          {options.map((opt) => {
            const active = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-xs text-left transition-colors ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>{opt.label}</span>
                {active && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Advanced Filter Panel (UI-11: PRD §20 Universal Spec - Max-W 880px)
// ──────────────────────────────────────────────────────────────────────────────

interface AdvancedFilterPanelProps {
  filterState: FilterState & FilterStateActions
  config: FilterToolbarConfig
  totalResults?: number
  onClose: () => void
}

function AdvancedFilterPanel({
  filterState,
  config,
  totalResults,
  onClose,
}: AdvancedFilterPanelProps) {
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, onClose)

  // Draft filters saat panel terbuka
  const [localStatuses, setLocalStatuses] = useState<string[]>(filterState.statuses)
  const [localPriorities, setLocalPriorities] = useState<string[]>(filterState.priorities)
  const [localDivisionIds, setLocalDivisionIds] = useState<string[]>(filterState.divisionIds)
  const [localPicIds, setLocalPicIds] = useState<string[]>(filterState.picIds)
  const [localProjectId, setLocalProjectId] = useState<string>(filterState.projectId ?? '')
  const [localDateFrom, setLocalDateFrom] = useState(filterState.dateFrom)
  const [localDateTo, setLocalDateTo] = useState(filterState.dateTo)

  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([])
  const [users, setUsers] = useState<{ id: string; name: string; divisionId?: string }[]>([])
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [picSearch, setPicSearch] = useState('')

  // Data prefetch
  useEffect(() => {
    if (config.divisions !== false) {
      fetch('/api/divisions')
        .then((r) => (r.ok ? r.json() : []))
        .then(setDivisions)
        .catch(() => {})
    }
    if (config.pics !== false) {
      fetch('/api/users')
        .then((r) => (r.ok ? r.json() : []))
        .then((data: { id: string; name: string; divisionId?: string }[]) => setUsers(data))
        .catch(() => {})
    }
    if (config.projects !== false) {
      fetch('/api/projects')
        .then((r) => (r.ok ? r.json() : []))
        .then(setProjects)
        .catch(() => {})
    }
  }, [config.divisions, config.pics, config.projects])

  // Tutup panel via Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Sync draft filter states saat filterState berubah
  useEffect(() => {
    setLocalStatuses(filterState.statuses)
    setLocalPriorities(filterState.priorities)
    setLocalDivisionIds(filterState.divisionIds)
    setLocalPicIds(filterState.picIds)
    setLocalProjectId(filterState.projectId ?? '')
    setLocalDateFrom(filterState.dateFrom)
    setLocalDateTo(filterState.dateTo)
  }, [
    filterState.statuses,
    filterState.priorities,
    filterState.divisionIds,
    filterState.picIds,
    filterState.projectId,
    filterState.dateFrom,
    filterState.dateTo,
  ])

  const divisionMap = Object.fromEntries(divisions.map((d) => [d.id, d.name]))

  function toggleItem(list: string[], set: (v: string[]) => void, value: string) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  function handleApply() {
    filterState.setStatuses(localStatuses)
    filterState.setPriorities(localPriorities)
    filterState.setDivisionIds(localDivisionIds)
    filterState.setPicIds(localPicIds)
    if (filterState.setProjectId) filterState.setProjectId(localProjectId)
    filterState.setDateFrom(localDateFrom)
    filterState.setDateTo(localDateTo)
    onClose()
  }

  function handleReset() {
    setLocalStatuses([])
    setLocalPriorities([])
    setLocalDivisionIds([])
    setLocalPicIds([])
    setLocalProjectId('')
    setLocalDateFrom('')
    setLocalDateTo('')
  }

  // Quick date presets
  function applyDatePreset(preset: '7days' | 'thisMonth' | 'quarter') {
    const today = new Date()
    const fmt = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    if (preset === '7days') {
      const next7 = new Date(today)
      next7.setDate(today.getDate() + 7)
      setLocalDateFrom(fmt(today))
      setLocalDateTo(fmt(next7))
    } else if (preset === 'thisMonth') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      setLocalDateFrom(fmt(start))
      setLocalDateTo(fmt(end))
    } else if (preset === 'quarter') {
      const currentYear = today.getFullYear()
      const quarterIndex = Math.floor(today.getMonth() / 3)
      const start = new Date(currentYear, quarterIndex * 3, 1)
      const end = new Date(currentYear, quarterIndex * 3 + 3, 0)
      setLocalDateFrom(fmt(start))
      setLocalDateTo(fmt(end))
    }
  }

  const filteredUsers = picSearch
    ? users.filter((u) => u.name.toLowerCase().includes(picSearch.toLowerCase()))
    : users

  // Split statuses into 2 columns persis sesuai blueprint UI-11
  // Kolom 1 (Kiri): Not Started, Pending Approval, Approved, Overdue
  // Kolom 2 (Kanan): In Progress, Evidence Req., Rejected, Complete
  let statusCol1: StatusOption[] = []
  let statusCol2: StatusOption[] = []

  if (!config.statuses) {
    statusCol1 = [
      { value: 'NOT_STARTED', label: 'Not Started' },
      { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
      { value: 'APPROVED', label: 'Approved' },
      { value: 'OVERDUE', label: 'Overdue', dot: 'bg-red-500' },
    ]
    statusCol2 = [
      { value: 'IN_PROGRESS', label: 'In Progress' },
      { value: 'EVIDENCE_REQUIRED', label: 'Evidence Req.' },
      { value: 'REJECTED', label: 'Rejected' },
      { value: 'COMPLETE', label: 'Complete' },
    ]
  } else if (config.statuses.length === 8 && config.statuses.some((s) => s.value === 'NOT_STARTED')) {
    const map = Object.fromEntries(config.statuses.map((s) => [s.value, s]))
    statusCol1 = [
      map.NOT_STARTED ?? config.statuses[0],
      map.PENDING_APPROVAL ?? config.statuses[2],
      map.APPROVED ?? config.statuses[4],
      map.OVERDUE ?? { value: 'OVERDUE', label: 'Overdue', dot: 'bg-red-500' },
    ].filter(Boolean)
    statusCol2 = [
      map.IN_PROGRESS ?? config.statuses[1],
      map.EVIDENCE_REQUIRED ?? config.statuses[3],
      map.REJECTED ?? config.statuses[5],
      map.COMPLETE ?? config.statuses[7],
    ].filter(Boolean)
  } else {
    const mid = Math.ceil(config.statuses.length / 2)
    statusCol1 = config.statuses.slice(0, mid)
    statusCol2 = config.statuses.slice(mid)
  }

  const entityTitle = config.entityName || 'Action Plan'
  const displayTotal = config.totalEntities ?? 840

  return (
    <div
      ref={ref}
      className="absolute left-0 top-12 z-50 w-[880px] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      style={{ maxHeight: 'min(640px, calc(100vh - 160px))' }}
    >
      {/* Header Panel */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Parameter Filter Lanjutan
          </span>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold">
            PRD §20 Universal Spec
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded-md inline-flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body: 6 Sections Grid (3 Cols x 2 Rows) */}
      <div className="overflow-y-auto flex-1 p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* ── A. STATUS (8 STATE) ── */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200/70 dark:border-slate-800 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                A. Status (8 State)
              </span>
              {localStatuses.length > 0 && (
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                  {localStatuses.length} dipilih
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 mt-1">
              <div className="space-y-0.5">
                {statusCol1.map((s) => (
                  <CheckItem
                    key={s.value}
                    checked={localStatuses.includes(s.value)}
                    label={s.label}
                    dot={s.dot}
                    isOverdue={s.value === 'OVERDUE' || s.label.toLowerCase().includes('overdue')}
                    onToggle={() => toggleItem(localStatuses, setLocalStatuses, s.value)}
                  />
                ))}
              </div>
              <div className="space-y-0.5">
                {statusCol2.map((s) => (
                  <CheckItem
                    key={s.value}
                    checked={localStatuses.includes(s.value)}
                    label={s.label}
                    dot={s.dot}
                    isOverdue={s.value === 'OVERDUE' || s.label.toLowerCase().includes('overdue')}
                    onToggle={() => toggleItem(localStatuses, setLocalStatuses, s.value)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── B. PIC / PEMILIK AKSI ── */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200/70 dark:border-slate-800 flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
              B. PIC / Pemilik Aksi
            </span>

            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={picSearch}
                onChange={(e) => setPicSearch(e.target.value)}
                placeholder="Cari PIC..."
                className="h-7 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-7 pr-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-0.5 max-h-40 overflow-y-auto pr-1">
              {filteredUsers.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">
                  {users.length === 0 ? 'Memuat PIC...' : 'Tidak ada PIC yang cocok'}
                </p>
              ) : (
                filteredUsers.map((u) => {
                  const divName = u.divisionId ? divisionMap[u.divisionId] : undefined
                  return (
                    <CheckItem
                      key={u.id}
                      checked={localPicIds.includes(u.id)}
                      label={u.name}
                      subLabel={divName ? divName.slice(0, 7) : undefined}
                      avatar={{ name: u.name }}
                      checkboxPosition="right"
                      onToggle={() => toggleItem(localPicIds, setLocalPicIds, u.id)}
                    />
                  )
                })
              )}
            </div>
          </div>

          {/* ── C. DIVISI KERJA ── */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200/70 dark:border-slate-800 flex flex-col">
            <div className="flex items-center gap-1.5 mb-2">
              <Building2 className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                C. Divisi Kerja
              </span>
            </div>

            <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
              {divisions.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">Memuat Divisi...</p>
              ) : (
                divisions.map((d) => (
                  <CheckItem
                    key={d.id}
                    checked={localDivisionIds.includes(d.id)}
                    label={d.name}
                    onToggle={() => toggleItem(localDivisionIds, setLocalDivisionIds, d.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── D. PROJECT INDUK ── */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <FolderKanban className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  D. Project Induk
                </span>
              </div>

              <select
                value={localProjectId}
                onChange={(e) => setLocalProjectId(e.target.value)}
                className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Semua Proyek Induk</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 leading-normal">
              Filter berlaku untuk sub-action items di hierarki proyek terpilih.
            </p>
          </div>

          {/* ── E. TINGKAT PRIORITAS ── */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200/70 dark:border-slate-800 flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2.5">
              E. Tingkat Prioritas
            </span>

            <div className="grid grid-cols-2 gap-2 mt-1">
              {PRIORITY_OPTIONS.map((p) => {
                const checked = localPriorities.includes(p.value)
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => toggleItem(localPriorities, setLocalPriorities, p.value)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-md border text-xs font-semibold transition-all ${
                      checked
                        ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                        checked ? 'border-white bg-white' : 'border-slate-400 dark:border-slate-500 bg-transparent'
                      }`}
                    >
                      {checked && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
                    </span>
                    <span>{p.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── F. RENTANG TANGGAL (DEADLINE) ── */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-lg border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  F. Rentang Tanggal (Deadline)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={localDateFrom}
                  onChange={(e) => setLocalDateFrom(e.target.value)}
                  className="flex-1 h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-400 shrink-0 font-medium">s/d</span>
                <input
                  type="date"
                  value={localDateTo}
                  min={localDateFrom || undefined}
                  onChange={(e) => setLocalDateTo(e.target.value)}
                  className="flex-1 h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Quick preset buttons: [ 7 Hari ] [ Bulan Ini ] [ Q3 FY25 ] */}
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => applyDatePreset('7days')}
                className="flex-1 h-7 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-[11px] font-medium text-slate-600 dark:text-slate-300 transition-colors"
              >
                7 Hari
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('thisMonth')}
                className="flex-1 h-7 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-[11px] font-medium text-slate-600 dark:text-slate-300 transition-colors"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('quarter')}
                className="flex-1 h-7 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-[11px] font-medium text-slate-600 dark:text-slate-300 transition-colors"
              >
                Q3 FY25
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Panel */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Menyaring{' '}
          <strong className="text-slate-800 dark:text-slate-200 font-semibold">
            {totalResults ?? 0}
          </strong>{' '}
          dari{' '}
          <strong className="text-slate-800 dark:text-slate-200 font-semibold">
            {displayTotal}
          </strong>{' '}
          {entityTitle}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            Reset Filter
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Terapkan Filter
          </button>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Main FilterToolbar Component (UI-11)
// ──────────────────────────────────────────────────────────────────────────────

export function FilterToolbar({
  filterState,
  sortOptions = DEFAULT_SORT_OPTIONS,
  filterConfig = {},
  currentView = 'table',
  onViewChange,
  totalResults,
  loading = false,
  onNew,
  newLabel = 'New',
}: FilterToolbarProps) {
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  const {
    search,
    statuses,
    priorities,
    divisionIds,
    picIds,
    projectId,
    dateFrom,
    dateTo,
    sortBy,
    setSearch,
    setStatuses,
    setPriorities,
    setDivisionIds,
    setPicIds,
    setProjectId,
    setDateFrom,
    setDateTo,
    setSortBy,
    resetFilters,
    activeFilterCount,
  } = filterState

  // Lookups untuk filter chips
  const statusLabelMap = Object.fromEntries(
    (filterConfig.statuses ?? []).map((s) => [s.value, s.label])
  )
  const [divisionNames, setDivisionNames] = useState<Record<string, string>>({})
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  const [projectNames, setProjectNames] = useState<Record<string, string>>({})

  useEffect(() => {
    if (filterConfig.divisions !== false && divisionIds.length > 0) {
      fetch('/api/divisions')
        .then((r) => (r.ok ? r.json() : []))
        .then((data: { id: string; name: string }[]) => {
          setDivisionNames(Object.fromEntries(data.map((d) => [d.id, d.name])))
        })
        .catch(() => {})
    }
  }, [filterConfig.divisions, divisionIds])

  useEffect(() => {
    if (filterConfig.pics !== false && picIds.length > 0) {
      fetch('/api/users')
        .then((r) => (r.ok ? r.json() : []))
        .then((data: { id: string; name: string }[]) => {
          setUserNames(Object.fromEntries(data.map((u) => [u.id, u.name])))
        })
        .catch(() => {})
    }
  }, [filterConfig.pics, picIds])

  useEffect(() => {
    if (filterConfig.projects !== false && projectId) {
      fetch('/api/projects')
        .then((r) => (r.ok ? r.json() : []))
        .then((data: { id: string; name: string }[]) => {
          setProjectNames(Object.fromEntries(data.map((p) => [p.id, p.name])))
        })
        .catch(() => {})
    }
  }, [filterConfig.projects, projectId])

  const isFilterActive = activeFilterCount > 0

  return (
    <div className="space-y-2.5">
      {/* ── Toolbar Root: 44px Auto-Wrap Container ── */}
      <div className="min-h-[44px] flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-2xs">
        {/* Kiri: Search (36px) + Filter Button (Active/Idle) + Sort Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Search Box 36px (py-2) with 250ms debounce */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, PIC, atau kata kunci..."
              className="h-9 w-60 sm:w-68 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-8 text-xs sm:text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* 2. Filter Button with Active Accent & Visual Counter Badge */}
          <div ref={filterRef} className="relative">
            <button
              type="button"
              onClick={() => setFilterPanelOpen((v) => !v)}
              className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-semibold transition-all shadow-2xs ${
                isFilterActive || filterPanelOpen
                  ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border border-blue-600'
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" />
              <span>Filter</span>

              {isFilterActive && (
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-white text-blue-700 text-xs font-black shadow-xs">
                  {activeFilterCount}
                </span>
              )}

              {filterPanelOpen ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
              )}
            </button>

            {filterPanelOpen && (
              <AdvancedFilterPanel
                filterState={filterState}
                config={filterConfig}
                totalResults={totalResults}
                onClose={() => setFilterPanelOpen(false)}
              />
            )}
          </div>

          {/* 3. Sort Dropdown (Sort: [Label]) */}
          <SortDropdown value={sortBy} onChange={setSortBy} options={sortOptions} />
        </div>

        {/* Kanan: Modular View Switcher (Table / Board / Calendar) + Tombol + New */}
        <div className="flex items-center gap-2.5">
          {/* Modular View Switcher: [Table] [Board] [Calendar] */}
          {onViewChange && (
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-300/60 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onViewChange('table')}
                title="Tampilan Table"
                className={`inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-md transition-all ${
                  currentView === 'table'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>

              <button
                type="button"
                onClick={() => onViewChange('board')}
                title="Tampilan Board Kanban"
                className={`inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-md transition-all ${
                  currentView === 'board'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Board</span>
              </button>

              <button
                type="button"
                onClick={() => onViewChange('calendar')}
                title="Tampilan Kalender"
                className={`inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-md transition-all ${
                  currentView === 'calendar'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Calendar</span>
              </button>
            </div>
          )}

          {/* Action Button: + New */}
          {onNew && (
            <button
              type="button"
              onClick={onNew}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>{newLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Active Filter Chips Row (Keadaan 2) ── */}
      {(isFilterActive || search) && (
        <div className="flex flex-wrap items-center gap-1.5 px-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 shrink-0">
            FILTER AKTIF:
          </span>

          {/* Keyword Search Chip */}
          {search && (
            <ActiveChip
              label={`Keyword: '${search}'`}
              onRemove={() => setSearch('')}
            />
          )}

          {/* Status Chips */}
          {statuses.map((s) => (
            <ActiveChip
              key={s}
              label={`Status: ${statusLabelMap[s] ?? s}`}
              dot={
                s === 'IN_PROGRESS' || s.toLowerCase().includes('progress')
                  ? 'bg-blue-500'
                  : s === 'OVERDUE' || s.toLowerCase().includes('overdue')
                  ? 'bg-red-500'
                  : s === 'APPROVED' || s === 'ACTIVE' || s.toLowerCase().includes('aktif')
                  ? 'bg-emerald-500'
                  : s === 'PENDING_APPROVAL' || s === 'SUBMITTED'
                  ? 'bg-amber-500'
                  : 'bg-blue-500'
              }
              onRemove={() => setStatuses(statuses.filter((x) => x !== s))}
            />
          ))}

          {/* Divisi Chips */}
          {divisionIds.map((id) => (
            <ActiveChip
              key={id}
              label={`Divisi: ${divisionNames[id] ?? '...'}`}
              dot="bg-teal-500"
              onRemove={() => setDivisionIds(divisionIds.filter((x) => x !== id))}
            />
          ))}

          {/* Priority Chips */}
          {priorities.map((p) => (
            <ActiveChip
              key={p}
              label={`Prioritas: ${p}`}
              dot={
                p === 'HIGH' || p === 'URGENT'
                  ? 'bg-red-500'
                  : p === 'MEDIUM'
                  ? 'bg-amber-500'
                  : 'bg-blue-500'
              }
              onRemove={() => setPriorities(priorities.filter((x) => x !== p))}
            />
          ))}

          {/* PIC Chips */}
          {picIds.map((id) => (
            <ActiveChip
              key={id}
              label={`PIC: ${userNames[id] ?? '...'}`}
              dot="bg-indigo-500"
              onRemove={() => setPicIds(picIds.filter((x) => x !== id))}
            />
          ))}

          {/* Project Induk Chip */}
          {projectId && (
            <ActiveChip
              label={`Proyek: ${projectNames[projectId] ?? '...'}`}
              dot="bg-purple-500"
              onRemove={() => setProjectId && setProjectId('')}
            />
          )}

          {/* Date Range Chip */}
          {(dateFrom || dateTo) && (
            <ActiveChip
              label={`Deadline: ${dateFrom || '...'} s/d ${dateTo || '...'}`}
              dot="bg-amber-500"
              onRemove={() => {
                setDateFrom('')
                setDateTo('')
              }}
            />
          )}

          {/* Hapus Semua Filter (Link Merah) */}
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-semibold text-red-500 hover:text-red-600 dark:text-red-400 hover:underline underline-offset-2 transition-colors ml-1"
          >
            Hapus semua filter
          </button>
        </div>
      )}
    </div>
  )
}

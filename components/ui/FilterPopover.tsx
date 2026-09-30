'use client'

import { useEffect, useRef, useState } from 'react'
import {
  SlidersHorizontal,
  X,
  Search,
  Building2,
  FolderKanban,
  Calendar,
  Check,
} from 'lucide-react'

// ──────────────────────────────────────────────────────────────────────────────
// Interfaces & Types
// ──────────────────────────────────────────────────────────────────────────────

export interface StatusOption {
  value: string
  label: string
  dot?: string
}

export interface PriorityOption {
  value: string
  label: string
}

export interface DivisionOption {
  id: string
  name: string
}

export interface PicOption {
  id: string
  name: string
  divisionId?: string
  division?: { name: string } | null
}

export interface ProjectOption {
  id: string
  name: string
}

export interface FilterDraftValues {
  statuses: string[]
  priorities: string[]
  divisionIds: string[]
  picIds: string[]
  projectId: string
  dateFrom: string
  dateTo: string
  customType?: string
}

export interface FilterPopoverConfig {
  statuses?: StatusOption[] | false
  priorities?: boolean | PriorityOption[] | false
  divisions?: boolean | DivisionOption[] | false
  pics?: boolean | PicOption[] | false
  projects?: boolean | ProjectOption[] | false
  dateRange?: boolean | false
  customTypes?: { value: string; label: string }[] | false
  customTypeLabel?: string
  entityName?: string
  totalEntities?: number
}

export interface FilterPopoverProps {
  isOpen: boolean
  onClose: () => void
  onApply: (values: FilterDraftValues) => void
  initialValues: Partial<FilterDraftValues>
  config: FilterPopoverConfig
  totalResults?: number
  align?: 'left' | 'right'
}

const DEFAULT_PRIORITIES: PriorityOption[] = [
  { value: 'HIGH', label: 'Tinggi' },
  { value: 'MEDIUM', label: 'Sedang' },
  { value: 'LOW', label: 'Rendah' },
]

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
  for (let i = 0; i < name.length; i++) {
    hash = (name.codePointAt(i) ?? 0) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase()
}

// ──────────────────────────────────────────────────────────────────────────────
// CheckItem Component
// ──────────────────────────────────────────────────────────────────────────────

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
          ? 'bg-blue-50/80 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 font-medium'
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
// Main FilterPopover
// ──────────────────────────────────────────────────────────────────────────────

export function FilterPopover({
  isOpen,
  onClose,
  onApply,
  initialValues,
  config,
  totalResults,
  align = 'left',
}: FilterPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Draft buffer
  const [draftStatuses, setDraftStatuses] = useState<string[]>(initialValues.statuses ?? [])
  const [draftPriorities, setDraftPriorities] = useState<string[]>(initialValues.priorities ?? [])
  const [draftDivisionIds, setDraftDivisionIds] = useState<string[]>(initialValues.divisionIds ?? [])
  const [draftPicIds, setDraftPicIds] = useState<string[]>(initialValues.picIds ?? [])
  const [draftProjectId, setDraftProjectId] = useState<string>(initialValues.projectId ?? '')
  const [draftDateFrom, setDraftDateFrom] = useState<string>(initialValues.dateFrom ?? '')
  const [draftDateTo, setDraftDateTo] = useState<string>(initialValues.dateTo ?? '')
  const [draftCustomType, setDraftCustomType] = useState<string>(initialValues.customType ?? '')

  // Fetched data
  const [fetchedDivisions, setFetchedDivisions] = useState<DivisionOption[]>([])
  const [fetchedUsers, setFetchedUsers] = useState<PicOption[]>([])
  const [fetchedProjects, setFetchedProjects] = useState<ProjectOption[]>([])
  const [picSearch, setPicSearch] = useState('')

  // Sync draft state on open / initialValues change
  useEffect(() => {
    if (isOpen) {
      setDraftStatuses(initialValues.statuses ?? [])
      setDraftPriorities(initialValues.priorities ?? [])
      setDraftDivisionIds(initialValues.divisionIds ?? [])
      setDraftPicIds(initialValues.picIds ?? [])
      setDraftProjectId(initialValues.projectId ?? '')
      setDraftDateFrom(initialValues.dateFrom ?? '')
      setDraftDateTo(initialValues.dateTo ?? '')
      setDraftCustomType(initialValues.customType ?? '')
      setPicSearch('')
    }
  }, [isOpen, initialValues])

  // Click outside & Escape key listeners
  useEffect(() => {
    if (!isOpen) return

    function handleMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // Data fetching if requested as boolean
  useEffect(() => {
    if (!isOpen) return

    if (config.divisions === true) {
      fetch('/api/divisions')
        .then((r) => (r.ok ? r.json() : []))
        .then(setFetchedDivisions)
        .catch(() => {})
    }

    if (config.pics === true) {
      fetch('/api/users')
        .then((r) => (r.ok ? r.json() : []))
        .then(setFetchedUsers)
        .catch(() => {})
    }

    if (config.projects === true) {
      fetch('/api/projects')
        .then((r) => (r.ok ? r.json() : []))
        .then(setFetchedProjects)
        .catch(() => {})
    }
  }, [isOpen, config.divisions, config.pics, config.projects])

  if (!isOpen) return null

  // Resolution of data lists
  const divisions: DivisionOption[] = Array.isArray(config.divisions)
    ? config.divisions
    : fetchedDivisions

  const users: PicOption[] = Array.isArray(config.pics)
    ? config.pics
    : fetchedUsers

  const projects: ProjectOption[] = Array.isArray(config.projects)
    ? config.projects
    : fetchedProjects

  const priorities: PriorityOption[] = Array.isArray(config.priorities)
    ? config.priorities
    : DEFAULT_PRIORITIES

  const divisionMap = Object.fromEntries(divisions.map((d) => [d.id, d.name]))

  // Handlers
  function toggleStatus(val: string) {
    setDraftStatuses((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
    )
  }

  function togglePriority(val: string) {
    setDraftPriorities((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
    )
  }

  function toggleDivision(id: string) {
    setDraftDivisionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function togglePic(id: string) {
    setDraftPicIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function handleReset() {
    setDraftStatuses([])
    setDraftPriorities([])
    setDraftDivisionIds([])
    setDraftPicIds([])
    setDraftProjectId('')
    setDraftDateFrom('')
    setDraftDateTo('')
    setDraftCustomType('')
  }

  function handleApply() {
    onApply({
      statuses: draftStatuses,
      priorities: draftPriorities,
      divisionIds: draftDivisionIds,
      picIds: draftPicIds,
      projectId: draftProjectId,
      dateFrom: draftDateFrom,
      dateTo: draftDateTo,
      customType: draftCustomType,
    })
    onClose()
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
      setDraftDateFrom(fmt(today))
      setDraftDateTo(fmt(next7))
    } else if (preset === 'thisMonth') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      setDraftDateFrom(fmt(start))
      setDraftDateTo(fmt(end))
    } else if (preset === 'quarter') {
      const currentYear = today.getFullYear()
      const quarterIndex = Math.floor(today.getMonth() / 3)
      const start = new Date(currentYear, quarterIndex * 3, 1)
      const end = new Date(currentYear, quarterIndex * 3 + 3, 0)
      setDraftDateFrom(fmt(start))
      setDraftDateTo(fmt(end))
    }
  }

  // Determine section visibility
  const showStatuses = Boolean(config.statuses && Array.isArray(config.statuses) && config.statuses.length > 0)
  const showPriorities = Boolean(config.priorities)
  const showDivisions = Boolean(config.divisions)
  const showPics = Boolean(config.pics)
  const showProjects = Boolean(config.projects)
  const showDateRange = Boolean(config.dateRange)
  const showCustomTypes = Boolean(config.customTypes && Array.isArray(config.customTypes) && config.customTypes.length > 0)

  const filteredUsers = picSearch
    ? users.filter((u) => u.name.toLowerCase().includes(picSearch.toLowerCase()))
    : users

  const statusList: StatusOption[] = Array.isArray(config.statuses) ? config.statuses : []

  const entityTitle = config.entityName || 'Item'
  const displayTotal = config.totalEntities

  // Anchoring position class
  const anchorClass =
    align === 'right'
      ? 'right-0 sm:right-0 sm:left-auto'
      : 'right-0 sm:right-auto sm:left-0'

  return (
    <div
      ref={panelRef}
      className={`absolute ${anchorClass} top-11 z-50 w-[320px] sm:w-[480px] lg:w-[560px] max-w-[90vw] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
      style={{ maxHeight: 'min(560px, calc(100vh - 140px))' }}
    >
      {/* Header Panel */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/70 dark:bg-slate-900/70">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Parameter Filter
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup filter"
          className="h-7 w-7 rounded-md inline-flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body: Modular Grid Sections */}
      <div className="overflow-y-auto flex-1 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* ── Custom Type Section (e.g. Jenis Item / Prospek) ── */}
          {showCustomTypes && Array.isArray(config.customTypes) && (
            <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 flex flex-col sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                {config.customTypeLabel || 'Jenis Item'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {config.customTypes.map((t) => {
                  const active = draftCustomType === t.value
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setDraftCustomType(active ? '' : t.value)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        active
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── A. STATUS ── */}
          {showStatuses && (
            <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Status
                </span>
                {draftStatuses.length > 0 && (
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                    {draftStatuses.length} dipilih
                  </span>
                )}
              </div>

              <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
                {statusList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 text-center">Tidak ada opsi status</p>
                ) : (
                  statusList.map((s) => (
                    <CheckItem
                      key={s.value}
                      checked={draftStatuses.includes(s.value)}
                      label={s.label}
                      dot={s.dot}
                      isOverdue={s.value === 'OVERDUE' || s.label.toLowerCase().includes('overdue')}
                      onToggle={() => toggleStatus(s.value)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── B. PIC / PEMILIK AKSI ── */}
          {showPics && (
            <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                PIC / Penanggung Jawab
              </span>

              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={picSearch}
                  onChange={(e) => setPicSearch(e.target.value)}
                  placeholder="Cari PIC..."
                  className="h-7 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-6 pr-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-0.5 max-h-36 overflow-y-auto pr-1">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 text-center">
                    {users.length === 0 ? 'Memuat PIC...' : 'Tidak ada PIC yang cocok'}
                  </p>
                ) : (
                  filteredUsers.map((u) => {
                    const divName = u.division?.name || (u.divisionId ? divisionMap[u.divisionId] : undefined)
                    return (
                      <CheckItem
                        key={u.id}
                        checked={draftPicIds.includes(u.id)}
                        label={u.name}
                        subLabel={divName ? divName.slice(0, 8) : undefined}
                        avatar={{ name: u.name }}
                        checkboxPosition="right"
                        onToggle={() => togglePic(u.id)}
                      />
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* ── C. DIVISI KERJA ── */}
          {showDivisions && (
            <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 flex flex-col">
              <div className="flex items-center gap-1.5 mb-2">
                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Divisi Kerja
                </span>
              </div>

              <div className="space-y-0.5 max-h-40 overflow-y-auto pr-1">
                {divisions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 text-center">Memuat Divisi...</p>
                ) : (
                  divisions.map((d) => (
                    <CheckItem
                      key={d.id}
                      checked={draftDivisionIds.includes(d.id)}
                      label={d.name}
                      onToggle={() => toggleDivision(d.id)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── D. PROJECT INDUK ── */}
          {showProjects && (
            <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <FolderKanban className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Project Induk
                  </span>
                </div>

                <select
                  value={draftProjectId}
                  onChange={(e) => setDraftProjectId(e.target.value)}
                  className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">Semua Proyek Induk</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-tight">
                Filter berlaku untuk item pada hierarki proyek terpilih.
              </p>
            </div>
          )}

          {/* ── E. TINGKAT PRIORITAS ── */}
          {showPriorities && (
            <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                Tingkat Prioritas
              </span>

              <div className="grid grid-cols-2 gap-1.5 mt-0.5">
                {priorities.map((p) => {
                  const checked = draftPriorities.includes(p.value)
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => togglePriority(p.value)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs font-semibold transition-all ${
                        checked
                          ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-full border ${
                          checked
                            ? 'border-white bg-white'
                            : 'border-slate-400 dark:border-slate-500 bg-transparent'
                        }`}
                      >
                        {checked && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
                      </span>
                      <span className="truncate">{p.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── F. RENTANG TANGGAL (DEADLINE) ── */}
          {showDateRange && (
            <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Rentang Tanggal
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={draftDateFrom}
                    onChange={(e) => setDraftDateFrom(e.target.value)}
                    className="flex-1 h-7 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-400 shrink-0 font-medium">s/d</span>
                  <input
                    type="date"
                    value={draftDateTo}
                    min={draftDateFrom || undefined}
                    onChange={(e) => setDraftDateTo(e.target.value)}
                    className="flex-1 h-7 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Quick preset buttons */}
              <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => applyDatePreset('7days')}
                  className="flex-1 h-6 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-[10px] font-medium text-slate-600 dark:text-slate-300 transition-colors"
                >
                  7 Hari
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('thisMonth')}
                  className="flex-1 h-6 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-[10px] font-medium text-slate-600 dark:text-slate-300 transition-colors"
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('quarter')}
                  className="flex-1 h-6 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-[10px] font-medium text-slate-600 dark:text-slate-300 transition-colors"
                >
                  Kuartal Ini
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Panel */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {totalResults !== undefined ? (
            <>
              <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                {totalResults}
              </strong>{' '}
              {displayTotal !== undefined && (
                <>
                  dari{' '}
                  <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                    {displayTotal}
                  </strong>{' '}
                </>
              )}
              {entityTitle}
            </>
          ) : (
            <span className="text-[11px] text-slate-400">Filter kustom</span>
          )}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            Reset Filter
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Terapkan Filter
          </button>
        </div>
      </div>
    </div>
  )
}

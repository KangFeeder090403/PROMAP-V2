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
  Plus,
} from 'lucide-react'
import type { FilterState, FilterStateActions } from '@/lib/use-filter-state'
import {
  FilterPopover,
  type StatusOption,
  type PriorityOption,
  type DivisionOption,
  type PicOption,
  type ProjectOption,
  type FilterDraftValues,
} from '@/components/ui/FilterPopover'

export type { StatusOption, PriorityOption, DivisionOption, PicOption, ProjectOption }

// ──────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ──────────────────────────────────────────────────────────────────────────────

export interface SortOption {
  value: string
  label: string
}

export interface FilterToolbarConfig {
  statuses?: StatusOption[] | false
  priorities?: boolean | PriorityOption[] | false
  divisions?: boolean | DivisionOption[] | false
  pics?: boolean | PicOption[] | false
  projects?: boolean | ProjectOption[] | false
  dateRange?: boolean | false
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

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [ref, onClose])
}

// ──────────────────────────────────────────────────────────────────────────────
// ActiveChip: 24px Pill with Remove Button
// ──────────────────────────────────────────────────────────────────────────────

export function ActiveChip({
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
        className="flex items-center justify-center h-3.5 w-3.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-500 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-100 transition-colors ml-0.5 cursor-pointer"
        aria-label={`Hapus filter ${label}`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
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
                {active && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-300 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
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
    (Array.isArray(filterConfig.statuses) ? filterConfig.statuses : []).map((s) => [s.value, s.label])
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

  const handleApplyDraft = (draft: FilterDraftValues) => {
    setStatuses(draft.statuses)
    setPriorities(draft.priorities)
    setDivisionIds(draft.divisionIds)
    setPicIds(draft.picIds)
    if (setProjectId) setProjectId(draft.projectId)
    setDateFrom(draft.dateFrom)
    setDateTo(draft.dateTo)
  }

  return (
    <div className="space-y-2.5">
      {/* ── Toolbar Root: 44px Auto-Wrap Container ── */}
      <div className="min-h-[44px] flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-2xs">
        {/* Kiri: Search (36px) + Filter Button (Active/Idle) + Sort Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Search Box with clear button */}
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
                aria-label="Bersihkan pencarian"
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
              className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-semibold transition-all shadow-2xs cursor-pointer ${
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

            <FilterPopover
              isOpen={filterPanelOpen}
              onClose={() => setFilterPanelOpen(false)}
              onApply={handleApplyDraft}
              initialValues={{
                statuses,
                priorities,
                divisionIds,
                picIds,
                projectId,
                dateFrom,
                dateTo,
              }}
              config={filterConfig}
              totalResults={totalResults}
            />
          </div>

          {/* 3. Sort Dropdown (Sort: [Label]) */}
          <SortDropdown value={sortBy} onChange={setSortBy} options={sortOptions} />
        </div>

        {/* Kanan: Modular View Switcher (Table / Board / Calendar) + Tombol + New */}
        <div className="flex items-center gap-2.5">
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
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>{newLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Active Filter Chips Row ── */}
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

          {/* Hapus Semua Filter */}
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-semibold text-red-500 hover:text-red-600 dark:text-red-400 hover:underline underline-offset-2 transition-colors ml-1 cursor-pointer"
          >
            Hapus semua filter
          </button>
        </div>
      )}
    </div>
  )
}

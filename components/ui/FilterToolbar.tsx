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
    <span className="inline-flex items-center gap-1.5 h-6 pl-2.5 pr-1.5 rounded-sm bg-muted text-xs font-medium text-foreground border border-border">
      {dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />}
      <span className="truncate max-w-[200px]">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center justify-center h-3.5 w-3.5 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ml-0.5 cursor-pointer"
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
        className={`inline-flex items-center gap-2 h-10 px-3 rounded-md border text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          open
            ? 'border-input bg-accent text-foreground'
            : 'border-input bg-card text-fg-secondary hover:bg-accent'
        }`}
      >
        <ArrowUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="whitespace-nowrap">
          Sort: <span className="font-semibold text-foreground">{current?.label ?? 'Terbaru'}</span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 min-w-[210px] rounded-lg border border-border bg-popover text-popover-foreground shadow-md dark:shadow-none py-1.5">
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
                    ? 'bg-accent text-foreground font-semibold'
                    : 'text-fg-secondary hover:bg-accent hover:text-foreground'
                }`}
              >
                <span>{opt.label}</span>
                {active && <Check className="h-3.5 w-3.5 text-foreground shrink-0" />}
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
      <div className="min-h-[52px] flex flex-wrap items-center justify-between gap-2.5 bg-card border border-border rounded-lg px-2.5 py-1.5 shadow-sm dark:shadow-none">
        {/* Kiri: Search (36px) + Filter Button (Active/Idle) + Sort Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Search Box with clear button */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, PIC, atau kata kunci..."
              className="h-10 w-60 sm:w-72 rounded-md border border-input bg-card pl-9 pr-8 text-base md:text-sm text-foreground placeholder:text-muted-foreground ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Bersihkan pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
              className={`inline-flex items-center gap-2 h-10 px-3.5 rounded-md text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer ${
                isFilterActive || filterPanelOpen
                  ? 'bg-primary hover:bg-primary-hover text-primary-foreground border border-primary'
                  : 'bg-card hover:bg-accent text-fg-secondary border border-input'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" />
              <span>Filter</span>

              {isFilterActive && (
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-sm bg-primary-foreground text-primary text-xs font-bold">
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
            <div className="flex items-center bg-muted p-0.5 rounded-md border border-border">
              <button
                type="button"
                onClick={() => onViewChange('table')}
                title="Tampilan Table"
                className={`inline-flex items-center gap-1.5 h-9 px-2.5 text-xs font-semibold rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  currentView === 'table'
                    ? 'bg-card text-foreground shadow-sm dark:shadow-none'
                    : 'text-fg-secondary hover:text-foreground'
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>

              <button
                type="button"
                onClick={() => onViewChange('board')}
                title="Tampilan Board Kanban"
                className={`inline-flex items-center gap-1.5 h-9 px-2.5 text-xs font-semibold rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  currentView === 'board'
                    ? 'bg-card text-foreground shadow-sm dark:shadow-none'
                    : 'text-fg-secondary hover:text-foreground'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Board</span>
              </button>

              <button
                type="button"
                onClick={() => onViewChange('calendar')}
                title="Tampilan Kalender"
                className={`inline-flex items-center gap-1.5 h-9 px-2.5 text-xs font-semibold rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  currentView === 'calendar'
                    ? 'bg-card text-foreground shadow-sm dark:shadow-none'
                    : 'text-fg-secondary hover:text-foreground'
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
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
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
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1 shrink-0">
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
            className="text-xs font-semibold text-destructive-text hover:underline underline-offset-2 transition-colors ml-1 cursor-pointer"
          >
            Hapus semua filter
          </button>
        </div>
      )}
    </div>
  )
}

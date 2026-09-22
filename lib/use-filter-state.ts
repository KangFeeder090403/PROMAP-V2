'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface FilterState {
  search: string
  statuses: string[]
  priorities: string[]
  divisionIds: string[]
  picIds: string[]
  projectId: string
  dateFrom: string
  dateTo: string
  sortBy: string
  page: number
  view?: 'table' | 'board' | 'calendar'
}

export interface FilterStateActions {
  setSearch: (v: string) => void
  setStatuses: (v: string[]) => void
  setPriorities: (v: string[]) => void
  setDivisionIds: (v: string[]) => void
  setPicIds: (v: string[]) => void
  setProjectId: (v: string) => void
  setDateFrom: (v: string) => void
  setDateTo: (v: string) => void
  setSortBy: (v: string) => void
  setPage: (v: number) => void
  setView: (v: 'table' | 'board' | 'calendar') => void
  resetFilters: () => void
  restoreDefaults: () => void
  toggleValue: (field: 'statuses' | 'priorities' | 'divisionIds' | 'picIds', value: string) => void
  activeFilterCount: number
  /** Nilai search yang sudah di-debounce (siap dikirim ke API) */
  debouncedSearch: string
}

const DEFAULT_SORT = 'newest'
const DEFAULT_VIEW = 'table'

const EMPTY: FilterState = {
  search: '',
  statuses: [],
  priorities: [],
  divisionIds: [],
  picIds: [],
  projectId: '',
  dateFrom: '',
  dateTo: '',
  sortBy: DEFAULT_SORT,
  page: 1,
  view: DEFAULT_VIEW,
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function readFromParams(params: URLSearchParams): FilterState {
  const viewVal = params.get('view')
  const validView = viewVal === 'board' || viewVal === 'calendar' || viewVal === 'table' ? viewVal : 'table'
  return {
    search: params.get('search') ?? '',
    statuses: params.getAll('status'),
    priorities: params.getAll('priority'),
    divisionIds: params.getAll('divisionId'),
    picIds: params.getAll('picId'),
    projectId: params.get('projectId') ?? '',
    dateFrom: params.get('dateFrom') ?? '',
    dateTo: params.get('dateTo') ?? '',
    sortBy: params.get('sortBy') ?? DEFAULT_SORT,
    page: Math.max(1, Number(params.get('page') ?? '1') || 1),
    view: validView,
  }
}

function buildParams(state: FilterState): URLSearchParams {
  const p = new URLSearchParams()
  if (state.search) p.set('search', state.search)
  state.statuses.forEach((s) => p.append('status', s))
  state.priorities.forEach((s) => p.append('priority', s))
  state.divisionIds.forEach((s) => p.append('divisionId', s))
  state.picIds.forEach((s) => p.append('picId', s))
  if (state.projectId) p.set('projectId', state.projectId)
  if (state.dateFrom) p.set('dateFrom', state.dateFrom)
  if (state.dateTo) p.set('dateTo', state.dateTo)
  if (state.sortBy && state.sortBy !== DEFAULT_SORT) p.set('sortBy', state.sortBy)
  if (state.page > 1) p.set('page', String(state.page))
  if (state.view && state.view !== DEFAULT_VIEW) p.set('view', state.view)
  return p
}

function countActiveFilters(state: FilterState): number {
  return (
    state.statuses.length +
    state.priorities.length +
    state.divisionIds.length +
    state.picIds.length +
    (state.projectId ? 1 : 0) +
    (state.dateFrom || state.dateTo ? 1 : 0)
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────────────────────

export function useFilterState(debounceMs = 250): FilterState & FilterStateActions {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Inisialisasi dari URL saat pertama kali mount
  const [state, setStateRaw] = useState<FilterState>(() => readFromParams(searchParams))
  const [debouncedSearch, setDebouncedSearch] = useState(state.search)

  // Debounce search (PRD §B8: 250ms)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(state.search)
    }, debounceMs)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [state.search, debounceMs])

  // Sync URL saat state berubah (kecuali saat pertama mount)
  const isFirstMount = useRef(true)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    const params = buildParams({ ...state, search: debouncedSearch })
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [
    state.statuses,
    state.priorities,
    state.divisionIds,
    state.picIds,
    state.projectId,
    state.dateFrom,
    state.dateTo,
    state.sortBy,
    state.page,
    state.view,
    debouncedSearch,
  ])

  const setState = useCallback((updater: Partial<FilterState> | ((prev: FilterState) => Partial<FilterState>)) => {
    setStateRaw((prev) => {
      const patch = typeof updater === 'function' ? updater(prev) : updater
      // Reset page ke 1 ketika filter berubah (kecuali kalau yang berubah memang page)
      const resetPage = 'page' in patch ? {} : { page: 1 }
      return { ...prev, ...patch, ...resetPage }
    })
  }, [])

  const toggleValue = useCallback(
    (field: 'statuses' | 'priorities' | 'divisionIds' | 'picIds', value: string) => {
      setState((prev) => ({
        [field]: prev[field].includes(value)
          ? prev[field].filter((v) => v !== value)
          : [...prev[field], value],
      }))
    },
    [setState]
  )

  const resetFilters = useCallback(() => {
    setStateRaw((prev) => ({
      ...prev,
      search: '',
      statuses: [],
      priorities: [],
      divisionIds: [],
      picIds: [],
      projectId: '',
      dateFrom: '',
      dateTo: '',
      page: 1,
    }))
    setDebouncedSearch('')
  }, [])

  const restoreDefaults = useCallback(() => {
    setStateRaw(EMPTY)
    setDebouncedSearch('')
    router.replace(pathname, { scroll: false })
  }, [pathname, router])

  return {
    ...state,
    debouncedSearch,
    setSearch: (v) => setState({ search: v }),
    setStatuses: (v) => setState({ statuses: v }),
    setPriorities: (v) => setState({ priorities: v }),
    setDivisionIds: (v) => setState({ divisionIds: v }),
    setPicIds: (v) => setState({ picIds: v }),
    setProjectId: (v) => setState({ projectId: v }),
    setDateFrom: (v) => setState({ dateFrom: v }),
    setDateTo: (v) => setState({ dateTo: v }),
    setSortBy: (v) => setState({ sortBy: v }),
    setPage: (v) => setState({ page: v }),
    setView: (v) => setState({ view: v }),
    resetFilters,
    restoreDefaults,
    toggleValue,
    activeFilterCount: countActiveFilters(state),
  }
}

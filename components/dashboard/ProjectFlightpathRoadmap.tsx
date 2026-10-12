'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Calendar,
} from 'lucide-react'
import type { PortfolioSummary, ProjectHealth } from '@/lib/types/dashboard'
import { DashboardSectionHeader } from './DashboardSectionHeader'
import {
  type RoadmapViewMode,
  getTimelineViewport,
  generateTimelineTicks,
  calculateProjectBarGeometry,
  calculateTodayPositionPercent,
} from '@/lib/roadmap-timeline'

type FilterTab = 'ALL' | ProjectHealth

interface ProjectFlightpathRoadmapProps {
  portfolio: PortfolioSummary
  onInspectProject?: (projectId: string) => void
}

export function ProjectFlightpathRoadmap({
  portfolio,
  onInspectProject,
}: ProjectFlightpathRoadmapProps) {
  const { projectHealth, healthSummary } = portfolio
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL')
  const [viewMode, setViewMode] = useState<RoadmapViewMode>('Week')
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date())
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null)

  const filteredProjects = useMemo(() => {
    return projectHealth.filter((p) => {
      if (filterTab !== 'ALL' && p.health !== filterTab) return false
      return true
    })
  }, [projectHealth, filterTab])

  // Hitung viewport linimasa dan ticks kolom
  const viewport = useMemo(() => {
    return getTimelineViewport(anchorDate, viewMode)
  }, [anchorDate, viewMode])

  const ticks = useMemo(() => {
    return generateTimelineTicks(viewport, viewMode)
  }, [viewport, viewMode])

  const todayPercent = useMemo(() => {
    return calculateTodayPositionPercent(viewport)
  }, [viewport])

  // Navigasi tanggal
  const handlePrev = () => {
    const next = new Date(anchorDate)
    if (viewMode === 'Day') next.setDate(next.getDate() - 7)
    else if (viewMode === 'Week') next.setDate(next.getDate() - 28)
    else next.setMonth(next.getMonth() - 3)
    setAnchorDate(next)
  }

  const handleNext = () => {
    const next = new Date(anchorDate)
    if (viewMode === 'Day') next.setDate(next.getDate() + 7)
    else if (viewMode === 'Week') next.setDate(next.getDate() + 28)
    else next.setMonth(next.getMonth() + 3)
    setAnchorDate(next)
  }

  const handleResetToday = () => {
    setAnchorDate(new Date())
  }

  const formatDateRange = (dStart: string | Date, dEnd?: string | Date | null) => {
    const s = new Date(dStart)
    const e = dEnd ? new Date(dEnd) : null
    const opt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    if (!e) return s.toLocaleDateString('id-ID', opt)
    return `${s.toLocaleDateString('id-ID', opt)} - ${e.toLocaleDateString('id-ID', opt)}`
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm dark:shadow-none p-5 sm:p-6 lg:p-7 w-full min-w-0">
      <DashboardSectionHeader
        icon={<Activity className="w-4 h-4" aria-hidden="true" />}
        title="Jadwal &amp; Progres Proyek"
        subtitle="Linimasa portofolio interaktif dan status kelancaran proyek aktif"
        action={
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-xs text-foreground font-medium hover:underline underline-offset-2"
          >
            <span>Buka Semua Proyek</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />

      {/* Toolbar Kontrol */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        {/* Kiri: Filter Status Kesehatan */}
        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
              filterTab === 'ALL'
                ? 'bg-card text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Semua ({projectHealth.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('ON_TRACK')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
              filterTab === 'ON_TRACK'
                ? 'bg-card text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span>Sesuai Target ({healthSummary.onTrack})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('AT_RISK')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
              filterTab === 'AT_RISK'
                ? 'bg-card text-amber-700 dark:text-amber-400 font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />
            <span>Perlu Perhatian ({healthSummary.atRisk})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('DELAYED')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
              filterTab === 'DELAYED'
                ? 'bg-card text-red-700 dark:text-red-400 font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
            <span>Terlambat ({healthSummary.delayed})</span>
          </button>
        </div>

        {/* Kanan: Navigasi Periode & Skala Waktu */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Navigasi Geser Tanggal */}
          <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Periode sebelumnya"
              className="p-1.5 rounded-md text-fg-secondary hover:bg-accent transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetToday}
              className="px-2 py-1 text-xs font-medium text-fg-secondary hover:bg-accent rounded-md transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3 text-muted-foreground" />
              <span>Hari Ini</span>
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Periode selanjutnya"
              className="p-1.5 rounded-md text-fg-secondary hover:bg-accent transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pemilih Skala Waktu */}
          <div className="flex items-center bg-muted p-1 rounded-lg">
            {(['Day', 'Week', 'Month'] as RoadmapViewMode[]).map((mode) => {
              const labelMap: Record<RoadmapViewMode, string> = {
                Day: 'Hari',
                Week: 'Pekan',
                Month: 'Bulan',
              }
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    viewMode === mode
                      ? 'bg-card text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {labelMap[mode]}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Kontainer Linimasa Native Dual-Column */}
      {filteredProjects.length === 0 ? (
        <div className="py-12 text-center rounded-lg border border-dashed border-border">
          <p className="text-xs font-medium text-fg-secondary">
            Tidak ada proyek yang sesuai dengan kriteria filter saat ini
          </p>
          <button
            type="button"
            onClick={() => setFilterTab('ALL')}
            className="mt-2 text-xs text-foreground font-medium hover:underline underline-offset-2"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          {/* Scroll container terisolasi horizontal - Anti scroll-trap vertikal */}
          <div className="overflow-x-auto overflow-y-visible">
            <div className="inline-flex min-w-full">
              {/* KOLOM KIRI (Sticky): Info Proyek & Divisi */}
              <div className="w-52 sm:w-64 md:w-72 shrink-0 sticky left-0 z-30 bg-card border-r border-border">
                {/* Header Kolom Kiri */}
                <div className="h-12 px-4 flex items-center border-b border-border bg-muted">
                  <span className="text-xs font-semibold text-fg-secondary uppercase tracking-wider">
                    Proyek &amp; Divisi
                  </span>
                </div>

                {/* Daftar Baris Kiri */}
                <div className="divide-y divide-border">
                  {filteredProjects.map((p) => {
                    const isHovered = hoveredProjectId === p.id
                    return (
                      <button
                        type="button"
                        key={`left-${p.id}`}
                        onMouseEnter={() => setHoveredProjectId(p.id)}
                        onMouseLeave={() => setHoveredProjectId(null)}
                        onFocus={() => setHoveredProjectId(p.id)}
                        onBlur={() => setHoveredProjectId(null)}
                        onClick={() => onInspectProject?.(p.id)}
                        className={`w-full text-left h-14 px-4 flex flex-col justify-center cursor-pointer transition-colors ${
                          isHovered
                            ? 'bg-accent'
                            : 'hover:bg-accent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {p.name}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                            {p.progress}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground truncate">
                            {p.divisionName}
                          </span>
                          {/* Mini Health Dot */}
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              p.health === 'ON_TRACK'
                                ? 'bg-emerald-500'
                                : p.health === 'AT_RISK'
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            aria-hidden="true"
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* KOLOM KANAN: Grid Waktu & Bar Linimasa */}
              <div className="flex-1 min-w-[560px] sm:min-w-[720px] relative">
                {/* Header Grid Waktu */}
                <div className="h-12 border-b border-border bg-muted flex items-stretch">
                  {ticks.map((tick) => (
                    <div
                      key={tick.id}
                      className={`flex-1 min-w-10 px-1 border-r border-border flex flex-col items-center justify-center text-center ${
                        tick.isCurrent
                          ? 'bg-accent font-semibold'
                          : tick.isWeekend
                          ? 'bg-muted/50'
                          : ''
                      }`}
                    >
                      <span
                        className={`text-[11px] leading-tight ${
                          tick.isCurrent
                            ? 'text-foreground font-bold'
                            : 'text-fg-secondary'
                        }`}
                      >
                        {tick.label}
                      </span>
                      {tick.subLabel && (
                        <span className="text-[9px] text-muted-foreground">
                          {tick.subLabel}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Area Baris Linimasa & Today Marker */}
                <div className="relative divide-y divide-border">
                  {/* Today Marker Line (Garis Biru Hari Ini) */}
                  {todayPercent !== null && (
                    <div
                      style={{ left: `${todayPercent}%` }}
                      className="absolute top-0 bottom-0 w-0.5 bg-chart-1 z-20 pointer-events-none"
                    >
                      <div className="w-2 h-2 rounded-full bg-chart-1 -translate-x-[3px] -translate-y-1" />
                    </div>
                  )}

                  {/* Grid Background Lines */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {ticks.map((tick) => (
                      <div
                        key={`grid-${tick.id}`}
                        className={`flex-1 min-w-10 border-r border-border ${
                          tick.isWeekend ? 'bg-muted/30' : ''
                        }`}
                      />
                    ))}
                  </div>

                  {/* Render Bar Proyek */}
                  {filteredProjects.map((p) => {
                    const isHovered = hoveredProjectId === p.id
                    const geo = calculateProjectBarGeometry(
                      p.startDate || p.createdAt,
                      p.endDate,
                      viewport
                    )

                    const barColors =
                      p.health === 'ON_TRACK'
                        ? {
                            border: 'border-emerald-300 dark:border-emerald-700/70',
                            bg: 'bg-emerald-50 dark:bg-emerald-950/40',
                            text: 'text-emerald-800 dark:text-emerald-200',
                            fill: 'bg-emerald-500 dark:bg-emerald-500',
                            badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                          }
                        : p.health === 'AT_RISK'
                        ? {
                            border: 'border-amber-300 dark:border-amber-700/70',
                            bg: 'bg-amber-50 dark:bg-amber-950/40',
                            text: 'text-amber-800 dark:text-amber-200',
                            fill: 'bg-amber-500 dark:bg-amber-500',
                            badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
                          }
                        : {
                            border: 'border-red-300 dark:border-red-700/70',
                            bg: 'bg-red-50 dark:bg-red-950/40',
                            text: 'text-red-800 dark:text-red-200',
                            fill: 'bg-red-500 dark:bg-red-500',
                            badge: 'bg-red-500/15 text-red-700 dark:text-red-400',
                          }

                    return (
                      <div
                        key={`row-${p.id}`}
                        className={`h-14 relative flex items-center transition-colors ${
                          isHovered
                            ? 'bg-accent/50'
                            : 'hover:bg-accent/50'
                        }`}
                      >
                        {geo.isVisibleInViewport ? (
                          <button
                            type="button"
                            onClick={() => onInspectProject?.(p.id)}
                            onMouseEnter={() => setHoveredProjectId(p.id)}
                            onMouseLeave={() => setHoveredProjectId(null)}
                            onFocus={() => setHoveredProjectId(p.id)}
                            onBlur={() => setHoveredProjectId(null)}
                            style={{
                              left: `${geo.leftPercent}%`,
                              width: `${geo.widthPercent}%`,
                            }}
                            title={`${p.name} • ${p.progress}% • ${formatDateRange(
                              p.startDate || p.createdAt,
                              p.endDate
                            )}`}
                            className={`text-left absolute h-7.5 rounded-md border ${barColors.border} ${barColors.bg} cursor-pointer transition-all duration-200 overflow-hidden hover:shadow-md hover:-translate-y-0.5 z-10`}
                          >
                            {/* Progres Fill Bar */}
                            <div
                              style={{ width: `${Math.min(100, Math.max(0, p.progress))}%` }}
                              className={`absolute inset-y-0 left-0 ${barColors.fill} opacity-20`}
                            />

                            {/* Label dalam Bar */}
                            <div className="relative h-full px-2.5 flex items-center justify-between gap-2">
                              <span className={`text-[11px] font-semibold truncate ${barColors.text}`}>
                                {p.name}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm shrink-0 ${barColors.badge}`}
                              >
                                {p.progress}%
                              </span>
                            </div>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onInspectProject?.(p.id)}
                            onMouseEnter={() => setHoveredProjectId(p.id)}
                            onMouseLeave={() => setHoveredProjectId(null)}
                            onFocus={() => setHoveredProjectId(p.id)}
                            onBlur={() => setHoveredProjectId(null)}
                            className="text-left px-3 py-1 text-[11px] text-muted-foreground italic cursor-pointer hover:underline"
                          >
                            {geo.isBeforeViewport
                              ? 'Selesai sebelum periode ini'
                              : 'Jadwal di masa mendatang'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Bar Petunjuk Interaksi */}
          <div className="px-4 py-2.5 border-t border-border bg-muted/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-fg-secondary" />
              <span>Gunakan panah navigasi atau geser horizontal untuk menjelajah linimasa</span>
            </div>
            <span>Klik kartu proyek untuk membuka detail inspeksi</span>
          </div>
        </div>
      )}
    </div>
  )
}

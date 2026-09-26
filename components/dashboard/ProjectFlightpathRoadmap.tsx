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
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 lg:p-7 w-full min-w-0">
      <DashboardSectionHeader
        icon={<Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />}
        title="Jadwal &amp; Progres Proyek"
        subtitle="Linimasa portofolio interaktif dan status kelancaran proyek aktif"
        action={
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
          >
            <span>Buka Semua Proyek</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />

      {/* Toolbar Kontrol */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        {/* Kiri: Filter Status Kesehatan */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              filterTab === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-semibold shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Semua ({projectHealth.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('ON_TRACK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
              filterTab === 'ON_TRACK'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 font-semibold shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span>Sesuai Target ({healthSummary.onTrack})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('AT_RISK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
              filterTab === 'AT_RISK'
                ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 font-semibold shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />
            <span>Perlu Perhatian ({healthSummary.atRisk})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('DELAYED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
              filterTab === 'DELAYED'
                ? 'bg-white dark:bg-slate-900 text-red-700 dark:text-red-400 font-semibold shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
            <span>Terlambat ({healthSummary.delayed})</span>
          </button>
        </div>

        {/* Kanan: Navigasi Periode & Skala Waktu */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Navigasi Geser Tanggal */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Periode sebelumnya"
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetToday}
              className="px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Hari Ini</span>
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Periode selanjutnya"
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pemilih Skala Waktu */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === mode
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
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
        <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Tidak ada proyek yang sesuai dengan kriteria filter saat ini
          </p>
          <button
            type="button"
            onClick={() => setFilterTab('ALL')}
            className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
          {/* Scroll container terisolasi horizontal - Anti scroll-trap vertikal */}
          <div className="overflow-x-auto overflow-y-visible">
            <div className="inline-flex min-w-full">
              {/* KOLOM KIRI (Sticky): Info Proyek & Divisi */}
              <div className="w-52 sm:w-64 md:w-72 shrink-0 sticky left-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-r border-slate-200 dark:border-slate-800 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.06)]">
                {/* Header Kolom Kiri */}
                <div className="h-12 px-4 flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Proyek &amp; Divisi
                  </span>
                </div>

                {/* Daftar Baris Kiri */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
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
                            ? 'bg-blue-50/40 dark:bg-blue-950/20'
                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {p.name}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                            {p.progress}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
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
                <div className="h-12 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-stretch">
                  {ticks.map((tick) => (
                    <div
                      key={tick.id}
                      className={`flex-1 min-w-10 px-1 border-r border-slate-200/60 dark:border-slate-800/50 flex flex-col items-center justify-center text-center ${
                        tick.isCurrent
                          ? 'bg-blue-50/60 dark:bg-blue-950/30 font-semibold'
                          : tick.isWeekend
                          ? 'bg-slate-100/50 dark:bg-slate-800/20'
                          : ''
                      }`}
                    >
                      <span
                        className={`text-[11px] leading-tight ${
                          tick.isCurrent
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {tick.label}
                      </span>
                      {tick.subLabel && (
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">
                          {tick.subLabel}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Area Baris Linimasa & Today Marker */}
                <div className="relative divide-y divide-slate-100 dark:divide-slate-800/60">
                  {/* Today Marker Line (Garis Biru Hari Ini) */}
                  {todayPercent !== null && (
                    <div
                      style={{ left: `${todayPercent}%` }}
                      className="absolute top-0 bottom-0 w-0.5 bg-blue-500 dark:bg-blue-400 z-20 pointer-events-none shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 -translate-x-[3px] -translate-y-1" />
                    </div>
                  )}

                  {/* Grid Background Lines */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {ticks.map((tick) => (
                      <div
                        key={`grid-${tick.id}`}
                        className={`flex-1 min-w-10 border-r border-slate-100 dark:border-slate-800/40 ${
                          tick.isWeekend ? 'bg-slate-50/30 dark:bg-slate-900/40' : ''
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
                            ? 'bg-blue-50/25 dark:bg-blue-950/15'
                            : 'hover:bg-slate-50/40 dark:hover:bg-slate-800/20'
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
                            className={`text-left absolute h-7.5 rounded-lg border ${barColors.border} ${barColors.bg} cursor-pointer transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 z-10`}
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
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${barColors.badge}`}
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
                            className="text-left px-3 py-1 text-[11px] text-slate-400 dark:text-slate-500 italic cursor-pointer hover:underline"
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
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>Gunakan panah navigasi atau geser horizontal untuk menjelajah linimasa</span>
            </div>
            <span>Klik kartu proyek untuk membuka detail inspeksi</span>
          </div>
        </div>
      )}
    </div>
  )
}

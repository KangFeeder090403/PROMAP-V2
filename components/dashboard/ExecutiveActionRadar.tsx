'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Layers,
  Zap,
} from 'lucide-react'
import type { ActionRequiredItem, MilestoneUrgency, PortfolioSummary, UpcomingMilestone } from '@/lib/types/dashboard'

interface ExecutiveActionRadarProps {
  portfolio: PortfolioSummary
  actionRequired: ActionRequiredItem[]
  onOpenActionItem?: (item: ActionRequiredItem) => void
}

type MainTab = 'DECISIONS' | 'RADAR'
type UrgencyTab = 'ALL' | MilestoneUrgency

export function ExecutiveActionRadar({
  portfolio,
  actionRequired,
  onOpenActionItem,
}: ExecutiveActionRadarProps) {
  const { temporalMilestones, upcomingMilestones } = portfolio
  const [mainTab, setMainTab] = useState<MainTab>('DECISIONS')
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyTab>('ALL')

  const decisionsListRef = useRef<HTMLDivElement>(null)
  const radarListRef = useRef<HTMLDivElement>(null)

  const criticalCount = temporalMilestones?.critical?.length ?? 0
  const upcomingCount = temporalMilestones?.upcoming?.length ?? 0
  const horizonCount = temporalMilestones?.horizon?.length ?? 0
  const totalMilestones = upcomingMilestones.length

  const filteredMilestones = (upcomingMilestones as UpcomingMilestone[]).filter((m) => {
    if (urgencyFilter === 'ALL') return true
    return m.urgency === urgencyFilter
  })

  // GSAP Stagger Entrance saat ganti Tab atau Filter (Ultra Dynamic Kinetic)
  useEffect(() => {
    if (mainTab === 'DECISIONS' && decisionsListRef.current) {
      const items = decisionsListRef.current.children
      if (items.length > 0) {
        gsap.fromTo(
          items,
          { opacity: 0, y: -20, scale: 0.92, skewY: -1.5 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            skewY: 0,
            duration: 0.35,
            stagger: 0.045,
            ease: 'back.out(2.2)',
            clearProps: 'transform,opacity',
          }
        )
      }
    }
  }, [mainTab, actionRequired.length])

  useEffect(() => {
    if (mainTab === 'RADAR' && radarListRef.current) {
      const items = radarListRef.current.children
      if (items.length > 0) {
        gsap.fromTo(
          items,
          { opacity: 0, y: -20, scale: 0.92, skewY: -1.5 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            skewY: 0,
            duration: 0.35,
            stagger: 0.04,
            ease: 'back.out(2.2)',
            clearProps: 'transform,opacity',
          }
        )
      }
    }
  }, [mainTab, urgencyFilter])

  // GSAP Ultra Dynamic Kinetic: Slam + Elastic Pop + Glow Flash + Haptic Shake
  const handleActionClick = (e: React.MouseEvent<HTMLElement>, item: ActionRequiredItem) => {
    const btn = e.currentTarget
    const row = btn.closest('[data-action-row]') as HTMLElement | null

    // 1. Slam down & glow flash pada tombol
    gsap.timeline()
      .to(btn, {
        scale: 0.82,
        duration: 0.08,
        ease: 'power3.in',
      })
      .to(btn, {
        scale: 1.16,
        duration: 0.16,
        ease: 'back.out(4)',
      })
      .to(btn, {
        scale: 1,
        duration: 0.12,
        ease: 'power2.out',
      })

    // 2. Micro-shake pada kartu
    if (row) {
      gsap.timeline()
        .to(row, { x: -4, duration: 0.04 })
        .to(row, { x: 4, duration: 0.05 })
        .to(row, { x: -2, duration: 0.04 })
        .to(row, { x: 0, duration: 0.05 })
    }

    // 3. Panggil aksi
    setTimeout(() => {
      if (onOpenActionItem) {
        onOpenActionItem(item)
      }
    }, 180)
  }

  // GSAP Jiggle Bounce pada Tab Switcher
  const handleTabSwitch = (tab: MainTab, e: React.MouseEvent<HTMLElement>) => {
    gsap.timeline()
      .to(e.currentTarget, { scale: 0.88, rotation: -2.5, duration: 0.08, ease: 'power2.in' })
      .to(e.currentTarget, { scale: 1.1, rotation: 2.5, duration: 0.16, ease: 'back.out(3.5)' })
      .to(e.currentTarget, { scale: 1, rotation: 0, duration: 0.1, ease: 'power1.out' })

    setMainTab(tab)
  }

  // Hover Card Lift 3D Effect
  const handleCardHoverEnter = (e: React.MouseEvent<HTMLElement>) => {
    gsap.to(e.currentTarget, {
      y: -3,
      duration: 0.18,
      ease: 'power2.out',
    })
  }

  const handleCardHoverLeave = (e: React.MouseEvent<HTMLElement>) => {
    gsap.to(e.currentTarget, {
      y: 0,
      duration: 0.2,
      ease: 'power2.out',
    })
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm dark:shadow-none p-5 sm:p-6 flex flex-col justify-between w-full min-w-0">
      <div>
        {/* Header & Integrated Segmented Tabs */}
        <div className="pb-4 border-b border-border mb-4 space-y-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                Pusat Persetujuan &amp; Tenggat Waktu
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                Persetujuan yang butuh tindakan dan target jatuh tempo 14 hari
              </p>
            </div>
          </div>

          {/* Switcher Tab Antara Keputusan & Radar (Full-Width Segmented Control) */}
          <div className="grid grid-cols-2 gap-1 bg-muted p-1 rounded-lg w-full">
            <button
              type="button"
              onClick={(e) => handleTabSwitch('DECISIONS', e)}
              className={`py-1.5 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                mainTab === 'DECISIONS'
                  ? 'bg-card text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Perlu Persetujuan</span>
              {actionRequired.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold font-mono">
                  {actionRequired.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={(e) => handleTabSwitch('RADAR', e)}
              className={`py-1.5 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                mainTab === 'RADAR'
                  ? 'bg-card text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Tenggat 14 Hari</span>
              {criticalCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 text-[10px] font-bold font-mono">
                  {criticalCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* KONTEN TAB 1: KEPUTUSAN MENDESAK (ACTION REQUIRED) */}
        {mainTab === 'DECISIONS' && (
          <div className="space-y-3">
            {actionRequired.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-60" aria-hidden="true" />
                <p className="font-semibold text-fg-secondary">
                  Seluruh persetujuan tuntas
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tidak ada proposal baru atau bukti kerja action plan yang menunggu tindakan Anda.
                </p>
              </div>
            ) : (
              <div ref={decisionsListRef} className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {actionRequired.map((item) => {
                  const isProposal = item.kind === 'PROPOSAL'
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg border border-border bg-card hover:bg-accent transition-colors flex items-center justify-between gap-2.5 min-w-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`p-1.5 rounded-md shrink-0 ${
                            isProposal
                              ? 'bg-muted text-fg-secondary'
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          }`}
                        >
                          {isProposal ? (
                            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="shrink-0 whitespace-nowrap text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm bg-muted border border-border text-fg-secondary">
                              {item.refCode}
                            </span>
                            <span className="text-xs font-semibold text-foreground truncate" title={item.title}>
                              {item.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {isProposal ? 'Diusulkan: ' : 'PIC: '}
                            <span className="font-medium text-fg-secondary">{item.picName}</span>
                            {item.deadline && (
                              <span>
                                {' '}&bull; Target:{' '}
                                {new Date(item.deadline).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onOpenActionItem ? (
                          <button
                            type="button"
                            onClick={(e) => handleActionClick(e, item)}
                            className="px-2.5 py-1 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium transition-colors active:scale-95"
                          >
                            Tinjau
                          </button>
                        ) : (
                          <Link
                            href={isProposal ? `/proposals` : `/action-plans/${item.id}`}
                            className="px-2.5 py-1 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium transition-colors active:scale-95"
                          >
                            Tinjau
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* KONTEN TAB 2: RADAR TENGGAT KRITIS 14 HARI */}
        {mainTab === 'RADAR' && (
          <div className="space-y-3">
            {/* Filter Urgensi */}
            {totalMilestones > 0 && (
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg overflow-x-auto mb-3">
                <button
                  type="button"
                  onClick={() => setUrgencyFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 ${
                    urgencyFilter === 'ALL'
                      ? 'bg-card text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Semua ({totalMilestones})
                </button>
                <button
                  type="button"
                  onClick={() => setUrgencyFilter('CRITICAL')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                    urgencyFilter === 'CRITICAL'
                      ? 'bg-card text-red-700 dark:text-red-400 font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Kritis (≤ 3 Hari) ({criticalCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUrgencyFilter('UPCOMING')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                    urgencyFilter === 'UPCOMING'
                      ? 'bg-card text-amber-700 dark:text-amber-400 font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Mendekati (4-7 Hari) ({upcomingCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUrgencyFilter('HORIZON')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                    urgencyFilter === 'HORIZON'
                      ? 'bg-card text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-chart-1" />
                  <span>Mendatang (8-14 Hari) ({horizonCount})</span>
                </button>
              </div>
            )}

            {filteredMilestones.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-60" aria-hidden="true" />
                <p className="font-semibold text-fg-secondary">
                  Semua target waktu aman
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tidak ada milestone yang terancam jatuh tempo dalam rentang ini.
                </p>
              </div>
            ) : (
              <div ref={radarListRef} className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {filteredMilestones.map((m, idx) => {
                  const isCritical = m.urgency === 'CRITICAL' || m.daysLeft <= 3
                  const isUpcoming = m.urgency === 'UPCOMING'

                  return (
                    <div
                      key={`${m.projectId}-${idx}`}
                      className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors min-w-0 ${
                        isCritical
                          ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200/80 dark:border-red-900/50'
                          : isUpcoming
                            ? 'bg-amber-50/40 dark:bg-amber-950/15 border-amber-200/70 dark:border-amber-900/40'
                            : 'bg-muted/60 border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-12 h-10 rounded-md flex flex-col items-center justify-center font-mono shrink-0 leading-none ${
                            isCritical
                              ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-bold'
                              : isUpcoming
                                ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-semibold'
                                : 'bg-card text-fg-secondary font-medium border border-border'
                          }`}
                        >
                          <span className="text-xs">{m.daysLeft}</span>
                          <span className="text-[9px] uppercase">hari</span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate" title={m.title}>
                            {m.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {m.projectName} &bull; {m.divisionName}
                            {m.picName ? ` &bull; PIC: ${m.picName}` : ''}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/projects/${m.projectId}`}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                        title="Buka Proyek"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Horizon pemantauan: <strong>14 Hari ke Depan</strong>
        </span>
        <Link
          href="/calendar"
          className="text-foreground font-medium hover:underline underline-offset-2 text-[11px]"
        >
          Lihat di Kalender &rarr;
        </Link>
      </div>
    </div>
  )
}

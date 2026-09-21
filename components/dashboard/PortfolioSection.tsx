'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Layers } from 'lucide-react'
import type { ActionRequiredItem, DashboardUser, PortfolioSummary } from '@/lib/types/dashboard'
import type { Role } from '@/lib/generated/prisma/client'
import { DashboardSectionHeader } from './DashboardSectionHeader'
import { ExecutiveNarrativeDigest } from './ExecutiveNarrativeDigest'
import { ProjectFlightpathRoadmap } from './ProjectFlightpathRoadmap'
import { ExecutiveActionRadar } from './ExecutiveActionRadar'
import { DivisionVelocityCard } from './DivisionVelocityCard'
import { ProjectDrawer } from '@/components/projects/ProjectDrawer'

interface PortfolioSectionProps {
  portfolio: PortfolioSummary
  user: DashboardUser
  greeting: string
  userRole?: Role
  actionRequired?: ActionRequiredItem[]
  onOpenActionItem?: (item: ActionRequiredItem) => void
}

export function PortfolioSection({
  portfolio,
  user,
  greeting,
  userRole = 'MANAGER',
  actionRequired = [],
  onOpenActionItem,
}: PortfolioSectionProps) {
  const { projectHealth } = portfolio
  const totalProjects = projectHealth.length
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  if (totalProjects === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 w-full min-w-0">
        <DashboardSectionHeader
          icon={<Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />}
          title="Portofolio Proyek"
          subtitle="Pantau progres dan kelancaran seluruh proyek aktif"
        />
        <div className="py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mb-4">
            <Layers className="h-7 w-7" aria-hidden="true" />
          </div>
          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Belum ada proyek aktif
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
            Buat proyek baru untuk mengaktifkan ringkasan eksekutif, linimasa proyek, perbandingan kinerja per divisi, dan pemantauan tenggat waktu 14 hari.
          </p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            Mulai Buat Proyek &rarr;
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* TIER 1: Executive Narrative Briefing & Integrated Macro Anchors */}
      <ExecutiveNarrativeDigest
        portfolio={portfolio}
        user={user}
        greeting={greeting}
        actionRequiredCount={actionRequired.length}
      />

      {/* TIER 2: Macro Visual Flightpath / Roadmap Horizontal Timeline */}
      <ProjectFlightpathRoadmap
        portfolio={portfolio}
        onInspectProject={(id) => setSelectedProjectId(id)}
      />

      {/* TIER 3: Kinerja per Divisi + Radar Tenggat 14 Hari */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full min-w-0">
        <div className="xl:col-span-7 w-full min-w-0">
          <DivisionVelocityCard portfolio={portfolio} />
        </div>
        <div className="xl:col-span-5 w-full min-w-0">
          <ExecutiveActionRadar
            portfolio={portfolio}
            actionRequired={actionRequired}
            onOpenActionItem={onOpenActionItem}
          />
        </div>
      </div>

      {/* Rapid Project Inspection Drawer (Preserves Context & Scroll) */}
      {selectedProjectId && (
        <ProjectDrawer
          projectId={selectedProjectId}
          role={userRole}
          open={!!selectedProjectId}
          onOpenChange={(open) => {
            if (!open) setSelectedProjectId(null)
          }}
          onEdit={(id) => {
            window.location.href = `/projects?open=${id}`
          }}
        />
      )}
    </div>
  )
}

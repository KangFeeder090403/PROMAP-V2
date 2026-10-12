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
      <div className="bg-card rounded-lg border border-border shadow-sm dark:shadow-none p-6 sm:p-8 w-full min-w-0">
        <DashboardSectionHeader
          icon={<Layers className="w-4 h-4" aria-hidden="true" />}
          title="Portofolio Proyek"
          subtitle="Pantau progres dan kelancaran seluruh proyek aktif"
        />
        <div className="py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-fg-secondary mb-4">
            <Layers className="h-7 w-7" aria-hidden="true" />
          </div>
          <h4 className="text-base font-bold text-foreground">
            Belum ada proyek aktif
          </h4>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
            Buat proyek baru untuk mengaktifkan ringkasan eksekutif, linimasa proyek, perbandingan kinerja per divisi, dan pemantauan tenggat waktu 14 hari.
          </p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold transition-colors"
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

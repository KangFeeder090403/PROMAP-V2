'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Layers } from 'lucide-react'
import type { PortfolioSummary } from '@/lib/types/dashboard'
import type { Role } from '@/lib/generated/prisma/client'
import { DashboardSectionHeader } from './DashboardSectionHeader'
import { ProjectFlightpathRoadmap } from './ProjectFlightpathRoadmap'
import { DivisionVelocityCard } from './DivisionVelocityCard'
import { ProjectDrawer } from '@/components/projects/ProjectDrawer'

interface PortfolioSectionProps {
  portfolio: PortfolioSummary
  userRole?: Role
}

export function PortfolioSection({
  portfolio,
  userRole = 'MANAGER',
}: PortfolioSectionProps) {
  const { projectHealth } = portfolio
  const totalProjects = projectHealth.length
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  if (totalProjects === 0) {
    return (
      <div className="w-full min-w-0">
        <DashboardSectionHeader
          icon={<Layers className="w-4 h-4" aria-hidden="true" />}
          title="Portofolio Proyek"
          subtitle="Pantau progres dan kelancaran seluruh proyek aktif"
        />
        <div className="py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-fg-secondary mb-4">
            <Layers className="h-7 w-7" aria-hidden="true" />
          </div>
          <h4 className="text-base font-bold text-foreground">
            Belum ada proyek aktif
          </h4>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
            Buat proyek baru untuk mengaktifkan linimasa proyek dan perbandingan kinerja per divisi.
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
    <div className="space-y-4 w-full min-w-0">
      <ProjectFlightpathRoadmap
        portfolio={portfolio}
        onInspectProject={(id) => setSelectedProjectId(id)}
      />

      <DivisionVelocityCard portfolio={portfolio} />

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

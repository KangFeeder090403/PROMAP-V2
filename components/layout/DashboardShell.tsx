'use client'

import { useState } from 'react'
import type { Role } from '@/lib/generated/prisma/client'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { DevAccountSwitcher } from '@/components/dev/DevAccountSwitcher'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
  companyId?: string | null
  companyName?: string | null
  divisionId?: string | null
  divisionName?: string | null
  isImpersonating?: boolean
}

export function DashboardShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen">
      <Sidebar user={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DevAccountSwitcher currentUserId={user.id} isImpersonating={Boolean(user.isImpersonating)} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="md:ml-64">
        <Header onMenuClick={() => setSidebarOpen(true)} user={user} />
        <main className="min-h-screen bg-slate-50 p-4 sm:p-6 dark:bg-slate-950">{children}</main>
      </div>
    </div>
  )
}

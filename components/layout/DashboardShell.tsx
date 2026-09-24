'use client'

import { useState, useEffect } from 'react'
import type { Role } from '@/lib/generated/prisma/client'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { PageTransition } from '@/components/animation/PageTransition'
import { GlobalAnimationProvider } from '@/components/animation/GlobalAnimationProvider'
import { TrialActivationModal } from '@/components/guest/TrialActivationModal'

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

export function DashboardShell({ user, children }: Readonly<{ user: SessionUser; children: React.ReactNode }>) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Inisialisasi dari localStorage setelah hydration
  useEffect(() => {
    try {
      const saved = localStorage.getItem('promap_sidebar_collapsed')
      if (saved !== null) {
        setIsCollapsed(saved === 'true')
      }
    } catch {
      // Abaikan jika localStorage diblokir
    }
  }, [])

  // Shortcut keyboard Ctrl+B / Cmd+B untuk toggle collapse
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement | null
        if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
          return
        }
        e.preventDefault()
        setIsCollapsed((prev) => {
          const next = !prev
          try {
            localStorage.setItem('promap_sidebar_collapsed', String(next))
          } catch {}
          return next
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleToggleCollapse() {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('promap_sidebar_collapsed', String(next))
      } catch {}
      return next
    })
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
      />

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Tutup sidebar"
          className="fixed inset-0 z-20 bg-black/40 md:hidden border-0 cursor-default"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`transition-[margin] duration-200 ease-in-out ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          user={user}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
        <main className="min-h-screen bg-slate-50 p-4 sm:p-6 dark:bg-slate-950">
          <GlobalAnimationProvider>
            <PageTransition>{children}</PageTransition>
          </GlobalAnimationProvider>
        </main>
      </div>

      {user.role === 'GUEST' && <TrialActivationModal />}
    </div>
  )
}

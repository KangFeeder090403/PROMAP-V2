'use client'

import { useState } from 'react'
import { Menu, Building2, PanelLeftClose, PanelLeftOpen, HelpCircle } from 'lucide-react'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { NewButton } from '@/components/layout/NewButton'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotifBell } from '@/components/layout/NotifBell'
import { FaqHelpDrawer } from '@/components/layout/FaqHelpDrawer'
import type { SessionUser } from '@/components/layout/DashboardShell'

export function Header({
  onMenuClick,
  user,
  isCollapsed = false,
  onToggleCollapse,
}: {
  onMenuClick: () => void
  user: SessionUser
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}) {
  const [faqOpen, setFaqOpen] = useState(false)

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 md:px-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Perluas sidebar (Ctrl+B)' : 'Kecilkan sidebar (Ctrl+B)'}
            aria-expanded={!isCollapsed}
            aria-controls="app-sidebar"
            className="hidden md:flex shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        )}
        <Breadcrumb />
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        {user.companyName && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-800 dark:text-slate-200">{user.companyName}</span>
            {user.divisionName && (
              <>
                <span className="text-slate-400 dark:text-slate-600 font-normal">/</span>
                <span className="text-slate-600 dark:text-slate-400 font-medium">{user.divisionName}</span>
              </>
            )}
          </div>
        )}
        <NewButton role={user.role} />
        <button
          type="button"
          onClick={() => setFaqOpen(true)}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Pusat Bantuan & FAQ"
          title="Bantuan & FAQ"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
        <ThemeToggle />
        <NotifBell isGuest={user.role === 'GUEST' || !!user.isGuest} />
      </div>

      <FaqHelpDrawer open={faqOpen} onOpenChange={setFaqOpen} userRole={user.role} />
    </header>
  )
}

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
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-border bg-card px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:hidden"
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
            className="hidden lg:flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        )}
        <Breadcrumb />
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        {user.companyName && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted border border-border text-xs text-fg-secondary whitespace-nowrap">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium text-foreground">{user.companyName}</span>
            {user.divisionName && (
              <>
                <span className="text-muted-foreground/50 font-normal">/</span>
                <span className="text-fg-secondary font-medium">{user.divisionName}</span>
              </>
            )}
          </div>
        )}
        <NewButton role={user.role} />
        <button
          type="button"
          onClick={() => setFaqOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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

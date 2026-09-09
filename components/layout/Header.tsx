'use client'

import { Menu } from 'lucide-react'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { NewButton } from '@/components/layout/NewButton'
import { ThemeToggle } from '@/components/theme-toggle'
import { NotifBell } from '@/components/layout/NotifBell'
import { UserMenu } from '@/components/layout/UserMenu'
import type { SessionUser } from '@/components/layout/DashboardShell'

export function Header({ onMenuClick, user }: { onMenuClick: () => void; user: SessionUser }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 md:px-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Breadcrumb />
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <NewButton role={user.role} />
        <ThemeToggle />
        <NotifBell />
        <UserMenu user={user} />
      </div>
    </header>
  )
}

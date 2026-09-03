'use client'

import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { NAV_ITEMS } from '@/components/layout/nav-config'
import { NotifBell } from '@/components/layout/NotifBell'
import { UserMenu } from '@/components/layout/UserMenu'
import type { SessionUser } from '@/components/layout/DashboardShell'

export function Header({ onMenuClick, user }: { onMenuClick: () => void; user: SessionUser }) {
  const pathname = usePathname()
  const current = NAV_ITEMS.find((item) =>
    item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(item.href + '/')
  )
  const title = current?.label ?? 'Dashboard'

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <NotifBell />
        <UserMenu user={user} />
      </div>
    </header>
  )
}

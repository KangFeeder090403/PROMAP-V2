'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '@/components/layout/nav-config'
import type { SessionUser } from '@/components/layout/DashboardShell'

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export function Sidebar({
  user,
  isOpen,
  onClose,
}: {
  user: SessionUser
  isOpen: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role))

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside
      className={`fixed left-0 top-0 z-30 flex h-screen w-64 flex-col bg-slate-900 transition-transform duration-200 md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex h-14 items-center border-b border-slate-800 px-4">
        <span className="text-sm font-semibold text-white">ProMaP</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-white font-medium text-slate-900'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-medium text-white">
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.role}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

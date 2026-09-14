'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_GROUPS, matchesPath } from '@/components/layout/nav-config'
import type { SessionUser } from '@/components/layout/DashboardShell'
import { DevAccountSwitcher } from '@/components/dev/DevAccountSwitcher'

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

  // Badge "butuh aksi" di My Work. Di-refresh saat pindah halaman karena
  // navigasi biasanya terjadi tepat setelah user menyelesaikan sesuatu.
  const [actionCount, setActionCount] = useState(0)
  useEffect(() => {
    fetch('/api/my-work/count')
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d) => setActionCount(typeof d.count === 'number' ? d.count : 0))
      .catch(() => setActionCount(0))
  }, [pathname])

  // Urutan wajib: filter item by role DULU, baru buang grup yang jadi kosong.
  // Kalau dibalik, grup tanpa item yang boleh dilihat user tetap kerender.
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(user.role)),
  })).filter((group) => group.items.length > 0)

  return (
    <aside
      className={`fixed left-0 top-0 z-30 flex h-screen w-64 flex-col bg-slate-900 transition-transform duration-200 md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex h-14 items-center gap-3 border-b border-slate-800 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs shadow-sm">
          {user.companyName ? user.companyName.charAt(0).toUpperCase() : 'P'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white leading-tight">
            {user.companyName ?? (user.role === 'SUPER_ADMIN' ? 'Sistem Global' : 'ProMaP Workspace')}
          </p>
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
            <p className="truncate text-[10px] font-medium text-slate-400 leading-none">
              {user.divisionName ? user.divisionName : (user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Umum')}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-3">
        {groups.map((group, gi) => (
          <div key={group.label ?? `group-${gi}`} className="space-y-1">
            {group.label ? (
              <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {group.label}
              </p>
            ) : (
              <div className="mb-3 border-t border-slate-800" />
            )}
            {group.items.map((item) => {
              const Icon = item.icon
              const active = matchesPath(item.href, pathname)
              const badge = item.href === '/my-work' && actionCount > 0 ? actionCount : 0
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-white font-medium text-slate-900'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {badge > 0 && (
                    <span
                      className="inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold tabular-nums text-white"
                      aria-label={`${badge} item butuh aksi`}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-medium text-white">
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.role}</p>
          </div>
        </div>
        <DevAccountSwitcher currentUserId={user.id} isImpersonating={Boolean(user.isImpersonating)} />
      </div>
    </aside>
  )
}

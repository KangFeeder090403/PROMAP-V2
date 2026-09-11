'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import type { SessionUser } from '@/components/layout/DashboardShell'

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export function UserMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md p-1 hover:bg-slate-100"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-medium text-white">
          {initials(user.name)}
        </div>
        <span className="hidden text-sm font-medium text-slate-700 md:inline">{user.name}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-1 shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user.name}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>

              <div className="mt-2.5 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-400">
                  <span className="text-slate-400 dark:text-slate-500 shrink-0">Perusahaan:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate text-right">
                    {user.companyName ?? (user.role === 'SUPER_ADMIN' ? 'Semua (Super Admin)' : '-')}
                  </span>
                </div>
                {user.divisionName && (
                  <div className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-400">
                    <span className="text-slate-400 dark:text-slate-500 shrink-0">Divisi:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate text-right">
                      {user.divisionName}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-400">
                  <span className="text-slate-400 dark:text-slate-500 shrink-0">Role:</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
            <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-slate-50 dark:text-red-400 dark:hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </>
      )}
    </div>
  )
}

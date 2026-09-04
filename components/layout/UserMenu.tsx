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
          <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-md">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
              <p className="mt-1 text-xs text-slate-400">{user.role}</p>
            </div>
            <div className="my-1 border-t border-slate-200" />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </>
      )}
    </div>
  )
}

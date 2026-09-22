'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { Settings, History } from 'lucide-react'
import type { SessionUser } from '@/components/layout/DashboardShell'
import { AuditLogModal } from '@/components/settings/AuditLogModal'
import { LogoutConfirmDialog } from '@/components/layout/LogoutConfirmDialog'

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
  const [auditLogOpen, setAuditLogOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const canAccessSettings =
    user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_OPERATIONAL' || user.role === 'MANAGER'
  const canAccessAuditLog =
    user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_OPERATIONAL' || user.role === 'MANAGER'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[11px] font-semibold text-white">
          {initials(user.name)}
        </div>
        <span className="hidden text-xs font-medium text-slate-700 dark:text-slate-300 md:inline">{user.name}</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Tutup menu pengguna"
            className="fixed inset-0 z-10 cursor-default bg-transparent border-0"
            onClick={() => setOpen(false)}
          />
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

            {(canAccessSettings || canAccessAuditLog) && (
              <>
                <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                <div className="px-1 py-1 space-y-0.5">
                  {canAccessSettings && (
                    <Link
                      href="/settings"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5 text-slate-400" />
                      <span>Pengaturan &amp; Tata Kelola</span>
                    </Link>
                  )}
                  {canAccessAuditLog && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        setAuditLogOpen(true)
                      }}
                      className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
                    >
                      <History className="h-3.5 w-3.5 text-slate-400" />
                      <span>Audit Log Aktivitas</span>
                    </button>
                  )}
                </div>
              </>
            )}

            <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setLogoutConfirmOpen(true)
              }}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-slate-50 dark:text-red-400 dark:hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </>
      )}

      {/* Modal Konfirmasi Logout */}
      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        onConfirm={async () => {
          await signOut({ callbackUrl: '/login' })
        }}
      />

      {/* Modal Audit Log Global */}
      <AuditLogModal
        open={auditLogOpen}
        onOpenChange={setAuditLogOpen}
        companyId={user.companyId ?? null}
      />
    </div>
  )
}


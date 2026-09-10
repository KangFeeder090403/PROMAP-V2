'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, RefreshCw, UserRound, X } from 'lucide-react'
import type { Role } from '@/lib/generated/prisma/client'

interface Account {
  id: string
  name: string
  email: string
  role: Role
  divisionName: string | null
  companyName: string | null
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Admin Sistem',
  ADMIN_OPERATIONAL: 'Admin Operasional',
  MANAGER: 'Manager',
  PIC: 'PIC',
  GUEST: 'Guest',
}

const ROLE_ORDER: Role[] = ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER', 'PIC']

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  ADMIN_OPERATIONAL: 'bg-blue-100 text-blue-700',
  MANAGER: 'bg-emerald-100 text-emerald-700',
  PIC: 'bg-slate-100 text-slate-700',
  GUEST: 'bg-slate-100 text-slate-500',
}

// NONAKTIF total di production — Next.js inline NODE_ENV saat build.
const DEV = process.env.NODE_ENV !== 'production'

export function DevAccountSwitcher({
  currentUserId,
  isImpersonating,
}: {
  currentUserId: string
  isImpersonating: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetch('/api/dev/impersonate/accounts')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setAccounts(data.accounts ?? [])
      })
      .catch(() => {
        if (!cancelled) setError('Gagal memuat daftar akun.')
      })
    return () => {
      cancelled = true
    }
  }, [open])

  async function run(fn: () => Promise<Response>) {
    setBusy(true)
    setError('')
    try {
      const res = await fn()
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Gagal memproses. ')
        return
      }
      router.refresh()
      window.location.assign('/')
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setBusy(false)
    }
  }

  if (!DEV) return null

  const grouped = ROLE_ORDER.map((role) => ({
    role,
    items: (accounts ?? []).filter((a) => a.role === role),
  })).filter((g) => g.items.length > 0)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Akun Testing (dev)"
        className="fixed bottom-5 right-5 z-50 inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-medium text-white shadow-lg hover:bg-slate-800"
      >
        <Users className="h-4 w-4" />
        Testing Akun
        {isImpersonating && (
          <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        )}
      </button>

      {open && (
        <div className="fixed bottom-[5.5rem] right-5 z-50 flex max-h-[70vh] w-[360px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Switch Akun (Dev)</p>
              <p className="text-xs text-slate-500">Verifikasi POV tiap role</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {isImpersonating && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-800">
                  Impersonasi aktif — kamu sedang melihat sebagai akun lain.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => fetch('/api/dev/impersonate', { method: 'DELETE' }))}
                  className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md bg-amber-500 px-3 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Kembali ke akun asli
                </button>
              </div>
            )}

            {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

            {accounts === null ? (
              <p className="text-xs text-slate-500">Memuat akun...</p>
            ) : (
              <div className="space-y-4">
                {grouped.map((g) => (
                  <div key={g.role}>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {ROLE_LABEL[g.role]}
                    </p>
                    <div className="space-y-1.5">
                      {g.items.map((a) => {
                        const isCurrent = a.id === currentUserId
                        return (
                          <div
                            key={a.id}
                            className={`flex items-center gap-2 rounded-lg border p-2 ${
                              isCurrent
                                ? 'border-blue-200 bg-blue-50'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100">
                              <UserRound className="h-3.5 w-3.5 text-slate-500" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-900">
                                {a.name}
                                {isCurrent && <span className="ml-1 text-xs text-blue-600">(aktif)</span>}
                              </p>
                              <p className="truncate text-xs text-slate-500">{a.email}</p>
                            </div>
                            {!isCurrent && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  run(() =>
                                    fetch('/api/dev/impersonate', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ userId: a.id }),
                                    })
                                  )
                                }
                                className="inline-flex h-7 shrink-0 items-center rounded-md bg-blue-500 px-2.5 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                              >
                                Pakai
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
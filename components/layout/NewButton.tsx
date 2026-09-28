'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import type { Role } from '@/lib/generated/prisma/client'
import { ALL_ROLES } from '@/components/layout/nav-config'

interface CreateItem {
  label: string
  /** Route tujuan; halaman tujuan yang buka modal create-nya. */
  href: string
  roles: Role[]
}

// Visibility mengikuti RBAC (§B3). Ini convenience tampilan —
// endpoint create tetap wajib guard sendiri lewat requireRole/canManage*.
// 'Task' sengaja tidak ada di daftar (keputusan PO).
const CREATE_ITEMS: CreateItem[] = [
  // cermin canManageProject: PIC tidak bisa bikin project
  { label: 'Project', href: '/projects?new=1', roles: ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER'] },
  { label: 'Action Plan', href: '/action-plans?new=1', roles: ALL_ROLES },
  // 'Personal Task' dihapus: /my-work belum punya modal create → link mati.
  // Dikembalikan saat UI-4 (My Work) selesai.
  { label: 'Proposal', href: '/proposals?new=1', roles: ALL_ROLES },
]

// Self-check module-load — invariant yang TypeScript tidak tangkap.
for (const item of CREATE_ITEMS) {
  if (item.roles.length === 0) {
    throw new Error(`NewButton: CREATE_ITEMS "${item.label}" punya roles kosong`)
  }
}
{
  const project = CREATE_ITEMS.find((i) => i.label === 'Project')
  if (!project) throw new Error('NewButton: item "Project" hilang dari CREATE_ITEMS')
  if (project.roles.includes('PIC')) {
    throw new Error('NewButton: PIC tidak boleh membuat Project (lihat canManageProject)')
  }
}

export { CREATE_ITEMS }

export function NewButton({ role }: Readonly<{ role: Role }>) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const items = CREATE_ITEMS.filter((item) => item.roles.includes(role))

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  if (items.length === 0) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 text-xs font-semibold text-white transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">New</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Tutup menu pembuatan"
            className="fixed inset-0 z-10 cursor-default bg-transparent border-0"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-md"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  router.push(item.href)
                }}
                className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

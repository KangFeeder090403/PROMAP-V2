'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Role } from '@/lib/generated/prisma/client'
import { SECTION_TABS } from '@/components/layout/nav-config'

// Sub-menu section (Projects|Proposals, Board|Calendar|Table). Hanya tampil di
// halaman index section — detail (/projects/[id], /action-plans/[id]) tanpa tab.
// ponytail: query string (filter) tidak diteruskan saat pindah tab; upgrade:
// teruskan searchParams kalau PO minta.
export function SectionTabs({ role }: { role: Role }) {
  const pathname = usePathname()
  const group = Object.values(SECTION_TABS).find((tabs) => tabs.some((t) => t.href === pathname))
  const tabs = group?.filter((t) => t.roles.includes(role)) ?? []
  if (tabs.length < 2) return null

  return (
    <nav
      aria-label="Sub-menu"
      className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800"
    >
      {tabs.map((t) => {
        const active = t.href === pathname
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px whitespace-nowrap rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              active
                ? 'border-gold-600 font-semibold text-slate-900 dark:border-gold-400 dark:text-white'
                : 'border-transparent font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}

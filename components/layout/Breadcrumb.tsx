'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { findNavItem } from '@/components/layout/nav-config'

/**
 * Segment level-1 → label grup navigasi.
 * null = tidak punya grup, crumb grup di-SKIP (jangan push undefined).
 * Segment yang tidak terdaftar di sini juga di-skip grup-nya.
 */
const SEGMENT_GROUP: Record<string, string | null> = {
  'my-work': 'Workspace',
  projects: 'Workspace',
  board: 'Execution',
  calendar: 'Execution',
  proposals: 'Execution',
  'action-plans': 'Execution',
  settings: null,
}

/** Fallback label untuk segment yang tidak ada di nav (mis. /action-plans). */
function titleize(segment: string) {
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Sub-route statis yang punya label sendiri. Sisanya dianggap id → 'Detail'. */
const STATIC_SUB_SEGMENTS = new Set(['leads', 'user-labels', 'new'])

function isStaticSegment(segment: string) {
  return STATIC_SUB_SEGMENTS.has(segment)
}

interface Crumb {
  label: string
  href?: string
}

export function Breadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const crumbs: Crumb[] = []

  if (segments.length === 0) {
    crumbs.push({ label: 'Workspace' }, { label: 'Home' })
  } else {
    const [first, ...rest] = segments
    const group = SEGMENT_GROUP[first]
    if (group) crumbs.push({ label: group })

    const href = '/' + first
    crumbs.push({ label: findNavItem(href)?.label ?? titleize(first), href })

    // Segment dinamis (id) tidak bisa jadi label bermakna tanpa fetch —
    // ponytail: render 'Detail'. Upgrade: page kirim nama entitas via context
    // kalau nanti butuh breadcrumb "Projects / Redesign Website".
    for (const seg of rest) {
      crumbs.push({ label: isStaticSegment(seg) ? titleize(seg) : 'Detail' })
    }
  }

  const last = crumbs.length - 1

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5">
        {crumbs.map((crumb, i) => {
          const isLast = i === last
          // Crumb grup (tanpa href, bukan yang terakhir) disembunyikan di layar
          // sempit — sekaligus dengan separator-nya, supaya tidak ada "›" menggantung.
          const hideOnMobile = !isLast && !crumb.href
          return (
            <li
              key={i}
              className={`min-w-0 items-center gap-1.5 ${hideOnMobile ? 'hidden sm:flex' : 'flex'}`}
            >
              {i > 0 && (
                <ChevronRight
                  className={`h-3.5 w-3.5 shrink-0 text-slate-300 ${
                    !crumbs[i - 1].href && i - 1 !== last ? 'hidden sm:block' : ''
                  }`}
                />
              )}
              {isLast ? (
                <span aria-current="page" className="truncate text-base font-semibold text-slate-900">
                  {crumb.label}
                </span>
              ) : crumb.href ? (
                <Link href={crumb.href} className="truncate text-sm text-slate-500 hover:text-slate-900">
                  {crumb.label}
                </Link>
              ) : (
                <span className="truncate text-sm text-slate-500">{crumb.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export { SEGMENT_GROUP }

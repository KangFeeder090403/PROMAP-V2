import type { Role } from '@/lib/generated/prisma/client'
import {
  Home,
  CheckSquare,
  FolderKanban,
  Kanban,
  Calendar,
  FileText,
  Settings,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  roles: Role[]
}

export interface NavGroup {
  /** null = grup tanpa judul (dirender polos, dipisah divider) */
  label: string | null
  items: NavItem[]
}

export const ALL_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER', 'PIC']
export const GUEST_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER', 'PIC', 'GUEST']

// Role filter di sini HANYA convenience tampilan (sembunyikan menu yang
// user tidak punya akses). Backend API tetap WAJIB guard sendiri
// (requireRole / scope helper di lib/rbac.ts) — jangan pernah andalkan
// filter ini sebagai satu-satunya lapis otorisasi.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Home', href: '/', icon: Home, roles: GUEST_ROLES },
      { label: 'My Work', href: '/my-work', icon: CheckSquare, roles: ALL_ROLES },
      { label: 'Projects', href: '/projects', icon: FolderKanban, roles: GUEST_ROLES },
    ],
  },
  {
    label: 'Execution',
    items: [
      { label: 'Board', href: '/board', icon: Kanban, roles: GUEST_ROLES },
      { label: 'Calendar', href: '/calendar', icon: Calendar, roles: GUEST_ROLES },
      { label: 'Proposals', href: '/proposals', icon: FileText, roles: ALL_ROLES },
    ],
  },
  // Grup INSIGHTS — UI-12: Halaman Reports sudah tersedia.
  {
    label: 'Insights',
    items: [
      {
        label: 'Reports',
        href: '/reports',
        icon: BarChart3,
        roles: ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER'] as Role[],
      },
    ],
  },
  {
    label: null,
    items: [
      {
        label: 'Settings',
        href: '/settings',
        icon: Settings,
        roles: ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER'] as Role[],
      },
    ],
  },
]

/** Versi flat — dipakai Breadcrumb/Header untuk pathname match tanpa duplikasi logic. */
export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)

/** Satu-satunya definisi "apakah href ini cocok dengan pathname sekarang". */
export function matchesPath(href: string, pathname: string) {
  if (href === '/') return pathname === '/'
  if (href === '/board' && (pathname === '/action-plans' || pathname.startsWith('/action-plans/'))) {
    return true
  }
  return pathname === href || pathname.startsWith(href + '/')
}

export function findNavItem(pathname: string) {
  return ALL_NAV_ITEMS.find((item) => matchesPath(item.href, pathname))
}

// Self-check runtime — TypeScript tidak menangkap array kosong.
// Kalau ada item roles: [] karena tipo, gagal cepat saat module load.
for (const group of NAV_GROUPS) {
  for (const item of group.items) {
    if (item.roles.length === 0) {
      throw new Error(`nav-config: NAV_ITEMS "${item.label}" punya roles kosong`)
    }
  }
}

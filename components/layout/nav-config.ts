import type { Role } from '@/lib/generated/prisma/client'
import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  FileText,
  Kanban,
  Calendar,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  roles: Role[]
}

const ALL_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER', 'PIC']

// Role filter di sini HANYA convenience tampilan (sembunyikan menu yang
// user tidak punya akses). Backend API tetap WAJIB guard sendiri
// (requireRole / scope helper di lib/rbac.ts) — jangan pernah andalkan
// filter ini sebagai satu-satunya lapis otorisasi.
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ALL_ROLES },
  { label: 'Projects', href: '/projects', icon: FolderKanban, roles: ALL_ROLES },
  { label: 'Action Plans', href: '/action-plans', icon: ListChecks, roles: ALL_ROLES },
  { label: 'Proposals', href: '/proposals', icon: FileText, roles: ALL_ROLES },
  { label: 'Kanban', href: '/kanban', icon: Kanban, roles: ALL_ROLES },
  { label: 'Calendar', href: '/calendar', icon: Calendar, roles: ALL_ROLES },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER'],
  },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN_OPERATIONAL'] },
]

// Self-check runtime — TypeScript tidak menangkap array kosong.
// Kalau ada item roles: [] kesalahan tipo, gagal cepat saat module load.
for (const item of NAV_ITEMS) {
  if (item.roles.length === 0) {
    throw new Error(`nav-config: NAV_ITEMS "${item.label}" punya roles kosong`)
  }
}

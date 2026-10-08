'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { signOut } from 'next-auth/react'
import {
  ChevronsUpDown,
  History,
  LogOut,
  Building2,
  Briefcase,
  User,
} from 'lucide-react'
import { NAV_GROUPS, matchesPath } from '@/components/layout/nav-config'
import type { SessionUser } from '@/components/layout/DashboardShell'
import { DevAccountSwitcher } from '@/components/dev/DevAccountSwitcher'
import { LogoutConfirmDialog } from '@/components/layout/LogoutConfirmDialog'
import { unsubscribePush } from '@/hooks/usePushNotifications'

// Modal berat (ProfileModal 433 baris, AuditLogModal 538 baris) dipisah jadi
// chunk sendiri dan baru di-mount saat dibuka. Sebelumnya keduanya selalu ada
// di pohon Sidebar, jadi ikut terekonsiliasi tiap kali menu profil di-toggle.
const ProfileModal = dynamic(
  () => import('@/components/profile/ProfileModal').then((m) => m.ProfileModal),
  { ssr: false }
)
const AuditLogModal = dynamic(
  () => import('@/components/settings/AuditLogModal').then((m) => m.AuditLogModal),
  { ssr: false }
)

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Admin Sistem',
  ADMIN_OPERATIONAL: 'Admin Operasional',
  MANAGER: 'Manager',
  PIC: 'PIC',
  GUEST: 'Guest',
}

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-muted text-fg-secondary border border-border rounded-sm',
  ADMIN_OPERATIONAL: 'bg-muted text-fg-secondary border border-border rounded-sm',
  MANAGER: 'bg-muted text-fg-secondary border border-border rounded-sm',
  PIC: 'bg-muted text-fg-secondary border border-border rounded-sm',
  GUEST: 'bg-muted text-fg-secondary border border-border rounded-sm',
}

export function Sidebar({
  user,
  isOpen,
  onClose,
  isCollapsed = false,
}: {
  user: SessionUser
  isOpen: boolean
  onClose: () => void
  isCollapsed?: boolean
}) {
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [auditLogOpen, setAuditLogOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const canAccessAuditLog =
    user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_OPERATIONAL' || user.role === 'MANAGER'

  // Escape key listener untuk close profile popover
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setProfileOpen(false)
    }
    if (profileOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [profileOpen])

  // Badge "butuh aksi" di My Work. Di-refresh saat pindah halaman
  const [actionCount, setActionCount] = useState(0)
  useEffect(() => {
    fetch('/api/my-work/count')
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d) => setActionCount(typeof d.count === 'number' ? d.count : 0))
      .catch(() => setActionCount(0))
  }, [pathname])

  // Urutan wajib: filter item by role DULU, baru buang grup yang jadi kosong
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(user.role)),
  })).filter((group) => group.items.length > 0)

  return (
    <>
      <aside
        id="app-sidebar"
        className={`fixed left-0 top-0 z-30 flex h-screen flex-col bg-sidebar border-r border-white/10 transition-[width,transform] duration-200 ease-in-out lg:translate-x-0 ${
          isCollapsed ? 'lg:w-16 w-64' : 'w-64'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header Tenant / Logo */}
        <div
          className={`flex h-14 items-center border-b border-white/10 ${
            isCollapsed ? 'justify-center px-2' : 'px-3'
          }`}
        >
          {isCollapsed ? (
            /* Compact mode: Logo tenant sebagai link ke beranda */
            <Link
              href="/"
              onClick={onClose}
              aria-label="Beranda ProMaP"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar font-bold text-xs shadow-sm hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent"
            >
              {user.companyName ? user.companyName.charAt(0).toUpperCase() : 'P'}
            </Link>
          ) : (
            /* Expanded mode: Logo (link beranda) + Nama Tenant */
            <>
              <div className="flex items-center gap-3 min-w-0">
                <Link
                  href="/"
                  onClick={onClose}
                  aria-label="Beranda ProMaP"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar font-bold text-xs shadow-sm hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent"
                >
                  {user.companyName ? user.companyName.charAt(0).toUpperCase() : 'P'}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-sidebar-foreground leading-tight">
                    {user.companyName ?? (user.role === 'SUPER_ADMIN' ? 'Sistem Global' : 'ProMaP Workspace')}
                  </p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <p className="truncate text-[10px] font-medium text-sidebar-foreground/70 leading-none">
                      {user.divisionName ? user.divisionName : (user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Umum')}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Navigasi Menu */}
        <nav className="flex-1 space-y-5 overflow-y-auto p-2">
          {groups.map((group, gi) => (
            <div key={group.label ?? `group-${gi}`} className="space-y-1">
              {group.label ? (
                !isCollapsed ? (
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                    {group.label}
                  </p>
                ) : (
                  <div className="my-2 border-t border-white/10" />
                )
              ) : (
                <div className="mb-2 border-t border-white/10" />
              )}
              {group.items.map((item) => {
                const Icon = item.icon
                const active = matchesPath(item.href, pathname)
                const badge = item.href === '/my-work' && actionCount > 0 ? actionCount : 0
                return (
                  <div key={item.href} className="relative group">
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                      aria-label={
                        isCollapsed
                          ? badge > 0
                            ? `${item.label}, ${badge} item butuh aksi`
                            : item.label
                          : undefined
                      }
                      className={`flex items-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent ${
                        isCollapsed
                          ? 'justify-center p-2.5 h-10 w-full'
                          : 'gap-3 px-3 py-2'
                      } ${
                        active
                          ? 'bg-white/10 text-sidebar-foreground font-medium border-l-2 border-sidebar-accent'
                          : 'text-sidebar-foreground/80 hover:bg-white/5 hover:text-sidebar-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {!isCollapsed && badge > 0 && (
                        <span
                          className="inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold tabular-nums text-destructive-foreground"
                          aria-label={`${badge} item butuh aksi`}
                        >
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                      {isCollapsed && badge > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-sidebar" />
                      )}
                    </Link>

                    {/* Tooltip melayang saat compact mode */}
                    {isCollapsed && (
                      <div
                        role="tooltip"
                        className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:flex group-focus-within:flex items-center z-50 whitespace-nowrap rounded-md bg-popover text-popover-foreground border border-border px-2.5 py-1 text-xs font-medium shadow-lg"
                      >
                        {item.label}
                        {badge > 0 && (
                          <span className="ml-1.5 rounded-full bg-destructive px-1.5 py-0.2 text-[10px] font-bold text-destructive-foreground">
                            {badge}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer Profil User & Account Switcher */}
        <div className="relative border-t border-white/10 p-2">
          {/* Popover Dropup Profil User */}
          {profileOpen && (
            <>
              <button
                type="button"
                aria-label="Tutup menu profil"
                className="fixed inset-0 z-40 cursor-default bg-transparent border-0"
                onClick={() => setProfileOpen(false)}
              />
              <div
                role="menu"
                aria-label="Menu Pengguna"
                className={`fixed z-50 w-72 rounded-xl border border-border bg-popover p-1.5 shadow-2xl text-popover-foreground transition-all ${
                  isCollapsed ? 'left-16 bottom-3 ml-2' : 'left-3 bottom-16'
                }`}
              >
                {/* Header Info Akun */}
                <div className="px-3 py-2.5 rounded-lg bg-muted border border-border mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar shadow-sm">
                      {initials(user.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground leading-tight">{user.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground mt-0.5">{user.email}</p>
                    </div>
                  </div>

                  <div className="mt-2.5 space-y-1 pt-2 border-t border-border text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 shrink-0 text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        Perusahaan:
                      </span>
                      <span className="font-medium text-foreground truncate text-right">
                        {user.companyName ?? (user.role === 'SUPER_ADMIN' ? 'Sistem Global' : '-')}
                      </span>
                    </div>
                    {user.divisionName && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 shrink-0 text-muted-foreground">
                          <Briefcase className="h-3 w-3" />
                          Divisi:
                        </span>
                        <span className="font-medium text-foreground truncate text-right">
                          {user.divisionName}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-muted-foreground">Hak Akses:</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_BADGE[user.role] || 'bg-muted text-fg-secondary border border-border rounded-sm'}`}>
                        {ROLE_LABEL[user.role] || user.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Edit Profil Sendiri */}
                <div className="px-1 py-1 border-b border-border mb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                      setProfileModalOpen(true)
                    }}
                    className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground hover:bg-muted text-left transition-colors cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Profil Saya</span>
                  </button>
                </div>

                {/* Audit Log (Settings cukup lewat nav utama) */}
                {canAccessAuditLog && (
                  <div className="px-1 py-1 space-y-0.5 border-b border-border mb-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false)
                          setAuditLogOpen(true)
                        }}
                        className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground hover:bg-muted text-left transition-colors cursor-pointer"
                      >
                        <History className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Audit Log Aktivitas</span>
                      </button>
                  </div>
                )}

                {/* Tombol Logout */}
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false)
                    setLogoutConfirmOpen(true)
                  }}
                  className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-destructive-text hover:bg-destructive/10 text-left transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Keluar / Logout</span>
                </button>
              </div>
            </>
          )}

          {/* Trigger Footer */}
          <div className={`flex items-center gap-1.5 ${isCollapsed ? 'flex-col justify-center' : 'justify-between'}`}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              aria-label={`Menu profil: ${user.name} (${ROLE_LABEL[user.role] || user.role})`}
              onClick={() => setProfileOpen((v) => !v)}
              className={`flex items-center rounded-lg p-1.5 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent ${
                isCollapsed ? 'justify-center w-10 h-10' : 'flex-1 min-w-0 gap-2.5'
              } ${profileOpen ? 'bg-white/10' : ''}`}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar shadow-sm"
              >
                {initials(user.name)}
              </div>
              {!isCollapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-sidebar-foreground">{user.name}</p>
                    <p className="truncate text-[11px] text-sidebar-foreground/70">{ROLE_LABEL[user.role] || user.role}</p>
                  </div>
                  <ChevronsUpDown className="h-3.5 w-3.5 text-sidebar-foreground/70 shrink-0" />
                </>
              )}
            </button>

            {user.role !== 'GUEST' && !user.isGuest && !user.id.startsWith('guest-') && (
              <div className={isCollapsed ? 'w-full flex justify-center mt-1' : 'shrink-0'}>
                <DevAccountSwitcher
                  currentUserId={user.id}
                  isImpersonating={Boolean(user.isImpersonating)}
                  userRole={user.role}
                />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Modal Profile Saya */}
      {profileModalOpen && (
        <ProfileModal
          open={profileModalOpen}
          onOpenChange={setProfileModalOpen}
        />
      )}

      {/* Modal Audit Log Global */}
      {auditLogOpen && (
        <AuditLogModal
          open={auditLogOpen}
          onOpenChange={setAuditLogOpen}
          companyId={user.companyId ?? null}
        />
      )}

      {/* Modal Konfirmasi Logout */}
      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        onConfirm={async () => {
          try {
            await fetch('/api/guest/logout', { method: 'POST' })
          } catch {}
          // Lepas push perangkat ini dari akun; dibatasi 1,5 dtk agar logout tidak tertahan
          await Promise.race([unsubscribePush(), new Promise((r) => setTimeout(r, 1500))])
          await signOut({ callbackUrl: '/login?signout=1' })
        }}
      />
    </>
  )
}

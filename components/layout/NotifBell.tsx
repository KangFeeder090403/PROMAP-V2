'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Bell, BellOff, BellRing, RotateCw } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

interface Notification {
  id: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'baru saja'
  if (min < 60) return `${min}m lalu`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}j lalu`
  const day = Math.floor(hr / 24)
  return `${day}h lalu`
}

export function NotifBell({ isGuest = false }: { isGuest?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [onlyUnread, setOnlyUnread] = useState(false)
  const { status: pushStatus, subscribe, unsubscribe } = usePushNotifications()

  async function fetchNotifs(unread = onlyUnread) {
    try {
      const res = await fetch(`/api/notifications${unread ? '?unread=true' : ''}`, { cache: 'no-store' })
      if (!res.ok) return
      const { data, unreadCount } = await res.json()
      setItems(data)
      setUnreadCount(unreadCount)
    } catch {
      // silent — polling akan retry di interval berikutnya
    }
  }

  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 15000)

    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifs()
      }
    }
    const onNotifEvent = () => fetchNotifs()

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('promap:refresh-notifs', onNotifEvent as EventListener)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('promap:refresh-notifs', onNotifEvent as EventListener)
    }
  }, [onlyUnread])

  async function toggleOpen() {
    const nextState = !open
    setOpen(nextState)
    if (nextState) {
      fetchNotifs()
    }
  }

  async function onClickNotif(n: Notification) {
    setOpen(false)
    if (!n.isRead) {
      await fetch(`/api/notifications/${n.id}/read`, { method: 'POST' })
      fetchNotifs()
    }
    if (n.link) router.push(n.link)
  }

  async function onReadAll() {
    await fetch('/api/notifications/read-all', { method: 'POST' })
    fetchNotifs()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Notifikasi"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Tutup panel notifikasi"
            className="fixed inset-0 z-10 cursor-default bg-transparent border-0"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-lg border border-border bg-popover text-popover-foreground shadow-md">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <div className="flex items-center gap-1 rounded-md bg-muted p-0.5">
                {([false, true] as const).map((u) => (
                  <button
                    key={String(u)}
                    type="button"
                    onClick={() => {
                      setOnlyUnread(u)
                      fetchNotifs(u)
                    }}
                    aria-pressed={onlyUnread === u}
                    className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                      onlyUnread === u
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {u ? 'Belum dibaca' : 'Semua'}
                  </button>
                ))}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onReadAll}
                  className="text-xs text-foreground font-medium hover:underline underline-offset-2"
                >
                  Tandai semua dibaca
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">
                  {onlyUnread ? 'Semua notifikasi sudah dibaca' : 'Belum ada notifikasi'}
                </p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => onClickNotif(n)}
                    className={`block w-full text-left px-3 py-2.5 border-b border-border last:border-0 transition-colors ${
                      !n.isRead ? 'bg-muted hover:bg-accent' : 'hover:bg-muted'
                    }`}
                  >
                    <p className="flex items-start gap-1.5 text-sm font-medium text-foreground">
                      {!n.isRead && (
                        <>
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                          <span className="sr-only">Belum dibaca: </span>
                        </>
                      )}
                      <span className="min-w-0 line-clamp-2">{n.title}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{relativeTime(n.createdAt)}</p>
                  </button>
                ))
              )}
            </div>

            {/* Footer: toggle notifikasi HP */}
            {!isGuest && pushStatus !== 'unsupported' && (
              <div className="border-t border-border px-3 py-2">
                {pushStatus === 'denied' ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <BellOff className="h-3.5 w-3.5 shrink-0" />
                    Notifikasi HP diblokir — aktifkan di pengaturan browser
                  </p>
                ) : pushStatus === 'granted' ? (
                  <button
                    type="button"
                    onClick={unsubscribe}
                    className="flex w-full items-center gap-1.5 rounded text-xs text-muted-foreground hover:text-destructive-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <BellOff className="h-3.5 w-3.5 shrink-0" />
                    Nonaktifkan notifikasi HP
                  </button>
                ) : pushStatus === 'loading' ? (
                  <p className="text-xs text-muted-foreground" aria-live="polite">Memuat…</p>
                ) : pushStatus === 'error' ? (
                  <div className="flex items-center justify-between gap-2" role="alert">
                    <p className="flex items-center gap-1.5 text-xs text-destructive-text">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      Gagal mengaktifkan notifikasi HP
                    </p>
                    <button
                      type="button"
                      onClick={subscribe}
                      className="flex shrink-0 items-center gap-1 rounded text-xs text-foreground font-medium hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      Coba lagi
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={subscribe}
                    className="flex w-full items-center gap-1.5 rounded text-xs text-foreground font-medium hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <BellRing className="h-3.5 w-3.5 shrink-0" />
                    Aktifkan notifikasi HP
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

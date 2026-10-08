'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, BellOff, BellRing } from 'lucide-react'
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

export function NotifBell() {
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
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
        aria-label="Notifikasi"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
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
          <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1 rounded-md bg-slate-100 p-0.5 dark:bg-slate-800">
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
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
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
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Tandai semua dibaca
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-sm text-slate-500 p-4">
                  {onlyUnread ? 'Semua notifikasi sudah dibaca' : 'Belum ada notifikasi'}
                </p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => onClickNotif(n)}
                    className={`block w-full text-left px-3 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${
                      !n.isRead ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{relativeTime(n.createdAt)}</p>
                  </button>
                ))
              )}
            </div>

            {/* Footer: toggle notifikasi HP */}
            {pushStatus !== 'unsupported' && (
              <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-2">
                {pushStatus === 'denied' ? (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <BellOff className="h-3.5 w-3.5 shrink-0" />
                    Notifikasi HP diblokir — aktifkan di pengaturan browser
                  </p>
                ) : pushStatus === 'granted' ? (
                  <button
                    type="button"
                    onClick={unsubscribe}
                    className="flex w-full items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                  >
                    <BellOff className="h-3.5 w-3.5 shrink-0" />
                    Nonaktifkan notifikasi HP
                  </button>
                ) : pushStatus === 'loading' ? (
                  <p className="text-xs text-slate-400">Memuat…</p>
                ) : (
                  <button
                    type="button"
                    onClick={subscribe}
                    className="flex w-full items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
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

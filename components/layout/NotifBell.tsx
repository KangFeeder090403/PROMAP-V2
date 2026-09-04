'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'

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

  async function fetchNotifs() {
    try {
      const res = await fetch('/api/notifications')
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
    const interval = setInterval(fetchNotifs, 60000)
    return () => clearInterval(interval)
  }, [])

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
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
        aria-label="Notifikasi"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-md">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Notifikasi</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onReadAll}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Tandai semua dibaca
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-sm text-slate-500 p-4">Belum ada notifikasi</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => onClickNotif(n)}
                    className={`block w-full text-left px-3 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 ${
                      !n.isRead ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{relativeTime(n.createdAt)}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'

// PLACEHOLDER — API notifikasi belum ada (roadmap #11 di CLAUDE.md).
// count di bawah dummy hardcode. Ganti ke fetch('/api/notifications')
// begitu roadmap #11 selesai.
export function NotifBell() {
  const [open, setOpen] = useState(false)
  const count = 3

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
        aria-label="Notifikasi"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-md">
            <p className="text-sm text-slate-500">Belum ada notifikasi</p>
          </div>
        </>
      )}
    </div>
  )
}

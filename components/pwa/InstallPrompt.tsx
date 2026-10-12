'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, Download, PlusSquare, Share, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { canShowInstallPrompt, type InstallMode } from '@/lib/install-prompt'

const SHOWN_KEY = 'promap-install-prompt-v1' // epoch ms terakhir popup tampil
const SHOW_DELAY_MS = 4000

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>
}
// event bisa terjadi sebelum hydrate — ditangkap themeScript di app/layout.tsx
type BipWindow = Window & { __promapBip?: BeforeInstallPromptEvent }

// undefined = storage diblokir → jangan tampil (lebih aman daripada tampil tiap sesi)
function readNum(key: string): number | null | undefined {
  try {
    const v = localStorage.getItem(key)
    return v === null ? null : Number(v)
  } catch {
    return undefined
  }
}
function write(key: string, v: string) {
  try {
    localStorage.setItem(key, v)
  } catch {}
}

function isPhone() {
  return window.matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600
}
function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}
// ponytail: in-app browser iOS (Instagram/FB) tidak bisa Add to Home Screen; tambah filter UA bila ada keluhan.
const isIOS = () => /iPhone|iPod/.test(navigator.userAgent)

export function InstallPrompt() {
  const [mode, setMode] = useState<InstallMode | null>(null)
  const bip = useRef<BeforeInstallPromptEvent | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const prevFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isPhone() || isInstalled()) return
    let candidate: InstallMode | null = isIOS() ? 'ios' : null
    let timer: number | undefined
    const early = (window as BipWindow).__promapBip
    if (early) {
      bip.current = early
      candidate = 'android'
    }

    const onBip = (e: Event) => {
      e.preventDefault()
      bip.current = e as BeforeInstallPromptEvent
      candidate = 'android'
    }
    const onInstalled = () => {
      candidate = null // sesi ini jangan tampil lagi
      bip.current = null
      delete (window as BipWindow).__promapBip
      setMode(null)
    }
    const onPointer = () => {
      if (timer) return
      timer = window.setTimeout(() => {
        timer = undefined
        const last = readNum(SHOWN_KEY)
        if (last === undefined) return
        if (
          !canShowInstallPrompt({
            now: Date.now(),
            lastShown: last,
            installed: isInstalled(),
            mode: candidate,
          })
        )
          return
        // jangan ganggu: dialog lain terbuka atau user sedang mengetik — coba lagi interaksi berikutnya
        if (
          document.querySelector('[role="dialog"], [role="alertdialog"]') ||
          document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')
        )
          return
        write(SHOWN_KEY, String(Date.now()))
        prevFocus.current = document.activeElement as HTMLElement | null
        setMode(candidate)
        window.removeEventListener('pointerdown', onPointer)
      }, SHOW_DELAY_MS)
    }

    window.addEventListener('beforeinstallprompt', onBip)
    window.addEventListener('appinstalled', onInstalled)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', onBip)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [])

  useEffect(() => {
    if (!mode) return
    boxRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mode])

  function close() {
    setMode(null)
    prevFocus.current?.focus?.()
  }

  async function install() {
    const e = bip.current
    bip.current = null // prompt() hanya sekali per event
    delete (window as BipWindow).__promapBip
    if (e) {
      try {
        await e.prompt()
      } catch {}
    }
    close()
  }

  if (!mode) return null

  return (
    <div
      ref={boxRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-desc"
      tabIndex={-1}
      className="fixed inset-x-0 bottom-0 z-[25] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] outline-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 motion-safe:duration-200"
    >
      <div className="mx-auto w-full max-w-md bg-card text-card-foreground border border-border rounded-lg shadow-md dark:shadow-none p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <Bell className="h-5 w-5 text-foreground" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="pwa-install-title" className="text-sm font-semibold text-foreground">
              Pasang ProMaP di HP Anda
            </h2>
            <p id="pwa-install-desc" className="mt-1 text-sm text-fg-secondary">
              {mode === 'ios'
                ? 'Di iPhone, notifikasi tugas dan approval hanya bisa aktif setelah ProMaP dipasang ke Layar Utama.'
                : 'Terima notifikasi tugas dan approval langsung seperti chat, dan buka ProMaP sekali ketuk dari layar utama.'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="-mr-2 -mt-2 h-9 w-9 shrink-0"
            aria-label="Tutup ajakan pasang aplikasi"
            onClick={close}
          >
            <X aria-hidden="true" />
          </Button>
        </div>

        {mode === 'ios' && (
          <ol className="mt-3 space-y-2 text-sm text-fg-secondary">
            <li className="flex gap-2">
              <span className="font-mono text-xs text-muted-foreground">1</span>
              <span>
                Ketuk <Share className="inline h-4 w-4 align-text-bottom text-foreground" aria-hidden="true" /> Bagikan di Safari (iOS 26: lewat menu titik tiga).
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-xs text-muted-foreground">2</span>
              <span>
                Pilih <PlusSquare className="inline h-4 w-4 align-text-bottom text-foreground" aria-hidden="true" /> Tambahkan ke Layar Utama.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-xs text-muted-foreground">3</span>
              <span>
                Biarkan &quot;Buka sebagai Aplikasi Web&quot; aktif, ketuk Tambah, lalu buka ProMaP dari Layar Utama dan aktifkan notifikasi di ikon lonceng.
              </span>
            </li>
          </ol>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {mode === 'ios' ? (
            <Button variant="outline" size="sm" onClick={close}>
              Mengerti
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={close}>
                Nanti saja
              </Button>
              <Button size="sm" onClick={install}>
                <Download aria-hidden="true" />
                Pasang
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
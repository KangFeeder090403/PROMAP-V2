'use client'

import { useState, useEffect } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

/** Konversi VAPID public key dari URL-safe base64 ke Uint8Array */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    !!VAPID_PUBLIC_KEY &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export type PushStatus =
  | 'loading'      // sedang cek dukungan/permission
  | 'unsupported'  // browser tidak mendukung Push API / VAPID belum dikonfigurasi
  | 'default'      // belum pernah minta izin
  | 'granted'      // izin diberikan & sudah subscribe
  | 'denied'       // user menolak izin
  | 'error'        // gagal mendaftarkan ke server

/**
 * Hapus subscription perangkat ini dari server lalu dari browser.
 * Best effort — tidak melempar. Dipakai juga saat logout.
 */
export async function unsubscribePush(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {})
    await sub.unsubscribe()
  } catch {
    // best effort
  }
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>('loading')

  useEffect(() => {
    if (!isPushSupported()) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    // getRegistration() resolve undefined bila SW belum terdaftar (ready bisa menggantung selamanya)
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? 'granted' : 'default'))
      .catch(() => setStatus('default'))
  }, [])

  /** Minta izin notifikasi & daftarkan subscription ke server */
  async function subscribe(): Promise<boolean> {
    if (!isPushSupported() || !VAPID_PUBLIC_KEY) return false

    setStatus('loading')
    let sub: PushSubscription | null = null
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setStatus(perm === 'denied' ? 'denied' : 'default')
        return false
      }

      const reg =
        (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register('/sw.js'))
      sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }))

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })
      if (!res.ok) throw new Error(`subscribe failed: ${res.status}`)

      setStatus('granted')
      return true
    } catch {
      // Jangan biarkan subscription yatim di browser yang tidak tercatat di server
      await sub?.unsubscribe().catch(() => {})
      setStatus(Notification.permission === 'denied' ? 'denied' : 'error')
      return false
    }
  }

  /** Batalkan subscription dan hapus dari server */
  async function unsubscribe(): Promise<void> {
    setStatus('loading')
    await unsubscribePush()
    setStatus('default')
  }

  return { status, subscribe, unsubscribe }
}

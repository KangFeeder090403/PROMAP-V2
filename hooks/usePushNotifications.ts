'use client'

import { useState, useEffect } from 'react'

/** Konversi VAPID public key dari URL-safe base64 ke Uint8Array */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export type PushStatus =
  | 'loading'      // sedang cek dukungan/permission
  | 'unsupported'  // browser tidak mendukung Push API
  | 'default'      // belum pernah minta izin
  | 'granted'      // izin diberikan & sudah subscribe
  | 'denied'       // user menolak izin

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>('loading')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    const perm = Notification.permission
    if (perm === 'denied') {
      setStatus('denied')
      return
    }
    // Cek apakah sudah ada active subscription
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? 'granted' : 'default'))
      .catch(() => setStatus('default'))
  }, [])

  /** Minta izin notifikasi & daftarkan subscription ke server */
  async function subscribe(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

    setStatus('loading')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setStatus('denied')
        return false
      }

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
          ),
        }))

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })

      setStatus('granted')
      return true
    } catch {
      setStatus(Notification.permission === 'denied' ? 'denied' : 'default')
      return false
    }
  }

  /** Batalkan subscription dan hapus dari server */
  async function unsubscribe(): Promise<void> {
    if (!('serviceWorker' in navigator)) return
    setStatus('loading')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
      }
      setStatus('default')
    } catch {
      setStatus('default')
    }
  }

  return { status, subscribe, unsubscribe }
}

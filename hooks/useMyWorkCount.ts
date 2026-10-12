'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Minimal interval antar fetch badge — cegah 1 request tiap pindah halaman. */
const THROTTLE_MS = 30_000

/**
 * Badge "butuh aksi" di My Work.
 *
 * - Fetch saat mount, lalu refetch saat `pathname` berubah — tapi di-throttle
 *   (THROTTLE_MS sejak fetch terakhir) supaya navigasi cepat tidak menarik
 *   query count berulang kali.
 * - Nilai terakhir dipertahankan saat fetch gagal (badge tidak hilang ke 0).
 * - Request lama di-abort saat yang baru dimulai / saat unmount.
 */
export function useMyWorkCount(pathname: string): number {
  const [count, setCount] = useState(0)
  const lastFetchAtRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  const fetchCount = useCallback(async (force = false) => {
    const now = Date.now()
    if (!force && now - lastFetchAtRef.current < THROTTLE_MS) return
    lastFetchAtRef.current = now

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/my-work/count', { signal: controller.signal })
      if (!res.ok) return // pertahankan nilai lama
      const data = await res.json()
      if (typeof data.count === 'number') setCount(data.count)
    } catch {
      // error / abort — nilai lama dipertahankan
    }
  }, [])

  useEffect(() => {
    void fetchCount(true)
    return () => abortRef.current?.abort()
  }, [fetchCount])

  useEffect(() => {
    void fetchCount()
  }, [pathname, fetchCount])

  return count
}

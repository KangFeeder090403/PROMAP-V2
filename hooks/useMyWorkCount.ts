'use client'

import { useEffect, useState } from 'react'

/**
 * Badge "butuh aksi" di My Work. Refetch tiap `pathname` berubah supaya badge
 * langsung segar setelah user beraksi. Request lama di-abort; nilai terakhir
 * dipertahankan saat fetch gagal.
 */
export function useMyWorkCount(pathname: string): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/my-work/count', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (typeof data?.count === 'number') setCount(data.count)
      })
      .catch(() => {}) // error / abort — nilai lama dipertahankan
    return () => controller.abort()
  }, [pathname])

  return count
}

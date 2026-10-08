'use client'

import { useEffect } from 'react'

/** Registrasi Service Worker satu kali saat app pertama dibuka */
export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => {}) // silent — app tetap jalan tanpa SW
    }
  }, [])

  return null
}

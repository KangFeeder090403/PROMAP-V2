'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'light' | 'dark'

export function ThemeToggle({ className = '' }: { className?: string }) {
  // null = belum tahu tema aktif (server render / sebelum efek jalan)
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'

    function apply() {
      document.documentElement.classList.toggle('dark', next === 'dark')
      try {
        localStorage.setItem('promap-theme', next)
      } catch {
        // storage diblokir (private mode) — tema tetap berubah untuk sesi ini
      }
      setTheme(next)
    }

    // Wipe vertikal: ke dark turun dari atas, ke light naik dari bawah.
    // View Transitions belum ada di Firefox/Safari lama — di sana tema tetap
    // berganti, hanya tanpa animasi.
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> }
    }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!doc.startViewTransition || reduced) {
      apply()
      return
    }

    const from = next === 'dark' ? 'inset(0 0 100% 0)' : 'inset(100% 0 0 0)'

    doc.startViewTransition(apply).ready.then(() => {
      document.documentElement.animate(
        { clipPath: [from, 'inset(0 0 0 0)'] },
        {
          duration: 500,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      )
    })
  }

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white ${className}`}
    >
      {/* Sebelum tema diketahui, tampilkan Sun agar ukuran tombol tidak berubah */}
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  )
}

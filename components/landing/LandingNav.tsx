'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { LogIn, Menu, X } from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ProMapLogo } from '@/components/ui/ProMapLogo'

const NAV_LINKS = [
  { label: 'Fitur Utama', targetId: 'fitur' },
  { label: 'Alur Kerja', targetId: 'alur' },
  { label: 'Uji Coba', targetId: 'demo' },
]

export function LandingNav() {
  const [open, setOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  // Smooth scroll handler menggunakan GSAP — URL tetap bersih tanpa hash (#)
  const handleNavClick = (e: React.MouseEvent, targetId: string) => {
    e.preventDefault()
    setOpen(false)
    const el = document.getElementById(targetId)
    if (!el) return

    const navHeight = 64
    const targetY = el.getBoundingClientRect().top + window.scrollY - navHeight

    gsap.to(window, {
      scrollTo: targetY,
      duration: 0.8,
      ease: 'power3.inOut',
    })

    // Fallback jika gsap scrollTo plugin tidak aktif
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Animate mobile menu open
  useGSAP(
    () => {
      if (!open || !mobileMenuRef.current) return
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(mobileMenuRef.current, {
          y: -8,
          opacity: 0,
          duration: 0.25,
          ease: 'power2.out',
        })
        gsap.from('.mobile-nav-item', {
          x: -12,
          opacity: 0,
          duration: 0.3,
          stagger: 0.05,
          ease: 'power2.out',
          clearProps: 'all',
        })
      })
      return () => mm.revert()
    },
    { scope: mobileMenuRef, dependencies: [open] }
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo Layered Arrow + Brand Name */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <ProMapLogo className="h-8 w-8 transition-transform duration-200 group-hover:scale-105" />
          <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            ProMaP
          </span>
        </Link>

        {/* Desktop nav — smooth scroll tanpa hash URL */}
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Navigasi utama">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={(e) => handleNavClick(e, link.targetId)}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* CTA buttons */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <LogIn className="h-4 w-4 text-slate-500" aria-hidden="true" />
            Masuk
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Daftar
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          onClick={() => setOpen(!open)}
          aria-label="Buka menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          ref={mobileMenuRef}
          className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 lg:hidden dark:border-slate-800 dark:bg-slate-900"
        >
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={(e) => handleNavClick(e, link.targetId)}
                className="mobile-nav-item text-left rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {link.label}
              </button>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mobile-nav-item inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                <LogIn className="h-4 w-4 text-slate-500" aria-hidden="true" />
                Masuk
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="mobile-nav-item inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white"
              >
                Daftar
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

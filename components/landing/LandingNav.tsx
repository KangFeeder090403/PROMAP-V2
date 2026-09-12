'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Platform', href: '#fitur' },
  { label: 'Solusi', href: '#alur' },
  { label: 'Governance', href: '#alur' },
  { label: 'Enterprise', href: '#demo' },
]

export function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href="/landing" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-800">
            <Check className="h-5 w-5 text-white" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            ProMaP
          </span>
          <span className="hidden rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700 sm:inline-block dark:bg-blue-900/40 dark:text-blue-300">
            Enterprise
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Navigasi utama">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA buttons */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="h-9 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 inline-flex items-center"
          >
            Masuk
          </Link>
          <a
            href="#demo"
            className="inline-flex h-9 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Coba Demo Gratis
          </a>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 lg:hidden dark:border-slate-800 dark:bg-slate-900">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Link
                href="/login"
                className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Masuk
              </Link>
              <a
                href="#demo"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white"
              >
                Coba Demo Gratis
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

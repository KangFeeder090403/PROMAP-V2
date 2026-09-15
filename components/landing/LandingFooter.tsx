'use client'

import Link from 'next/link'
import { ProMapLogo } from '@/components/ui/ProMapLogo'

const NAV_ITEMS = [
  { label: 'Tur Produk', href: '#tur-produk' },
  { label: 'Fitur', href: '#fitur' },
  { label: 'Alur Kerja', href: '#alur' },
  { label: 'Tanya Jawab', href: '#faq' },
  { label: 'Uji Coba Demo', href: '#demo' },
]

export function LandingFooter() {
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault()
      const id = href.slice(1)
      const el = document.getElementById(id)
      if (!el) return
      const targetY = el.getBoundingClientRect().top + window.scrollY - 64
      window.scrollTo({ top: targetY, behavior: 'smooth' })
    }
  }

  return (
    <footer className="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6">
        {/* Brand & copyright */}
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <div className="flex items-center gap-2">
            <ProMapLogo className="h-6 w-6" />
            <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
              ProMaP
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Platform eksekusi dan pemantauan rencana kerja tim.
          </p>
        </div>

        {/* In-page Nav links */}
        <nav className="flex flex-wrap items-center justify-center gap-5 text-xs text-slate-600 dark:text-slate-400">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleScroll(e, item.href)}
              className="transition-colors hover:text-slate-900 dark:hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Actions & copyright */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} ProMaP
          </span>
          <Link
            href="/login"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Masuk ke Workspace
          </Link>
        </div>
      </div>
    </footer>
  )
}

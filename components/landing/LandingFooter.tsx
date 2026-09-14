import Link from 'next/link'
import { Check } from 'lucide-react'

const FOOTER_LINKS = {
  Produk: [
    { label: 'Platform', href: '#fitur' },
    { label: 'Fitur Unggulan', href: '#fitur' },
    { label: 'Alur Persetujuan', href: '#alur' },
    { label: 'Untuk Siapa', href: '#alur' },
  ],
  Perusahaan: [
    { label: 'Privasi & Ketentuan', href: '#' },
    { label: 'Keamanan & Kepatuhan', href: '#' },
    { label: 'Standar Layanan', href: '#' },
  ],
}

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-800">
                <Check className="h-5 w-5 text-white" strokeWidth={2.5} aria-hidden="true" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                ProMaP
              </span>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Enterprise</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Platform eksekusi & tata kelola rencana kerja korporasi. Akuntabel, terstruktur, terbukti.
            </p>
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
              © {new Date().getFullYear()} ProMaP Enterprise. All rights reserved.
            </p>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {group}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom strip */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-8 sm:flex-row dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Audit Standards · Compliance · Security · SaaS Policy
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-medium text-blue-600 transition-colors hover:underline dark:text-blue-400"
            >
              Masuk ke Workspace
            </Link>
            <a
              href="#demo"
              className="inline-flex h-7 items-center rounded-md bg-blue-600 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-700"
            >
              Coba Demo
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

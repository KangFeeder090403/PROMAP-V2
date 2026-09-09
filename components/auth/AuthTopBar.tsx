import { Check } from 'lucide-react'

import { ThemeToggle } from '@/components/theme-toggle'

export function AuthTopBar() {
  return (
    <header className="w-full border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-800">
            <Check className="h-5 w-5 text-white" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            ProMaP
          </span>
          <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-800" />
          <span className="hidden text-xs font-medium text-slate-500 md:inline-block dark:text-slate-400">
            Platform Eksekusi &amp; Tata Kelola Tim
          </span>
        </div>

        <ThemeToggle />
      </div>
    </header>
  )
}

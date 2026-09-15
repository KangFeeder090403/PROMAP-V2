'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, BarChart3, Clock, FileCheck, TrendingUp } from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

const STATS = [
  { target: 99.4, suffix: '%', label: 'Capaian Eksekusi', decimals: 1, icon: TrendingUp },
  { target: 3, prefix: '', suffix: ' Tingkat', label: 'Hierarki Inisiatif', decimals: 0, icon: FileCheck },
  { target: 100, suffix: '%', label: 'Bukti Kerja Tervalidasi', decimals: 0, icon: BarChart3 },
  { target: 2, prefix: '< ', suffix: ' Detik', label: 'Ekspor Data', decimals: 0, icon: Clock },
]

export function LandingHero() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Timeline fluid entrance
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

        tl.from('.hero-badge', {
          y: -16,
          opacity: 0,
          duration: 0.6,
        })
          .from(
            '.hero-headline',
            {
              y: 24,
              opacity: 0,
              duration: 0.8,
            },
            '-=0.3'
          )
          .from(
            '.hero-subtext',
            {
              y: 20,
              opacity: 0,
              duration: 0.7,
            },
            '-=0.4'
          )
          .from(
            '.hero-cta',
            {
              y: 16,
              opacity: 0,
              duration: 0.6,
            },
            '-=0.4'
          )
          .from(
            '.hero-stat-card',
            {
              y: 20,
              opacity: 0,
              duration: 0.6,
              stagger: 0.1,
            },
            '-=0.3'
          )

        // Count-up animasi angka
        STATS.forEach((stat, idx) => {
          const el = document.getElementById(`hero-stat-num-${idx}`)
          if (!el) return
          const obj = { val: 0 }
          gsap.to(obj, {
            val: stat.target,
            duration: 1.4,
            delay: 0.6 + idx * 0.1,
            ease: 'power2.out',
            onUpdate: () => {
              const formatted = stat.decimals > 0 ? obj.val.toFixed(stat.decimals) : Math.round(obj.val).toString()
              el.textContent = `${stat.prefix ?? ''}${formatted}${stat.suffix ?? ''}`
            },
          })
        })
      })
      return () => mm.revert()
    },
    { scope: containerRef }
  )

  return (
    <section ref={containerRef} className="relative overflow-hidden bg-transparent py-16 sm:py-20 lg:py-24">
      {/* Subtle background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(#1E40AF 1px, transparent 1px), linear-gradient(to right, #1E40AF 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="hero-badge mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 dark:border-blue-900/50 dark:bg-blue-950/40">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Platform Eksekusi & Tata Kelola Tim
            </span>
          </div>

          {/* Headline */}
          <h1 className="hero-headline max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
            Satu Platform Terintegrasi untuk{' '}
            <span className="text-blue-600 dark:text-blue-400">Eksekusi dan Pemantauan</span>{' '}
            Rencana Kerja Perusahaan
          </h1>

          {/* Subtext */}
          <p className="hero-subtext mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-400">
            Tingkatkan akuntabilitas kerja organisasi Anda mulai dari{' '}
            <strong className="font-medium text-slate-800 dark:text-slate-200">Project</strong> →{' '}
            <strong className="font-medium text-slate-800 dark:text-slate-200">Task</strong> →{' '}
            <strong className="font-medium text-slate-800 dark:text-slate-200">Action Plan</strong>{' '}
            — setiap langkah tercatat, setiap penyelesaian terbukti.
          </p>

          {/* CTA Buttons */}
          <div className="hero-cta mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <a
              href="#demo"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98]"
            >
              Coba Demo Gratis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Masuk ke Workspace
            </Link>
          </div>

          {/* Stats bar with count-up IDs */}
          <div className="mt-14 w-full max-w-3xl">
            <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-6 backdrop-blur sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-800/50">
              {STATS.map((stat, idx) => (
                <div key={stat.label} className="hero-stat-card flex flex-col items-center gap-1.5 text-center">
                  <stat.icon
                    className="h-5 w-5 text-blue-500"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <p
                    id={`hero-stat-num-${idx}`}
                    className="text-xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white"
                  >
                    {stat.prefix ?? ''}{stat.target}{stat.suffix ?? ''}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

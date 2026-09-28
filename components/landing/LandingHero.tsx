'use client'

import { useRef } from 'react'
import { ArrowRight, Kanban, Layers, ListChecks, Users, type LucideIcon } from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { HeroPreviewPanel } from '@/components/landing/HeroPreviewPanel'

// Anotasi tipe eksplisit wajib: `prefix`/`suffix` dibaca di animateStatCounter dan
// di JSX, tapi tidak satu pun elemen di bawah memilikinya. Tanpa tipe ini,
// inferensi TypeScript akan menghilangkan properti tersebut dan tsc gagal.
const STATS: {
  target: number
  prefix?: string
  suffix?: string
  label: string
  decimals: number
  icon: LucideIcon
}[] = [
  { target: 8, label: 'Status Action Plan', decimals: 0, icon: ListChecks },
  { target: 5, label: 'Kolom Board', decimals: 0, icon: Kanban },
  { target: 4, label: 'Tingkat Hierarki', decimals: 0, icon: Layers },
  { target: 5, label: 'Peran Akses', decimals: 0, icon: Users },
]

function animateStatCounter(stat: (typeof STATS)[number], idx: number) {
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
}

function runHeroEntranceTimeline() {
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
      '.hero-preview',
      {
        y: 24,
        opacity: 0,
        duration: 0.7,
      },
      '-=0.35'
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
    animateStatCounter(stat, idx)
  })
}

export function LandingHero() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        runHeroEntranceTimeline()
      })
      return () => mm.revert()
    },
    { scope: containerRef }
  )

  return (
    <section ref={containerRef} className="relative overflow-hidden bg-transparent py-16 lg:py-20">
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
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Kolom kiri — teks */}
          <div className="flex min-w-0 flex-col items-center text-center lg:col-span-5 lg:items-start lg:text-left">
            {/* Badge */}
            <div className="hero-badge mb-6 inline-flex min-w-0 items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 dark:border-blue-900/50 dark:bg-blue-950/40">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                Platform Eksekusi & Tata Kelola Tim
              </span>
            </div>

            {/* Headline */}
            <h1 className="hero-headline min-w-0 max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl xl:text-6xl dark:text-white">
              Rencana Kerja yang{' '}
              <span className="text-blue-600 dark:text-blue-400">Terbukti Dikerjakan</span>
            </h1>

            {/* Subtext */}
            <p className="hero-subtext mt-6 min-w-0 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-400">
              Dari{' '}
              <strong className="font-medium text-slate-800 dark:text-slate-200">Project</strong>,{' '}
              <strong className="font-medium text-slate-800 dark:text-slate-200">Task</strong>, hingga{' '}
              <strong className="font-medium text-slate-800 dark:text-slate-200">Action Plan</strong>{' '}
              — setiap langkah tercatat, setiap penyelesaian terbukti.
            </p>

            {/* CTA Buttons */}
            <div className="hero-cta mt-8 flex w-full min-w-0 flex-col items-center gap-3 sm:w-auto sm:flex-row lg:justify-start">
              <a
                href="#demo"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/30 active:scale-[0.98] sm:w-auto"
              >
                Coba Gratis
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="#demo"
                className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:w-auto dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Jadwal Demo
              </a>
            </div>
          </div>

          {/* Kolom kanan — pratinjau workspace */}
          <div className="min-w-0 lg:col-span-7">
            <HeroPreviewPanel />
          </div>
        </div>

        {/* Stats bar with count-up IDs — full width di bawah kedua kolom */}
        <div className="mt-10 w-full lg:mt-12">
          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-6 backdrop-blur sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-800/50">
            {STATS.map((stat, idx) => (
              <div key={stat.label} className="hero-stat-card flex min-w-0 flex-col items-center gap-1.5 text-center">
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
    </section>
  )
}

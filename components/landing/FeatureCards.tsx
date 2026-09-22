'use client'

import { useRef } from 'react'
import { BarChart3, CheckCircle2, FileSpreadsheet, ShieldCheck } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

const FEATURES = [
  {
    icon: BarChart3,
    badgeIcon: BarChart3,
    badgeText: 'Pemantauan Terpadu',
    title: 'Pantau Eksekusi Rencana',
    description:
      'Pantau progres rencana kerja secara langsung melalui Kanban Board dinamis dan Kalender jadwal — setiap eksekusi terpantau secara real-time.',
    cta: 'Project → Task → Action Plan',
  },
  {
    icon: ShieldCheck,
    badgeIcon: CheckCircle2,
    badgeText: 'Verifikasi & Kepatuhan',
    title: 'Alur Persetujuan dengan Bukti Kerja',
    description:
      'Pengumpulan bukti kerja terverifikasi, alur validasi manajer divisi, dan pencatatan aksi tindak lanjut selama masa input berlangsung.',
    cta: 'Action Plan → Unggah Bukti → Validasi Manajer',
  },
  {
    icon: FileSpreadsheet,
    badgeIcon: FileSpreadsheet,
    badgeText: 'Analitik & Ekspor',
    title: 'Laporan Siap Presentasi',
    description:
      'Ekspor PDF/Excel laporan performa eksekusi yang bisa langsung dipresentasikan ke Dewan Direksi. Transparan, akurat, siap audit.',
    cta: 'Ekspor PDF langsung untuk presentasi',
  },
]

export function FeatureCards() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Header entrance
        gsap.from('.feat-header', {
          scrollTrigger: {
            trigger: '.feat-header',
            start: 'top 85%',
            once: true,
          },
          y: 24,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
        })

        // Cards stagger entrance
        gsap.from('.feat-card', {
          scrollTrigger: {
            trigger: '.feat-grid',
            start: 'top 85%',
            once: true,
          },
          y: 32,
          opacity: 0,
          duration: 0.6,
          stagger: 0.12,
          ease: 'power3.out',
          clearProps: 'all',
        })
      })
      return () => mm.revert()
    },
    { scope: containerRef }
  )

  return (
    <section id="fitur" ref={containerRef} className="bg-white/60 py-16 backdrop-blur-xs sm:py-20 dark:bg-slate-900/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="feat-header mb-12 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Keunggulan Utama ProMaP
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Dirancang untuk Ketepatan Eksekusi & Audit Tanpa Celah
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 dark:text-slate-400">
            Hilangkan silo operasional, gantikan proses padat kertas, dan pastikan setiap individu manajemen
            terlibat dalam satu alur yang sama — tanpa kebingungan.
          </p>
        </div>

        {/* Feature cards grid */}
        <div className="feat-grid grid grid-cols-1 gap-6 md:grid-cols-3">
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className="feat-card group flex flex-col rounded-xl border border-slate-200 bg-slate-50/50 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-md motion-reduce:hover:translate-y-0 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:border-blue-900/50 dark:hover:bg-blue-950/20"
            >
              {/* Icon */}
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm group-hover:border-blue-200 group-hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:group-hover:bg-blue-950/40">
                <feat.icon
                  className="h-5 w-5 text-slate-500 transition-colors group-hover:text-blue-600 dark:text-slate-400 dark:group-hover:text-blue-400"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </div>

              {/* Badge */}
              <div className="mb-2.5 flex items-center gap-1.5">
                <feat.badgeIcon className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {feat.badgeText}
                </span>
              </div>

              {/* Title */}
              <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
                {feat.title}
              </h3>

              {/* Description */}
              <p className="flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {feat.description}
              </p>

              {/* CTA text */}
              <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  → {feat.cta}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

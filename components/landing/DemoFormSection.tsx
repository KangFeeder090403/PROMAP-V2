'use client'

import { useRef } from 'react'
import { ShieldCheck } from 'lucide-react'
import { GuestDemoPanel } from '@/components/auth/GuestDemoPanel'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

export function DemoFormSection() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.demo-header', {
          scrollTrigger: { trigger: '.demo-header', start: 'top 85%', once: true },
          y: 24,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
        })

        gsap.from('.demo-card', {
          scrollTrigger: { trigger: '.demo-card', start: 'top 85%', once: true },
          y: 32,
          opacity: 0,
          duration: 0.7,
          delay: 0.1,
          ease: 'power3.out',
          clearProps: 'all',
        })

        gsap.from('.demo-trust', {
          scrollTrigger: { trigger: '.demo-trust', start: 'top 90%', once: true },
          y: 12,
          opacity: 0,
          duration: 0.5,
          delay: 0.2,
          ease: 'power2.out',
        })
      })
      return () => mm.revert()
    },
    { scope: containerRef }
  )

  return (
    <section
      id="demo"
      ref={containerRef}
      className="relative overflow-hidden bg-white py-16 sm:py-20 dark:bg-slate-900"
    >
      <div className="relative mx-auto max-w-2xl px-4 sm:px-6">
        {/* Section header */}
        <div className="demo-header mb-8 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Uji Coba · Gratis
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Mulai Uji Coba Demo ProMaP Sekarang
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Rasakan langsung seluruh fitur ProMaP dalam sesi demo dengan data contoh realistis.
          </p>
        </div>

        {/* Form card — reuse the existing GuestDemoPanel */}
        <div className="demo-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-800">
          <GuestDemoPanel />
        </div>

        {/* Trust badge */}
        <div className="demo-trust mt-5 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          <span>
            Kami tidak akan menjual data Anda untuk iklan. Akses demo tersedia gratis untuk tim Anda.
          </span>
        </div>
      </div>
    </section>
  )
}

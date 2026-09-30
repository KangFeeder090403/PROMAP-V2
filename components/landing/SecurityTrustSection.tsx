'use client'

import { useRef } from 'react'
import { Database, FileCheck, KeyRound, Lock, ShieldCheck } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

const SECURITY_PILLARS = [
  {
    icon: Database,
    title: 'Isolasi Multi-Tenant Ketat',
    desc: 'Setiap organisasi memiliki batasan tenant terisolasi penuh di tingkat query basis data. Data, proyek, dan file dokumen antar perusahaan tidak pernah saling bercampur.',
    badge: 'Zero Cross-Tenant Leak',
  },
  {
    icon: KeyRound,
    title: '4 Tingkat Hak Akses (RBAC)',
    desc: 'Kontrol granular dari Super Admin, Admin Operasional, Manajer Divisi, hingga PIC. Setiap pengguna hanya dapat melihat dan mengeksekusi data sesuai batas wewenangnya.',
    badge: 'Granular Access',
  },
  {
    icon: FileCheck,
    title: 'Log Audit Permanen & Terverifikasi',
    desc: 'Setiap pergeseran status target, pengunggahan dokumen bukti, dan keputusan persetujuan terekam permanen dengan cap waktu dan identitas verifikator.',
    badge: 'Immutable History',
  },
  {
    icon: Lock,
    title: 'Enkripsi Data Standar Industri',
    desc: 'Semua berkas dan dokumen bukti tersimpan aman dengan enkripsi berlapis saat diam (at-rest) dan saat transit via HTTPS/TLS berkecepatan tinggi.',
    badge: 'TLS & Data at Rest',
  },
]

export function SecurityTrustSection() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.sec-header', {
          scrollTrigger: { trigger: '.sec-header', start: 'top 85%', once: true },
          y: 24,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
        })

        gsap.from('.sec-card', {
          scrollTrigger: { trigger: '.sec-grid', start: 'top 85%', once: true },
          y: 20,
          opacity: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power3.out',
          clearProps: 'all',
        })
      })
      return () => mm.revert()
    },
    { scope: containerRef }
  )

  return (
    <section id="keamanan" ref={containerRef} className="bg-transparent py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="sec-header mb-12 text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Keamanan Data & Tata Kelola Korporasi
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Standar Keamanan Tingkat Enterprise
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-400">
            Kerahasiaan dan integritas operasional organisasi Anda adalah prioritas utama kami dengan arsitektur kepatuhan teruji.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="sec-grid grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SECURITY_PILLARS.map((pillar) => {
            const Icon = pillar.icon
            return (
              <div
                key={pillar.title}
                className="sec-card flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {pillar.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {pillar.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

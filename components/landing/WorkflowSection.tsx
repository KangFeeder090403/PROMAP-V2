'use client'

import { useRef } from 'react'
import { CheckCircle2, FileUp, UserCheck } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

const STEPS = [
  {
    number: '01',
    icon: UserCheck,
    title: 'Pendelegasian & Penugasan',
    description:
      'Dewan Direksi atau Manajer mendelegasikan target kerja ke masing-masing PIC dengan cakupan, tenggat, dan prioritas yang spesifik.',
  },
  {
    number: '02',
    icon: FileUp,
    title: 'Unggah Bukti Kerja',
    description:
      'PIC mengerjakan rencana aksi dan mengunggah bukti penyelesaian (PDF, Excel, gambar) — sistem mencatat selama masa input berlangsung.',
  },
  {
    number: '03',
    icon: CheckCircle2,
    title: 'Verifikasi & Keputusan Manajer',
    description:
      'Manajer mereview bukti yang diunggah, bisa menolak atau menyetujui. Setiap keputusan terekam dalam log audit otomatis.',
  },
]

// Evidence panel preview data — nama contoh fiktif, bukan nama asli
const EVIDENCE_ITEMS = [
  { name: 'Kontrak Kerjasama Terbaru.pdf', type: 'PDF', size: '2.4 MB', status: 'Disetujui' },
  { name: 'Dokumentasi Pengesahan.jpg', type: 'IMG', size: '840 KB', status: 'Disetujui' },
  { name: 'Laporan Akhir Kontrak.xlsx', type: 'XLS', size: '1.1 MB', status: 'Ditinjau' },
]

export function WorkflowSection() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Header
        gsap.from('.wf-header', {
          scrollTrigger: { trigger: '.wf-header', start: 'top 85%', once: true },
          y: 24,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
        })

        // Steps stagger
        gsap.from('.wf-step', {
          scrollTrigger: { trigger: '.wf-steps', start: 'top 80%', once: true },
          x: -24,
          opacity: 0,
          duration: 0.6,
          stagger: 0.15,
          ease: 'power3.out',
          clearProps: 'all',
        })

        // Evidence panel slide in from right
        gsap.from('.wf-panel', {
          scrollTrigger: { trigger: '.wf-panel', start: 'top 80%', once: true },
          x: 32,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
          clearProps: 'all',
        })
      })
      return () => mm.revert()
    },
    { scope: containerRef }
  )

  return (
    <section id="alur" ref={containerRef} className="bg-slate-50/50 py-16 backdrop-blur-xs sm:py-20 dark:bg-slate-950/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="wf-header mb-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Alur Kerja Terstruktur
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Dari Arahan Pimpinan Menjadi Tindakan Nyata
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Sistem pengawasan eksekusi menyeluruh — setiap arahan didelegasikan satu
            tingkat ke bawah, dan setiap langkah dapat diaudit. Tidak ada tugas yang luput dari pengawasan.
          </p>
        </div>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Left: Steps */}
          <div className="wf-steps flex flex-col gap-8">
            {STEPS.map((step, idx) => (
              <div key={step.number} className="wf-step flex gap-5">
                {/* Step number + line */}
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-800 text-sm font-bold text-white">
                    {step.number}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className="mt-2 w-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  )}
                </div>
                {/* Content */}
                <div className="pb-2">
                  <div className="mb-1.5 flex items-center gap-2">
                    <step.icon
                      className="h-4 w-4 text-blue-600 dark:text-blue-400"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Evidence panel preview */}
          <div className="flex flex-col justify-center">
            <div className="wf-panel overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900">
              {/* Panel header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Panel Validasi Bukti
                  </p>
                  <h4 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
                    AP-1142 · Pembaruan Kontrak
                  </h4>
                </div>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  Menunggu Persetujuan
                </span>
              </div>

              {/* Evidence items */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {EVIDENCE_ITEMS.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 px-5 py-3.5"
                  >
                    {/* File type badge */}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      {item.type}
                    </span>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-400">{item.size}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        item.status === 'Disetujui'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action buttons — dekoratif, bukan fungsional */}
              <div className="flex gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
                <button
                  type="button"
                  aria-disabled="true"
                  tabIndex={-1}
                  className="flex-1 cursor-default rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Tolak & Minta Revisi
                </button>
                <button
                  type="button"
                  aria-disabled="true"
                  tabIndex={-1}
                  className="flex-1 cursor-default rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Setujui & Verifikasi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

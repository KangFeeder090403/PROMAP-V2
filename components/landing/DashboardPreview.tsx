'use client'

import { useRef } from 'react'
import { CheckCircle2 } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

// Mock metric cards — data contoh realistis
const METRICS = [
  { label: 'Total Action Plan', value: '48', sub: '↑ 12% bulan ini', color: 'text-blue-600' },
  { label: 'Perlu Ditinjau', value: '14', sub: 'Menunggu persetujuan', color: 'text-amber-600' },
  {
    label: 'Tingkat Penyelesaian',
    value: '94.8%',
    sub: 'Dari target 100%',
    color: 'text-emerald-600',
  },
]

// Kolom Kanban sesuai PRD V2.4 — 5 kolom: Not Started, In Progress, Review, Needs Revision, Done
const KANBAN_COLS = [
  {
    title: 'Belum Mulai (2)',
    items: [
      { code: 'AP-112', title: 'Audit Kontrak Vendor', tag: 'Terlambat', tagColor: 'bg-orange-100 text-orange-700' },
    ],
  },
  {
    title: 'Dikerjakan (4)',
    items: [
      { code: 'AP-108', title: 'Revisi Proposal ERP', tag: 'Tinggi', tagColor: 'bg-red-100 text-red-700' },
    ],
  },
  {
    title: 'Review (5)',
    items: [
      { code: 'AP-109', title: 'Pelatihan Anggaran Dept', tag: 'Sedang', tagColor: 'bg-amber-100 text-amber-700' },
    ],
  },
  {
    title: 'Perlu Revisi (1)',
    items: [],
  },
  {
    title: 'Selesai (3)',
    items: [
      { code: 'AP-432', title: 'Finalisasi KPI Divisi', tag: 'Selesai', tagColor: 'bg-emerald-100 text-emerald-700' },
    ],
  },
]

const DONUT_SEGS = [
  { pct: 86, color: '#1E40AF', label: 'Selesai' },
  { pct: 8, color: '#93C5FD', label: 'Dikerjakan' },
  { pct: 6, color: '#EF4444', label: 'Review & Revisi' },
]

export function DashboardPreview() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Frame rises up
        gsap.from('.dash-frame', {
          scrollTrigger: { trigger: '.dash-frame', start: 'top 85%', once: true },
          y: 40,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
        })

        // Badge float in
        gsap.from('.dash-badge', {
          scrollTrigger: { trigger: '.dash-frame', start: 'top 75%', once: true },
          y: 16,
          opacity: 0,
          duration: 0.5,
          delay: 0.4,
          ease: 'power2.out',
        })
      })
      return () => mm.revert()
    },
    { scope: containerRef }
  )

  return (
    <section ref={containerRef} className="bg-slate-50 py-12 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section label */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="h-px w-12 bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Tampilan Workspace Nyata
          </span>
          <span className="h-px w-12 bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Preview frame */}
        <div className="dash-frame relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900">
          {/* Window chrome */}
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <div className="ml-3 flex-1">
              <div className="mx-auto h-5 max-w-xs rounded-full bg-slate-200/80 dark:bg-slate-700" />
            </div>
          </div>

          {/* Mock app shell */}
          <div className="flex min-h-[360px] sm:min-h-[420px]">
            {/* Sidebar */}
            <div className="hidden w-[180px] shrink-0 border-r border-slate-800 bg-slate-900 p-4 sm:block">
              <div className="mb-5 flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-blue-800" />
                <span className="text-sm font-semibold text-white">ProMaP</span>
              </div>
              {['Beranda', 'Kerja Saya', 'Proyek', 'Board', 'Kalender', 'Proposal'].map((item) => (
                <div
                  key={item}
                  className={`mb-1 rounded-md px-2.5 py-1.5 text-xs ${item === 'Board' ? 'bg-blue-800 text-white' : 'text-slate-400'}`}
                >
                  {item}
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-hidden p-4 sm:p-5">
              {/* Breadcrumb */}
              <p className="mb-4 text-xs text-slate-400">Beranda / Eksekusi Board</p>

              {/* Metric cards */}
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {METRICS.map((m) => (
                  <div
                    key={m.label}
                    className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {m.label}
                    </p>
                    <p className={`mt-1 text-lg font-bold ${m.color}`}>{m.value}</p>
                    <p className="text-[10px] text-slate-500">{m.sub}</p>
                  </div>
                ))}
              </div>

              {/* Kanban + donut row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* Kanban preview (2/3 width) */}
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3 sm:col-span-2 dark:border-slate-700 dark:bg-slate-800">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Papan Eksekusi Kanban (5 Kolom)
                  </p>
                  <div className="flex gap-2">
                    {KANBAN_COLS.map((col) => (
                      <div key={col.title} className="min-w-[100px] flex-1 rounded-md bg-slate-50 p-2 dark:bg-slate-700/30">
                        <p className="mb-1.5 text-[9px] font-semibold text-slate-500">{col.title}</p>
                        {col.items.map((item) => (
                          <div
                            key={item.code}
                            className="mb-1.5 rounded border border-slate-200 bg-white p-1.5 dark:border-slate-600 dark:bg-slate-800"
                          >
                            <p className="text-[8px] font-medium text-slate-400">{item.code}</p>
                            <p className="text-[9px] font-semibold text-slate-700 dark:text-slate-200">
                              {item.title}
                            </p>
                            <span
                              className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[8px] font-medium ${item.tagColor}`}
                            >
                              {item.tag}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Donut chart (1/3 width) */}
                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Distribusi Status
                  </p>
                  {/* SVG donut */}
                  <div className="flex justify-center">
                    <svg viewBox="0 0 80 80" className="h-20 w-20">
                      <circle cx="40" cy="40" r="30" fill="none" stroke="#F1F5F9" strokeWidth="14" />
                      {/* 86% segment */}
                      <circle
                        cx="40"
                        cy="40"
                        r="30"
                        fill="none"
                        stroke="#1E40AF"
                        strokeWidth="14"
                        strokeDasharray={`${86 * 1.885} ${(100 - 86) * 1.885}`}
                        strokeDashoffset="47.1"
                        strokeLinecap="round"
                        transform="rotate(-90 40 40)"
                      />
                      {/* 8% segment */}
                      <circle
                        cx="40"
                        cy="40"
                        r="30"
                        fill="none"
                        stroke="#93C5FD"
                        strokeWidth="14"
                        strokeDasharray={`${8 * 1.885} ${(100 - 8) * 1.885}`}
                        strokeDashoffset={`${-(86 * 1.885) + 47.1}`}
                        transform="rotate(-90 40 40)"
                      />
                      {/* 6% segment */}
                      <circle
                        cx="40"
                        cy="40"
                        r="30"
                        fill="none"
                        stroke="#EF4444"
                        strokeWidth="14"
                        strokeDasharray={`${6 * 1.885} ${(100 - 6) * 1.885}`}
                        strokeDashoffset={`${-((86 + 8) * 1.885) + 47.1}`}
                        transform="rotate(-90 40 40)"
                      />
                      <text x="40" y="43" textAnchor="middle" fontSize="12" fontWeight="bold" className="fill-slate-900 dark:fill-white">
                        86%
                      </text>
                    </svg>
                  </div>
                  <div className="mt-2 space-y-1">
                    {DONUT_SEGS.map((seg) => (
                      <div key={seg.label} className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: seg.color }}
                        />
                        <span className="truncate text-[8px] text-slate-500 dark:text-slate-400">{seg.label}</span>
                        <span className="ml-auto text-[8px] font-semibold text-slate-600 dark:text-slate-300">{seg.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom floating badge */}
          <div className="dash-badge absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 shadow-md backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/90">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="whitespace-nowrap text-[10px] font-medium text-slate-600 dark:text-slate-300">
              Pratinjau Produksi Langsung · ProMaP
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

'use client'

import { useRef } from 'react'
import { AlertTriangle, CheckCircle2, FileX, MessageSquare, ShieldAlert, Sparkles, TrendingUp, XCircle } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

const PAIN_POINTS = [
  {
    icon: MessageSquare,
    title: 'Instruksi Tercecer di Chat & Email',
    desc: 'Arahan kerja tenggelam di riwayat percakapan grup; tidak ada catatan resmi siapa yang bertanggung jawab saat deadline terlewat.',
  },
  {
    icon: FileX,
    title: 'Klaim Selesai Tanpa Dokumen Nyata',
    desc: 'Status proyek ditandai "beres" hanya berdasarkan ucapan lisan, tanpa lampiran berkas bukti fisik yang dapat dipertanggungjawabkan.',
  },
  {
    icon: ShieldAlert,
    title: 'Rekap Manual Menjelang Rapat Direksi',
    desc: 'Manajer menghabiskan waktu berhari-hari menyusun presentasi PowerPoint dan spreadsheet secara tergesa-gesa dengan akurasi meragukan.',
  },
]

const SOLUTION_POINTS = [
  {
    icon: CheckCircle2,
    title: 'Satu Sistem Eksekusi Terpusat',
    desc: 'Setiap target kerja didelegasikan secara terstruktur dengan penanggung jawab, tenggat waktu, dan indikator keberhasilan yang transparan.',
  },
  {
    icon: TrendingUp,
    title: 'Verifikasi Berbasis Bukti Nyata',
    desc: 'Target hanya dapat disahkan setelah PIC mengunggah bukti penyelesaian (PDF, Excel, foto) dan disetujui resmi oleh manajer.',
  },
  {
    icon: Sparkles,
    title: 'Laporan Siap Presentasi Seketika',
    desc: 'Metrik kinerja dan ringkasan kepatuhan diekspor langsung ke format PDF resmi dewan direksi dalam hitungan detik.',
  },
]

export function PainVsSolution() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.pain-header', {
          scrollTrigger: { trigger: '.pain-header', start: 'top 85%', once: true },
          y: 24,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
        })

        gsap.from('.pain-card', {
          scrollTrigger: { trigger: '.pain-grid', start: 'top 80%', once: true },
          x: -24,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
          clearProps: 'all',
        })

        gsap.from('.solution-card', {
          scrollTrigger: { trigger: '.pain-grid', start: 'top 80%', once: true },
          x: 24,
          opacity: 0,
          duration: 0.7,
          delay: 0.1,
          ease: 'power3.out',
          clearProps: 'all',
        })
      })
      return () => mm.revert()
    },
    { scope: containerRef }
  )

  return (
    <section ref={containerRef} className="bg-transparent py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="pain-header mb-12 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Perbandingan Efisiensi Kerja
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Tinggalkan Cara Lama yang Memperlambat Keputusan
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-400">
            Lihat bagaimana ProMaP mengubah ketidakpastian koordinasi informal menjadi sistem eksekusi yang akuntabel dan siap diaudit kapan saja.
          </p>
        </div>

        {/* 2-Column Comparison Grid */}
        <div className="pain-grid grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          {/* Kolom Kiri: Cara Konvensional */}
          <div className="pain-card flex flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-800/30">
            <div className="mb-6 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                  Cara Konvensional
                </span>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Spreadsheet Terpisah & Koordinasi Obrolan Chat
                </h3>
              </div>
            </div>

            <div className="space-y-5">
              {PAIN_POINTS.map((pt) => {
                const Icon = pt.icon
                return (
                  <div key={pt.title} className="flex gap-3.5">
                    <div className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500">
                      <XCircle className="h-4 w-4 text-red-500/80" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                        {pt.title}
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        {pt.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Kolom Kanan: Cara ProMaP */}
          <div className="solution-card flex flex-col rounded-2xl border-2 border-blue-800/40 bg-blue-50/25 p-6 shadow-sm sm:p-8 dark:border-blue-600/40 dark:bg-blue-950/20">
            <div className="mb-6 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-800 text-white dark:bg-blue-600">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  Dengan ProMaP
                </span>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Tata Kelola Eksekusi Rencana Kerja Terintegrasi
                </h3>
              </div>
            </div>

            <div className="space-y-5">
              {SOLUTION_POINTS.map((pt) => {
                const Icon = pt.icon
                return (
                  <div key={pt.title} className="flex gap-3.5">
                    <div className="mt-0.5 shrink-0 text-blue-800 dark:text-blue-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {pt.title}
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        {pt.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

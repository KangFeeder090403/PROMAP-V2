'use client'

import { useRef, useState } from 'react'
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileText,
  Filter,
  Kanban,
  Layers,
  Search,
  ShieldCheck,
  User,
} from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

type TourTab = 'kanban' | 'evidence' | 'reports'

const TABS: { id: TourTab; label: string; icon: typeof Kanban; desc: string }[] = [
  {
    id: 'kanban',
    label: 'Papan Eksekusi Kanban',
    icon: Kanban,
    desc: 'Pantau status seluruh target kerja dalam 5 tahap alur yang jelas',
  },
  {
    id: 'evidence',
    label: 'Persetujuan & Bukti Kerja',
    icon: FileCheck,
    desc: 'Verifikasi dokumen lampiran nyata sebelum target dinyatakan selesai',
  },
  {
    id: 'reports',
    label: 'Laporan Eksekutif',
    icon: BarChart3,
    desc: 'Ringkasan capaian kinerja dan metrik siap saji untuk pimpinan',
  },
]

export function InteractiveProductTour() {
  const [activeTab, setActiveTab] = useState<TourTab>('kanban')
  const containerRef = useRef<HTMLDivElement>(null)
  const tabContentRef = useRef<HTMLDivElement>(null)

  // Animasi container entrance on scroll
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.tour-header', {
          scrollTrigger: { trigger: '.tour-header', start: 'top 85%', once: true },
          y: 24,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
        })
        gsap.from('.tour-main', {
          scrollTrigger: { trigger: '.tour-main', start: 'top 80%', once: true },
          y: 32,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          clearProps: 'all',
        })
      })
      return () => mm.revert()
    },
    { scope: containerRef }
  )

  // Animasi transisi tab konten
  useGSAP(
    () => {
      if (!tabContentRef.current) return
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          tabContentRef.current,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'all' }
        )
      })
      return () => mm.revert()
    },
    { scope: tabContentRef, dependencies: [activeTab] }
  )

  return (
    <section id="tur-produk" ref={containerRef} className="bg-slate-50/60 py-16 backdrop-blur-sm sm:py-20 dark:bg-slate-950/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header section */}
        <div className="tour-header mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
            <Layers className="h-3.5 w-3.5" />
            Tur Produk Langsung
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Lihat Bagaimana Tim Bekerja di ProMaP
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-400">
            Jelajahi alur nyata manajemen rencana aksi: pantau progres, verifikasi dokumen bukti, dan unduh laporan performa tanpa proses berbelit.
          </p>

          {/* Tab buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 sm:text-sm ${
                    isActive
                      ? 'bg-blue-800 text-white shadow-sm ring-2 ring-blue-800/20 dark:bg-blue-600 dark:ring-blue-600/30'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100/60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Main interactive window mock */}
        <div className="tour-main relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900">
          {/* Top Window Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="ml-2 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                app.promap.id / workspace
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Data Tersinkronisasi
            </div>
          </div>

          {/* Sub-header inside preview */}
          <div className="border-b border-slate-100 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {TABS.find((t) => t.id === activeTab)?.desc}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Perusahaan: PT Sinar Niaga Tbk
                </span>
              </div>
            </div>
          </div>

          {/* Tab Content Canvas with min-h to prevent layout shift */}
          <div ref={tabContentRef} className="min-h-[460px] p-5 sm:p-6">
            {activeTab === 'kanban' && <TourKanbanView />}
            {activeTab === 'evidence' && <TourEvidenceView />}
            {activeTab === 'reports' && <TourReportsView />}
          </div>
        </div>
      </div>
    </section>
  )
}

// Sub-komponen View 1: Papan Kanban
function TourKanbanView() {
  const columns = [
    {
      title: 'Belum Mulai',
      count: 2,
      cards: [
        {
          code: 'AP-201',
          title: 'Integrasi API Payment Gateway Tahap II',
          tag: 'Normal',
          tagClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          due: '28 Sep',
          pic: 'Budi S.',
        },
      ],
    },
    {
      title: 'Dikerjakan',
      count: 3,
      cards: [
        {
          code: 'AP-189',
          title: 'Audit Keamanan Infrastruktur Cloud',
          tag: 'Tinggi',
          tagClass: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
          due: '24 Sep',
          pic: 'Alvito U.',
        },
        {
          code: 'AP-192',
          title: 'Revisi Standar Operasional Distribusi',
          tag: 'Normal',
          tagClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          due: '30 Sep',
          pic: 'Dewi K.',
        },
      ],
    },
    {
      title: 'Ditinjau',
      count: 2,
      cards: [
        {
          code: 'AP-178',
          title: 'Laporan Finansial Kuartal III ke Direksi',
          tag: 'Mendesak',
          tagClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
          due: '22 Sep',
          pic: 'Rian P.',
          evidence: true,
        },
      ],
    },
    {
      title: 'Butuh Revisi',
      count: 1,
      cards: [
        {
          code: 'AP-164',
          title: 'Dokumen Pengadaan Lisensi Database',
          tag: 'Catatan Manajer',
          tagClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
          due: '20 Sep',
          pic: 'Siti M.',
        },
      ],
    },
    {
      title: 'Selesai',
      count: 8,
      cards: [
        {
          code: 'AP-155',
          title: 'Pelatihan Keamanan Siber Seluruh Staf',
          tag: 'Tervalidasi',
          tagClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
          due: '18 Sep',
          pic: 'Hendra A.',
        },
      ],
    },
  ]

  return (
    <div className="space-y-4">
      {/* Mini toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Proyek: Digitalisasi Operasional 2026
          </span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            16 Rencana Aksi
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Filter className="h-3.5 w-3.5" />
          Semua Divisi · Prioritas Aktif
        </div>
      </div>

      {/* 5 Kolom Kanban */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        {columns.map((col) => (
          <div
            key={col.title}
            className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/30"
          >
            {/* Column Header */}
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {col.title}
              </span>
              <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 shadow-sm dark:bg-slate-700 dark:text-slate-300">
                {col.count}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2">
              {col.cards.map((card) => (
                <div
                  key={card.code}
                  className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition-shadow hover:shadow dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-blue-700 dark:text-blue-400">
                      {card.code}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${card.tagClass}`}>
                      {card.tag}
                    </span>
                  </div>
                  <p className="text-xs font-medium leading-snug text-slate-900 dark:text-slate-100">
                    {card.title}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 dark:border-slate-700">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {card.due}
                    </span>
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {card.pic}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Sub-komponen View 2: Validasi Bukti & Drawer dengan Micro-Simulator Interaktif
function TourEvidenceView() {
  const [decision, setDecision] = useState<'PENDING' | 'APPROVED' | 'REVISION'>('PENDING')
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const handleApprove = () => {
    setDecision('APPROVED')
    setToastMsg('Disetujui oleh Manajer Operasional · Log audit kekal tercatat otomatis')
  }

  const handleRequestRevision = () => {
    setDecision('REVISION')
    setToastMsg('Catatan revisi dikirimkan ke PIC · Status dialihkan ke Butuh Revisi')
  }

  const handleReset = () => {
    setDecision('PENDING')
    setToastMsg(null)
  }

  return (
    <div className="space-y-4">
      {/* Toast notifikasi mini simulator */}
      {toastMsg && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span className="font-medium">{toastMsg}</span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] font-semibold text-blue-700 underline hover:text-blue-800 dark:text-blue-300"
          >
            Reset Simulasi
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Kolom Kiri: Detail AP */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/20">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">
                AP-178
              </span>
              {decision === 'PENDING' && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  Menunggu Keputusan Manajer
                </span>
              )}
              {decision === 'APPROVED' && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Target Disetujui & Selesai
                </span>
              )}
              {decision === 'REVISION' && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-800 dark:bg-orange-950/40 dark:text-orange-300">
                  Menunggu Bukti Tambahan
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Laporan Finansial Kuartal III ke Dewan Direksi
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              PIC telah menyelesaikan kompilasi seluruh data pengeluaran divisi dan melampirkan berkas audit eksternal untuk verifikasi final.
            </p>
          </div>

          {/* Dokumen lampiran */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Dokumen Bukti Terlampir (2 Berkas)
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Rekapitulasi_Biaya_Q3_Final.pdf
                    </p>
                    <p className="text-[10px] text-slate-400">3.2 MB · Diunggah oleh Rian P. (PIC)</p>
                  </div>
                </div>
                <span className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Terverifikasi Sistem
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Lembar_Pengesahan_Auditor.xlsx
                    </p>
                    <p className="text-[10px] text-slate-400">1.8 MB · Terverifikasi tanpa revisi</p>
                  </div>
                </div>
                <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  Lampiran Lengkap
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Panel Keputusan Manajer */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40 lg:col-span-5">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Persetujuan & Keputusan Manajer
                </h4>
              </div>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                Klik untuk Coba
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Uji coba langsung respons sistem: klik tombol di bawah untuk melihat bagaimana keputusan terekam ke log audit.
            </p>

            <div className="mt-4 space-y-2.5">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Catatan Tinjauan Manajer:
              </label>
              <div className="rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-700 italic dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                &ldquo;Seluruh angka anggaran sesuai batas pagu divisi. Dokumen pendukung lengkap.&rdquo;
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleApprove}
              className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold text-white shadow-sm transition-colors ${
                decision === 'APPROVED'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-800 hover:bg-blue-700'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              {decision === 'APPROVED' ? 'Telah Disetujui' : 'Setujui & Selesaikan Target'}
            </button>
            <button
              type="button"
              onClick={handleRequestRevision}
              className={`inline-flex h-9 items-center justify-center rounded-lg border px-4 text-xs font-medium transition-colors ${
                decision === 'REVISION'
                  ? 'border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {decision === 'REVISION' ? 'Status: Butuh Revisi' : 'Minta Bukti Tambahan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Sub-komponen View 3: Laporan Eksekutif & Ringkasan KPI
function TourReportsView() {
  const metrics = [
    { label: 'Tingkat Kepatuhan Eksekusi', val: '98.4%', sub: '↑ 4.2% dari kuartal lalu' },
    { label: 'Rata-rata Durasi Verifikasi', val: '1.4 Hari', sub: 'Standar maksimal 3 hari' },
    { label: 'Target Selesai Tepat Waktu', val: '42 / 44', sub: '95.5% ketepatan waktu' },
  ]

  const divisions = [
    { name: 'Divisi Operasional & Logistik', pct: 96, count: '14 Target Selesai' },
    { name: 'Divisi Keuangan & Akuntansi', pct: 92, count: '10 Target Selesai' },
    { name: 'Divisi Teknologi & Sistem Informasi', pct: 100, count: '12 Target Selesai' },
    { name: 'Divisi Sumber Daya Manusia', pct: 88, count: '8 Target Selesai' },
  ]

  return (
    <div className="space-y-5">
      {/* Header bar laporan */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Laporan Kinerja Eksekusi Korporasi — Periode Berjalan
          </h3>
          <p className="text-[11px] text-slate-500">
            Dihasilkan otomatis berdasarkan bukti nyata yang telah disahkan
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <Download className="h-3.5 w-3.5 text-slate-500" />
          Ekspor PDF Direksi
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/30"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              {m.label}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {m.val}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Progres per divisi */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Penyelesaian Target Menurut Divisi
        </p>
        <div className="space-y-3">
          {divisions.map((d) => (
            <div key={d.name}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-200">{d.name}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{d.pct}% ({d.count})</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-blue-800 transition-all dark:bg-blue-600"
                  style={{ width: `${d.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useRef, useState } from 'react'
import { BarChart3, CalendarDays, Kanban, MoveHorizontal, type LucideIcon } from 'lucide-react'

type TabKey = 'board' | 'kalender' | 'laporan'

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'board', label: 'Board', icon: Kanban },
  { key: 'kalender', label: 'Kalender', icon: CalendarDays },
  { key: 'laporan', label: 'Laporan', icon: BarChart3 },
]

// Satu dataset dipakai tiga view (PRD §B1 #1 — One System, Multiple Views).
// Data statis, nol fetch: ini pratinjau pemasaran, bukan workspace nyata.
type PreviewCard = {
  code: string
  title: string
  pic: string
  day: number
  overdue?: boolean
}

// Judul kolom mengikuti KANBAN_COLUMNS di lib/action-plan-status.ts.
const BOARD_COLUMNS: { title: string; count: number; cards: PreviewCard[] }[] = [
  {
    title: 'Belum Mulai',
    count: 2,
    cards: [{ code: 'AP-112', title: 'Audit Kontrak Vendor', pic: 'Rani S.', day: 15, overdue: true }],
  },
  {
    title: 'Dikerjakan',
    count: 4,
    cards: [{ code: 'AP-108', title: 'Revisi Proposal ERP', pic: 'Dimas P.', day: 4 }],
  },
  {
    title: 'Review',
    count: 5,
    cards: [{ code: 'AP-109', title: 'Pelatihan Anggaran Dept', pic: 'Ayu L.', day: 9 }],
  },
  { title: 'Perlu Revisi', count: 0, cards: [] },
  {
    title: 'Selesai',
    count: 3,
    cards: [{ code: 'AP-432', title: 'Finalisasi KPI Divisi', pic: 'Bagas W.', day: 22 }],
  },
]

const CALENDAR_ITEMS: PreviewCard[] = BOARD_COLUMNS.flatMap((col) => col.cards)

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const REPORT_METRICS = [
  { label: 'Tingkat Penyelesaian', value: '94,8%', sub: 'Dari 48 Action Plan' },
  { label: 'Rata-rata Verifikasi', value: '1,4 Hari', sub: 'Standar maksimal 3 hari' },
]

const REPORT_DIVISIONS = [
  { name: 'Operasional', pct: 96 },
  { name: 'Keuangan', pct: 92 },
  { name: 'Teknologi', pct: 100 },
]

export function HeroPreviewPanel() {
  const [tab, setTab] = useState<TabKey>('board')
  const tablistRef = useRef<HTMLDivElement>(null)

  function handleTabKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const idx = TABS.findIndex((t) => t.key === tab)
    const next = e.key === 'ArrowRight' ? (idx + 1) % TABS.length : (idx - 1 + TABS.length) % TABS.length
    setTab(TABS[next].key)
    tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
  }

  return (
    <div className="hero-preview w-full min-w-0 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-lg shadow-slate-900/5 backdrop-blur sm:p-4 dark:border-slate-800 dark:bg-slate-900/80">
      {/* Tab switcher — segmented control */}
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Tampilan workspace ProMaP"
        onKeyDown={handleTabKeyDown}
        className="flex snap-x gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-800/70 sm:overflow-visible"
      >
        {TABS.map((t) => {
          const active = t.key === tab
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`hero-tab-${t.key}`}
              aria-selected={active}
              aria-controls={`hero-panel-${t.key}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(t.key)}
              className={`inline-flex h-9 flex-1 shrink-0 snap-start items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                active
                  ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <t.icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Panel — tinggi dikunci supaya ganti tab tidak menggeser stat bar di bawah */}
      <div className="relative mt-3 min-h-[340px] sm:min-h-[380px]">
        <Panel tabKey="board" active={tab === 'board'}>
          <BoardView />
        </Panel>
        <Panel tabKey="kalender" active={tab === 'kalender'}>
          <CalendarView />
        </Panel>
        <Panel tabKey="laporan" active={tab === 'laporan'}>
          <ReportsView />
        </Panel>
      </div>
    </div>
  )
}

// Panel non-aktif tetap ter-render (bukan `hidden`) supaya transition-opacity jalan.
// `invisible` sudah mengeluarkannya dari accessibility tree.
function Panel({
  tabKey,
  active,
  children,
}: {
  tabKey: TabKey
  active: boolean
  children: React.ReactNode
}) {
  return (
    <div
      role="tabpanel"
      id={`hero-panel-${tabKey}`}
      aria-labelledby={`hero-tab-${tabKey}`}
      className={`transition-opacity duration-200 ${
        active ? 'relative opacity-100' : 'invisible absolute inset-0 opacity-0'
      }`}
    >
      {children}
    </div>
  )
}

function BoardView() {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Papan Eksekusi — 5 Kolom
      </p>

      {/* Scroll horizontal terkurung di sini, bukan di body halaman. */}
      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <div className="flex gap-2">
          {BOARD_COLUMNS.map((col) => (
            <div
              key={col.title}
              className="min-w-[132px] flex-1 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50"
            >
              <p className="mb-2 flex items-baseline justify-between gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                <span className="truncate">{col.title}</span>
                <span className="tabular-nums text-slate-400">{col.count}</span>
              </p>

              {col.cards.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-200 py-3 text-center text-[10px] text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  Tidak ada item
                </p>
              ) : (
                col.cards.map((card) => (
                  <div
                    key={card.code}
                    className="rounded-md border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <p className="text-[9px] font-medium tabular-nums text-slate-400">{card.code}</p>
                    <p className="mt-0.5 text-[11px] font-semibold leading-snug text-slate-800 dark:text-slate-100">
                      {card.title}
                    </p>
                    {card.overdue && (
                      <span className="mt-1.5 inline-block rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-semibold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                        Terlambat
                      </span>
                    )}
                    <p className="mt-1.5 truncate text-[9px] text-slate-500 dark:text-slate-400">
                      {card.pic}
                    </p>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
        <MoveHorizontal className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
        Geser mendatar untuk kolom lainnya
      </p>
    </div>
  )
}

function CalendarView() {
  const byDay = new Map(CALENDAR_ITEMS.map((i) => [i.day, i]))

  return (
    <div className="min-w-0">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Tenggat Action Plan — Bulan Berjalan
      </p>

      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="grid grid-cols-7 gap-1">
          {DAY_LABELS.map((d) => (
            <p
              key={d}
              className="pb-1 text-center text-[9px] font-semibold uppercase tracking-wide text-slate-400"
            >
              {d}
            </p>
          ))}

          {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
            const item = byDay.get(day)
            return (
              <div
                key={day}
                className="min-h-[54px] min-w-0 rounded-md border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
              >
                <p className="text-[9px] tabular-nums text-slate-400">{day}</p>
                {item && (
                  <span
                    className={`mt-0.5 block truncate rounded px-1 py-0.5 text-[8px] font-semibold ${
                      item.overdue
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    }`}
                  >
                    {item.code}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
        Action Plan yang sama dengan tab Board — satu data, banyak sudut pandang.
      </p>
    </div>
  )
}

function ReportsView() {
  return (
    <div className="min-w-0 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Laporan Kinerja — Periode Berjalan
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {REPORT_METRICS.map((m) => (
          <div
            key={m.label}
            className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              {m.label}
            </p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">
              {m.value}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Penyelesaian Menurut Divisi
        </p>
        <div className="space-y-2.5">
          {REPORT_DIVISIONS.map((d) => (
            <div key={d.name} className="min-w-0">
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                  {d.name}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-slate-900 dark:text-white">
                  {d.pct}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${d.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

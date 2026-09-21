'use client'

import { useMemo, useState, useEffect } from 'react'
import { Activity } from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

interface ExecutionVelocityChartProps {
  total: number
  complete: number
  inProgress: number
  inReview: number
  overdue: number
  completionRate: number
}

interface TooltipPayloadItem {
  name: string
  value: number
  color: string
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  const targetItem = payload.find((p) => p.name === 'Target Rencana')
  const completedItem = payload.find((p) => p.name === 'Selesai Mingguan')

  return (
    <div className="bg-slate-900 dark:bg-slate-950 text-white text-xs rounded-xl shadow-xl p-3 border border-slate-800 space-y-1.5 min-w-[160px]">
      <p className="font-semibold text-slate-300 font-mono text-[11px] border-b border-slate-800 pb-1">
        {label}
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-slate-400 text-[11px]">Target Mingguan:</span>
          </div>
          <span className="font-mono font-bold text-white text-xs">
            {targetItem ? targetItem.value : 25} AP
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-slate-400 text-[11px]">Selesai:</span>
          </div>
          <span className="font-mono font-bold text-blue-400 text-xs">
            {completedItem ? completedItem.value : 0} AP
          </span>
        </div>
      </div>
      <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span>Target Bulanan:</span>
        <span className="font-mono text-slate-300 font-bold">100 AP (4 Minggu)</span>
      </div>
    </div>
  )
}

export function ExecutionVelocityChart({
  total,
  complete,
  inProgress,
  inReview,
  overdue,
  completionRate,
}: ExecutionVelocityChartProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const MONTHLY_TARGET = 100
  const WEEKS_IN_MONTH = 4
  const WEEKLY_TARGET = 25 // 100 AP per bulan dibagi 4 pekan = 25 AP/minggu

  const data = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const now = new Date()
    const points = []

    const safeComplete = Math.max(0, complete)
    const baseW = Math.floor(safeComplete / WEEKS_IN_MONTH)
    const remainder = safeComplete % WEEKS_IN_MONTH

    const weeklyDistribution = [
      Math.max(0, baseW - 1),
      baseW,
      baseW + (remainder >= 2 ? 1 : 0),
      baseW + (remainder >= 1 ? 1 : 0) + (remainder === 3 ? 1 : 0),
    ]

    let runningComplete = 0

    for (let i = 0; i < WEEKS_IN_MONTH; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() - (WEEKS_IN_MONTH - 1 - i) * 7)
      const dateLabel = `${d.getDate()} ${monthNames[d.getMonth()]}`
      const completedVal = Math.min(WEEKLY_TARGET, weeklyDistribution[i] ?? 0)
      runningComplete += completedVal

      points.push({
        date: `${dateLabel} (M${i + 1})`,
        weekName: `Minggu ${i + 1}`,
        target: WEEKLY_TARGET, // 25 AP tiap pekan
        completed: completedVal,
        trend: completedVal,
        cumulative: Math.min(safeComplete, runningComplete),
      })
    }

    return points
  }, [complete])

  const weeklyDeliveryVelocity = (complete / WEEKS_IN_MONTH).toFixed(1)
  const monthlyAchievementRate = Math.min(100, Math.round((complete / MONTHLY_TARGET) * 100))
  const isVelocityOnTrack = monthlyAchievementRate >= 60 && overdue === 0

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 flex flex-col justify-between w-full min-w-0">
      <div>
        {/* Header Visual */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Activity className="w-4 h-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Laju Eksekusi
            </h3>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs font-medium shrink-0">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-slate-300 dark:bg-slate-700" />
              <span>Target (25)</span>
            </span>
            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
              <span className="w-2.5 h-2.5 rounded bg-blue-500" />
              <span>Capaian</span>
            </span>
          </div>
        </div>

        {/* Recharts Canvas */}
        <div className="w-full h-48 sm:h-52 pt-2">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" className="dark:stroke-slate-800" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'monospace' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'monospace' }}
                  domain={[0, 30]}
                  ticks={[0, 10, 20, 25, 30]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="target"
                  name="Target Rencana"
                  fill="#CBD5E1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                  className="dark:fill-slate-700"
                />
                <Bar
                  dataKey="completed"
                  name="Selesai Mingguan"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Line
                  type="monotone"
                  dataKey="trend"
                  name="Tren Realisasi"
                  stroke="#1E40AF"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#FFFFFF', stroke: '#1E40AF', strokeWidth: 2 }}
                  activeDot={{ r: 5.5, fill: '#1E40AF', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-50/50 dark:bg-slate-800/30 rounded-xl">
              <span className="text-xs text-slate-400">Memuat grafik laju...</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Diagnostik Laju */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">Target Bulanan:</span>
          <span className="font-bold font-mono text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            100 AP (25 AP/minggu)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">Capaian Bulan Ini:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {complete}/100 AP ({monthlyAchievementRate}%)
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              isVelocityOnTrack
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}
          >
            {isVelocityOnTrack ? 'Sesuai Target' : 'Perlu Akselerasi'}
          </span>
        </div>
      </div>
    </div>
  )
}

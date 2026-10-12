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
    <div className="bg-popover text-popover-foreground text-xs border border-border shadow-md rounded-lg p-3 space-y-1.5 min-w-[160px]">
      <p className="font-semibold text-foreground font-mono text-[11px] border-b border-border pb-1">
        {label}
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
            <span className="text-muted-foreground text-[11px]">Target Mingguan:</span>
          </div>
          <span className="font-mono font-bold text-foreground text-xs">
            {targetItem ? targetItem.value : 25} AP
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-chart-1/55" />
            <span className="text-muted-foreground text-[11px]">Selesai:</span>
          </div>
          <span className="font-mono font-bold text-foreground text-xs">
            {completedItem ? completedItem.value : 0} AP
          </span>
        </div>
      </div>
      <div className="pt-1.5 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between">
        <span>Target Bulanan:</span>
        <span className="font-mono text-foreground font-bold">100 AP (4 Minggu)</span>
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
    <div className="bg-card rounded-lg border border-border shadow-sm dark:shadow-none p-5 sm:p-6 flex flex-col justify-between w-full min-w-0">
      <div>
        {/* Header Visual */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-muted text-fg-secondary">
              <Activity className="w-4 h-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Laju Eksekusi
            </h3>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs font-medium shrink-0">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/30" />
              <span>Target (25)</span>
            </span>
            <span className="flex items-center gap-1.5 text-fg-secondary font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-chart-1/55" />
              <span>Capaian</span>
            </span>
          </div>
        </div>

        {/* Recharts Canvas */}
        <div className="w-full h-48 sm:h-52 pt-2">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono), ui-monospace, monospace' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-mono), ui-monospace, monospace' }}
                  domain={[0, 30]}
                  ticks={[0, 10, 20, 25, 30]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="target"
                  name="Target Rencana"
                  fill="hsl(var(--muted-foreground) / 0.3)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="completed"
                  name="Selesai Mingguan"
                  fill="hsl(var(--chart-1) / 0.55)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Line
                  type="monotone"
                  dataKey="trend"
                  name="Tren Realisasi"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: 'hsl(var(--card))', stroke: 'hsl(var(--chart-1))', strokeWidth: 2 }}
                  activeDot={{ r: 5.5, fill: 'hsl(var(--chart-1))', stroke: 'hsl(var(--card))', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/50 rounded-lg">
              <span className="text-xs text-muted-foreground">Memuat grafik laju...</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Diagnostik Laju */}
      <div className="mt-4 pt-3.5 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Target Bulanan:</span>
          <span className="font-bold font-mono text-foreground bg-muted px-2 py-0.5 rounded-sm">
            100 AP (25 AP/minggu)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Capaian Bulan Ini:</span>
          <span className="font-semibold text-fg-secondary">
            {complete}/100 AP ({monthlyAchievementRate}%)
          </span>
          <span
            className={`px-2 py-0.5 rounded-sm text-[11px] font-bold ${
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

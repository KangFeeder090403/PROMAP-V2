'use client'

import { useEffect, useState } from 'react'
import { DonutChart } from '@/components/charts/DonutChart'
import { BarChart } from '@/components/charts/BarChart'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import type { DashboardResponse } from '@/lib/types/dashboard'

function titleCase(s: string) {
  return s[0] + s.slice(1).toLowerCase()
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Gagal memuat data')
      setData(await res.json())
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
        <p className="text-sm text-slate-700">Gagal memuat data dashboard</p>
        <button
          onClick={fetchData}
          className="mt-3 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          Coba lagi
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Total Tugas" value={data.metrics.total} />
        <MetricCard label="Selesai" value={data.metrics.complete} />
        <MetricCard label="In Progress" value={data.metrics.inProgress} />
        <MetricCard label="Overdue" value={data.metrics.overdue} variant="danger" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <p className="text-sm font-medium text-slate-800 mb-4">Distribusi Status Action Plan</p>
          <DonutChart data={data.statusBreakdown} />
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <p className="text-sm font-medium text-slate-800 mb-4">Distribusi Prioritas</p>
          <BarChart
            data={data.priorityBreakdown.map((p) => ({ label: titleCase(p.priority), value: p.count }))}
            colorByLabel={{ High: '#EF4444', Medium: '#F59E0B', Low: '#94A3B8' }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
        <p className="text-sm font-medium text-slate-800 mb-4">Produktivitas PIC (Completion Rate)</p>
        <BarChart
          data={data.picProductivity.map((p) => ({ label: p.picName, value: Math.round(p.completionRate) }))}
          barColor="#3B82F6"
          maxValue={100}
          valueSuffix="%"
        />
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Role } from '@/lib/generated/prisma/client'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AP_STATUS_STYLE, AP_STATUS_LABEL, AP_PRIORITY_STYLE, AP_PRIORITY_LABEL } from '@/lib/status-labels'
import { ActionPlanFormModal } from '@/components/action-plans/ActionPlanFormModal'
import { ActionPlanDetail } from '@/components/action-plans/ActionPlanDetail'

export interface ActionPlan {
  id: string
  taskId: string | null
  picId: string
  divisionId: string | null
  companyId: string
  title: string
  outcomeKpi: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  status: string
  startDate: string
  endDate: string
  isPersonal: boolean
  evaluationNote: string | null
  evidenceLink: string | null
  reviewNote: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_FILTERS = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'PENDING_APPROVAL',
  'EVIDENCE_REQUIRED',
  'REJECTED',
  'OVERDUE',
  'COMPLETE',
] as const

const PRIORITY_FILTERS = ['HIGH', 'MEDIUM', 'LOW'] as const

export function ActionPlansClient({
  role,
  userId,
  openCreate,
}: {
  role: Role
  userId: string
  openCreate?: boolean
}) {
  const router = useRouter()
  const [data, setData] = useState<ActionPlan[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ActionPlan | null>(null)
  const [selected, setSelected] = useState<ActionPlan | null>(null)

  useEffect(() => {
    fetchData()
  }, [statusFilter, priorityFilter])

  // Header "+ New > Action Plan" mengarah ke /action-plans?new=1. Buka modal,
  // lalu bersihkan param pakai replace supaya back/refresh tidak membukanya lagi.
  useEffect(() => {
    if (!openCreate) return
    setEditing(null)
    setFormOpen(true)
    // ponytail: pathname literal — cukup selama route ini statis.
    // Kalau /action-plans jadi dinamis, ganti ke usePathname().
    router.replace('/action-plans', { scroll: false })
  }, [openCreate])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const qs = new URLSearchParams()
      if (statusFilter) qs.set('status', statusFilter)
      if (priorityFilter) qs.set('priority', priorityFilter)
      const res = await fetch(`/api/action-plans${qs.toString() ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error('Gagal memuat data')
      const list: ActionPlan[] = await res.json()
      setData(list)
      // Refresh detail panel data kalau AP yang sedang dibuka berubah
      setSelected((prev) => (prev ? list.find((a) => a.id === prev.id) ?? null : prev))
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !data) return <div className="text-sm text-slate-500">Memuat...</div>

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
        <p className="text-sm text-slate-700">{error}</p>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Semua Status</option>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{AP_STATUS_LABEL[s]}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Semua Prioritas</option>
            {PRIORITY_FILTERS.map((p) => (
              <option key={p} value={p}>{AP_PRIORITY_LABEL[p]}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
        >
          Action Plan Baru
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {data.length === 0 ? (
          <p className="text-sm text-slate-500 p-5">Belum ada Action Plan</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                <th className="px-5 py-3">Judul</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Prioritas</th>
                <th className="px-5 py-3">PIC</th>
                <th className="px-5 py-3">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {data.map((ap) => (
                <tr
                  key={ap.id}
                  onClick={() => setSelected(ap)}
                  className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-5 py-3 text-slate-800">{ap.title}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={ap.status} styleMap={AP_STATUS_STYLE} labelMap={AP_STATUS_LABEL} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={ap.priority} styleMap={AP_PRIORITY_STYLE} labelMap={AP_PRIORITY_LABEL} />
                  </td>
                  <td className="px-5 py-3 text-slate-600">{ap.picId === userId ? 'Anda' : ap.picId}</td>
                  <td className="px-5 py-3 text-slate-500">
                    {new Date(ap.endDate).toLocaleDateString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ActionPlanFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        actionPlan={editing}
        onSuccess={() => {
          setFormOpen(false)
          fetchData()
        }}
      />

      <ActionPlanDetail
        actionPlan={selected}
        role={role}
        userId={userId}
        onOpenChange={(open) => !open && setSelected(null)}
        onChanged={() => {
          fetchData()
          setSelected(null)
        }}
        onEdit={() => {
          if (!selected) return
          setEditing(selected)
          setFormOpen(true)
        }}
      />
    </div>
  )
}

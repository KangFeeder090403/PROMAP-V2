'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Role } from '@/lib/generated/prisma/client'
import { ProjectForm } from '@/components/projects/ProjectForm'

export interface Project {
  id: string
  name: string
  description: string | null
  companyId: string
  divisionId: string | null
  isActive: boolean
  startDate: string | null
  endDate: string | null
  createdAt: string
}

const CAN_MANAGE: Role[] = ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER']

export function ProjectsClient({ role }: { role: Role }) {
  const router = useRouter()
  const [data, setData] = useState<Project[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)

  const canManage = CAN_MANAGE.includes(role)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/projects')
      if (!res.ok) throw new Error('Gagal memuat data')
      setData(await res.json())
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
      <div className="flex items-center justify-end">
        {canManage && (
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
          >
            Project Baru
          </button>
        )}
      </div>

      {data.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <p className="text-sm text-slate-500">Belum ada project</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/kanban?projectId=${p.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && router.push(`/kanban?projectId=${p.id}`)}
              className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[15px] font-medium text-slate-800">{p.name}</h3>
                {!p.isActive && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                    Nonaktif
                  </span>
                )}
              </div>
              {p.description && (
                <p className="mt-1.5 text-sm text-slate-500 line-clamp-2">{p.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>
                  {p.startDate ? new Date(p.startDate).toLocaleDateString('id-ID') : '—'}
                  {' – '}
                  {p.endDate ? new Date(p.endDate).toLocaleDateString('id-ID') : '—'}
                </span>
                {canManage && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditing(p)
                      setFormOpen(true)
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <ProjectForm
          open={formOpen}
          onOpenChange={setFormOpen}
          project={editing}
          role={role}
          onSuccess={() => {
            setFormOpen(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}

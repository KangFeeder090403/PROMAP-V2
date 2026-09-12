'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { AlertCircle, Calendar, CheckCircle2, Clock, HelpCircle, Loader2, Plus, Sparkles } from 'lucide-react'
import type { Role } from '@/lib/generated/prisma/client'
import { parseBulkActionPlans } from '@/lib/bulk-parser'
import { AP_PRIORITY_LABEL, AP_PRIORITY_STYLE } from '@/lib/status-labels'

interface BulkCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (count: number) => void
  currentUserId: string
  userRole: Role
  defaultTaskId?: string | null
  defaultPicId?: string | null
}

interface PickUser {
  id: string
  name: string
  role: string
  status: string
  divisionId: string | null
}

interface PickTask {
  id: string
  title: string
  projectId: string
}

const SELECT_CLASS =
  'h-9 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

export function BulkCreateModal({
  open,
  onOpenChange,
  onSuccess,
  currentUserId,
  userRole,
  defaultTaskId,
  defaultPicId,
}: BulkCreateModalProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [defaultPriority, setDefaultPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')
  const [defaultDays, setDefaultDays] = useState<number>(7)

  const [selectedTask, setSelectedTask] = useState<string>(defaultTaskId ?? 'personal')
  const [selectedPic, setSelectedPic] = useState<string>(defaultPicId ?? currentUserId)

  const [users, setUsers] = useState<PickUser[]>([])
  const [tasks, setTasks] = useState<PickTask[]>([])
  const [projectNames, setProjectNames] = useState<Record<string, string>>({})

  // Fetch picker options
  useEffect(() => {
    if (!open) return

    Promise.all([
      fetch('/api/users?status=ACTIVE')
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch('/api/tasks')
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch('/api/projects')
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ]).then(([u, t, p]) => {
      setUsers(Array.isArray(u) ? u : [])
      setTasks(Array.isArray(t) ? t : [])
      if (Array.isArray(p)) {
        const pMap: Record<string, string> = {}
        for (const prj of p) {
          if (prj?.id && prj?.name) pMap[prj.id] = prj.name
        }
        setProjectNames(pMap)
      }
    })
  }, [open])

  // Reset fields when opened
  useEffect(() => {
    if (open) {
      setText('')
      setError(null)
      setDefaultPriority('MEDIUM')
      setDefaultDays(7)
      setSelectedTask(defaultTaskId ?? 'personal')
      setSelectedPic(defaultPicId ?? currentUserId)
    }
  }, [open, defaultTaskId, defaultPicId, currentUserId])

  const parsedItems = useMemo(() => {
    return parseBulkActionPlans(text, { priority: defaultPriority, days: defaultDays })
  }, [text, defaultPriority, defaultDays])

  const validItems = parsedItems.filter((it) => it.isValid && it.title.length > 0)
  const canSubmit = validItems.length > 0 && validItems.length <= 50 && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    try {
      setLoading(true)
      setError(null)

      const isPersonal = selectedTask === 'personal'
      const taskId = isPersonal ? null : selectedTask
      const picId = isPersonal ? (selectedPic || currentUserId) : null

      const items = validItems.map((item) => ({
        title: item.title,
        outcomeKpi: item.title,
        priority: item.priority,
        endDate: item.deadlineDate.toISOString(),
        taskId,
        picId,
      }))

      const res = await fetch('/api/action-plans/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat action plans')
      }

      onOpenChange(false)
      onSuccess(data.count ?? validItems.length)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-6 sm:rounded-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Sparkles className="h-5 w-5" />
            <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Bulk Create Action Plans
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Tempel atau ketik daftar item (1 baris = 1 Action Plan). Maksimal 50 item per batch.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="shrink-0 flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 mt-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 space-y-3 mt-2">
          {/* Format Guideline */}
          <div className="shrink-0 flex items-start gap-2 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 p-2.5 text-xs text-blue-800 dark:text-blue-300">
            <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-medium">Panduan Format: </span>
              <code className="font-mono bg-blue-100/70 dark:bg-blue-900/50 px-1 py-0.5 rounded text-[11px]">
                [Judul], [Prioritas: LOW | Medium | High], [Deadline/Durasi: 7 hari / 2026-09-30]
              </code>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                Pemisah mendukung koma (<code>,</code>), titik koma (<code>;</code>), atau pipa (<code>|</code>). Prioritas dan deadline bersifat opsional (mengikuti kontrol default fallback).
              </p>
            </div>
          </div>

          {/* Fallback Defaults Controls */}
          <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                Default Prioritas
              </Label>
              <select
                value={defaultPriority}
                onChange={(e) => setDefaultPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                className={SELECT_CLASS}
              >
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Default Durasi
              </Label>
              <select
                value={defaultDays}
                onChange={(e) => setDefaultDays(Number(e.target.value))}
                className={SELECT_CLASS}
              >
                <option value={3}>3 Hari</option>
                <option value={7}>7 Hari</option>
                <option value={14}>14 Hari</option>
                <option value={30}>30 Hari</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="bulk-task" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                Task / Project
              </Label>
              <select
                id="bulk-task"
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="personal">Tanpa Task (Personal AP)</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} {projectNames[t.projectId] ? `(${projectNames[t.projectId]})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="bulk-pic" className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                PIC Assignee
              </Label>
              {selectedTask !== 'personal' ? (
                <div className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/80 px-2 flex items-center text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Ikut PIC Task
                </div>
              ) : userRole === 'PIC' ? (
                <div className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3 flex items-center text-xs text-slate-600 dark:text-slate-300">
                  Diri Sendiri
                </div>
              ) : (
                <select
                  id="bulk-pic"
                  value={selectedPic}
                  onChange={(e) => setSelectedPic(e.target.value)}
                  className={SELECT_CLASS}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.id === currentUserId ? '(Anda)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Textarea Input */}
          <div className="shrink-0 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <Label htmlFor="bulk-text" className="font-medium text-slate-700 dark:text-slate-300">
                Input Teks
              </Label>
              <span
                className={`font-mono text-xs ${
                  parsedItems.length > 50
                    ? 'text-red-600 dark:text-red-400 font-bold'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {parsedItems.length}/50 baris
              </span>
            </div>
            <textarea
              id="bulk-text"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Selesaikan draft MoU mitra, High, 3 hari\nKirim laporan mingguan ke finance, Low, 2026-09-30\nFollow-up perbaikan bug staging`}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-sans"
              autoFocus
            />
          </div>

          {/* Live Preview Interaktif */}
          <div className="flex-1 min-h-[140px] flex flex-col rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden">
            <div className="shrink-0 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100/60 dark:bg-slate-800/40">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Live Preview Deteksi ({validItems.length} valid)
              </span>
              {parsedItems.some((it) => !it.isValid) && (
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Ada baris perlu dicek
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/60">
              {parsedItems.length === 0 ? (
                <div className="h-full min-h-[100px] flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs gap-1 py-4">
                  <Sparkles className="h-5 w-5 opacity-40" />
                  <span>Ketik atau tempel teks di atas untuk melihat preview interaktif.</span>
                </div>
              ) : (
                parsedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`pt-1.5 first:pt-0 flex items-center justify-between gap-3 text-xs ${
                      !item.isValid ? 'opacity-60 bg-red-50/40 dark:bg-red-950/20 p-1.5 rounded' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 w-5 shrink-0 text-right">
                        {idx + 1}.
                      </span>
                      <span className="truncate font-medium text-slate-800 dark:text-slate-200" title={item.title || item.raw}>
                        {item.title || <span className="italic text-red-500">Judul kosong</span>}
                      </span>
                      {item.error && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded shrink-0">
                          {item.error}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          AP_PRIORITY_STYLE[item.priority]
                        }`}
                      >
                        {AP_PRIORITY_LABEL[item.priority] ?? item.priority}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {item.deadlineDisplay}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dialog Action Buttons */}
          <div className="shrink-0 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {validItems.length > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Siap submit {validItems.length} item
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-9 px-4 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Buat {validItems.length > 0 ? `${validItems.length} Action Plan` : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

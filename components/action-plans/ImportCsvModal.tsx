'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Calendar,
  UserCheck,
  Briefcase,
  X,
} from 'lucide-react'
import type { Role } from '@/lib/generated/prisma/client'
import {
  parseActionPlanCsv,
  generateActionPlanTemplateCsv,
  type ActionPlanCsvRow,
  type ParseCsvResult,
} from '@/lib/csv-action-plan'
import { AP_PRIORITY_STYLE, AP_PRIORITY_LABEL } from '@/lib/status-labels'

interface ImportCsvModalProps {
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
  email: string
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

export function ImportCsvModal({
  open,
  onOpenChange,
  onSuccess,
  currentUserId,
  userRole,
  defaultTaskId,
  defaultPicId,
}: ImportCsvModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [csvResult, setCsvResult] = useState<ParseCsvResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedTask, setSelectedTask] = useState<string>(defaultTaskId ?? 'personal')
  const [selectedPic, setSelectedPic] = useState<string>(defaultPicId ?? currentUserId)

  const [users, setUsers] = useState<PickUser[]>([])
  const [tasks, setTasks] = useState<PickTask[]>([])
  const [projectNames, setProjectNames] = useState<Record<string, string>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch dropdown options saat modal dibuka
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

  // Reset state saat modal dibuka
  useEffect(() => {
    if (open) {
      setFile(null)
      setCsvResult(null)
      setError(null)
      setSelectedTask(defaultTaskId ?? 'personal')
      setSelectedPic(defaultPicId ?? currentUserId)
    }
  }, [open, defaultTaskId, defaultPicId, currentUserId])

  // Handler download template CSV
  const handleDownloadTemplate = () => {
    const csvContent = generateActionPlanTemplateCsv()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'template-action-plan-6hari-24ap.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Handler proses file CSV
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    processFile(selected)
  }

  const processFile = (fileToProcess: File) => {
    setFile(fileToProcess)
    setError(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) {
        setError('File CSV kosong atau tidak dapat dibaca')
        setCsvResult(null)
        return
      }

      const result = parseActionPlanCsv(text)
      setCsvResult(result)

      if (result.generalError) {
        setError(result.generalError)
      }
    }
    reader.onerror = () => {
      setError('Gagal membaca file')
      setCsvResult(null)
    }
    reader.readAsText(fileToProcess)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      if (!droppedFile.name.endsWith('.csv')) {
        setError('Hanya file format .csv yang didukung')
        return
      }
      processFile(droppedFile)
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setCsvResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const canSubmit =
    Boolean(csvResult && csvResult.rows.length > 0 && !csvResult.exceedsLimit && csvResult.totalValid > 0) &&
    !loading

  // Submit ke backend
  const handleSubmit = async () => {
    if (!csvResult || !canSubmit) return

    try {
      setLoading(true)
      setError(null)

      const validItems = csvResult.rows
        .filter((r) => r.isValid)
        .map((r) => ({
          title: r.title,
          outcomeKpi: r.outcomeKpi,
          priority: r.priority,
          startDate: r.startDate,
          endDate: r.endDate,
          picEmail: r.picEmail,
        }))

      const res = await fetch('/api/action-plans/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask === 'personal' ? null : selectedTask,
          defaultPicId: selectedPic,
          items: validItems,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Gagal mengimpor Action Plan')
      }

      onOpenChange(false)
      onSuccess(json.count ?? validItems.length)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat mengimpor data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-6 sm:rounded-xl max-h-[92vh] flex flex-col">
        {/* Header Enterprise */}
        <DialogHeader className="shrink-0 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400">
            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
                Import Action Plan dari CSV
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Impor rencana kerja mingguan (maksimal 6 hari kerja × 4 tugas = 24 Action Plan per batch).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Template Banner */}
        <div className="shrink-0 mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Template CSV Siap Pakai (24 Baris / 6 Hari Kerja)
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Format kolom: <code>title, outcomeKpi, priority, startDate, endDate, picEmail</code>
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors shrink-0 shadow-sm"
          >
            <Download className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            Unduh Template CSV
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="shrink-0 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 mt-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Body Area */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 mt-2 pr-1">
          {/* File Upload Area */}
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                <UploadCloud className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 text-center">
                Tarik file CSV ke sini atau <span className="text-blue-600 dark:text-blue-400 underline">pilih file</span>
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Format .csv (maksimal 24 Action Plan)
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors p-1"
                title="Ganti file CSV"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Konfigurasi Penugasan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div>
              <Label className="text-[11px] text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5 mb-1">
                <Briefcase className="h-3 w-3 text-slate-400" />
                Target Inisiatif / Proyek
              </Label>
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="personal">Personal Action Plan (Mandiri)</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {projectNames[t.projectId] ? `[${projectNames[t.projectId]}] ` : ''}
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-[11px] text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5 mb-1">
                <UserCheck className="h-3 w-3 text-slate-400" />
                PIC Default (Jika Email CSV Kosong)
              </Label>
              <select
                value={selectedPic}
                onChange={(e) => setSelectedPic(e.target.value)}
                className={SELECT_CLASS}
                disabled={userRole === 'PIC'}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pratinjau Data CSV */}
          {csvResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Pratinjau Data Action Plan ({csvResult.rows.length} Baris)
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
                      csvResult.exceedsLimit
                        ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    }`}
                  >
                    {csvResult.rows.length} / 24 Item
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium">
                    <CheckCircle2 className="h-3 w-3" /> {csvResult.totalValid} Siap
                  </span>
                  {csvResult.totalErrors > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 font-medium">
                      <AlertCircle className="h-3 w-3" /> {csvResult.totalErrors} Error
                    </span>
                  )}
                </div>
              </div>

              {csvResult.exceedsLimit && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <strong>Batas kuota terlampaui!</strong> File CSV ini memuat {csvResult.rows.length} Action Plan. Batas maksimal import adalah <strong>24 Action Plan per batch</strong> (6 hari kerja × 4 AP/hari). Silakan kurangi baris data atau bagi ke pekan berikutnya.
                  </div>
                </div>
              )}

              {/* Tabel Pratinjau */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-2.5 w-10 text-center font-semibold border-b border-slate-200 dark:border-slate-700">
                        #
                      </th>
                      <th className="py-2 px-2.5 w-24 text-center font-semibold border-b border-slate-200 dark:border-slate-700">
                        Tanggal
                      </th>
                      <th className="py-2 px-2.5 font-semibold border-b border-slate-200 dark:border-slate-700">
                        Judul Action Plan
                      </th>
                      <th className="py-2 px-2.5 font-semibold border-b border-slate-200 dark:border-slate-700">
                        Outcome / KPI
                      </th>
                      <th className="py-2 px-2 w-16 text-center font-semibold border-b border-slate-200 dark:border-slate-700">
                        Prioritas
                      </th>
                      <th className="py-2 px-2 w-20 text-center font-semibold border-b border-slate-200 dark:border-slate-700">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {csvResult.rows.map((row) => (
                      <tr
                        key={row.index}
                        className={`${
                          !row.isValid
                            ? 'bg-red-50/60 dark:bg-red-950/20'
                            : row.index % 2 === 0
                              ? 'bg-slate-50/40 dark:bg-slate-900/40'
                              : ''
                        }`}
                      >
                        <td className="py-2 px-2.5 text-center font-mono text-[11px] text-slate-500">
                          {row.index}
                        </td>
                        <td className="py-2 px-2.5 text-center text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {row.startDate}
                        </td>
                        <td className="py-2 px-2.5 text-slate-800 dark:text-slate-200 font-medium">
                          {row.title || <span className="text-red-500 italic">Kosong</span>}
                          {row.error && (
                            <p className="text-[10px] text-red-500 mt-0.5">{row.error}</p>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-slate-600 dark:text-slate-400 truncate max-w-[180px]">
                          {row.outcomeKpi}
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              AP_PRIORITY_STYLE[row.priority]
                            }`}
                          >
                            {AP_PRIORITY_LABEL[row.priority] || row.priority}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="h-3 w-3" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 font-medium">
                              <AlertCircle className="h-3 w-3" /> Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Aksi */}
        <DialogFooter className="shrink-0 border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-row items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-9 px-4 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan ke Database…
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                Import &amp; Simpan ({csvResult?.totalValid ?? 0} AP)
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Style & label map untuk StatusBadge, per model. Tambah AP_STATUS_STYLE /
// AP_STATUS_LABEL di sini nanti — tidak perlu refactor komponen pemanggil.

export const PROPOSAL_STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SUBMITTED: 'bg-indigo-100 text-indigo-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

export const PROPOSAL_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Diajukan',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
}

// Semua 8 nilai enum ActionPlanStatus dipetakan untuk badge (termasuk APPROVED —
// dead code di action buttons tapi tetap perlu render kalau ada data legacy).
export const AP_STATUS_STYLE: Record<string, string> = {
  NOT_STARTED: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  PENDING_APPROVAL: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  EVIDENCE_REQUIRED: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  OVERDUE: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  COMPLETE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
}

export const AP_STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: 'Belum Mulai',
  IN_PROGRESS: 'Dikerjakan',
  PENDING_APPROVAL: 'Menunggu Review',
  EVIDENCE_REQUIRED: 'Bukti Tambahan',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  OVERDUE: 'Terlambat',
  COMPLETE: 'Selesai',
}

// Aksen warna per status — bar vertikal di kolom "Title & ID" dan dot kecil.
export const AP_STATUS_DOT: Record<string, string> = {
  NOT_STARTED: 'bg-slate-400',
  IN_PROGRESS: 'bg-blue-500',
  PENDING_APPROVAL: 'bg-indigo-500',
  EVIDENCE_REQUIRED: 'bg-amber-500',
  APPROVED: 'bg-green-500',
  REJECTED: 'bg-red-500',
  OVERDUE: 'bg-orange-500',
  COMPLETE: 'bg-emerald-500',
}

export const AP_PRIORITY_STYLE: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
}

export const AP_PRIORITY_LABEL: Record<string, string> = {
  HIGH: 'Tinggi',
  MEDIUM: 'Sedang',
  LOW: 'Rendah',
}

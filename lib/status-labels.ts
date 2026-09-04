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
  NOT_STARTED: 'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  PENDING_APPROVAL: 'bg-indigo-100 text-indigo-700',
  EVIDENCE_REQUIRED: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  OVERDUE: 'bg-orange-100 text-orange-700',
  COMPLETE: 'bg-emerald-100 text-emerald-700',
}

export const AP_STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: 'Belum Mulai',
  IN_PROGRESS: 'Dikerjakan',
  PENDING_APPROVAL: 'Menunggu Review',
  EVIDENCE_REQUIRED: 'Butuh Bukti Tambahan',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  OVERDUE: 'Terlambat',
  COMPLETE: 'Selesai',
}

export const AP_PRIORITY_STYLE: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-slate-100 text-slate-600',
}

export const AP_PRIORITY_LABEL: Record<string, string> = {
  HIGH: 'Tinggi',
  MEDIUM: 'Sedang',
  LOW: 'Rendah',
}

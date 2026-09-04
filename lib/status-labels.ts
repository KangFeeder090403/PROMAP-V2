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

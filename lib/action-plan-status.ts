import type { ActionPlanStatus, Role } from '@/lib/generated/prisma/client'

// APPROVED sengaja dead node — bukan status istirahat (PRD BAB 3.6: Kanban cuma 5 kolom,
// tidak ada kolom Approved). Manager approve -> status langsung COMPLETE.
// Enum Prisma tetap punya APPROVED (tidak di-drop, hindari breaking migration), hanya
// unreachable di logic map ini.
export const STATUS_TRANSITIONS: Record<ActionPlanStatus, ActionPlanStatus[]> = {
  NOT_STARTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['PENDING_APPROVAL', 'OVERDUE'],
  PENDING_APPROVAL: ['COMPLETE', 'REJECTED', 'EVIDENCE_REQUIRED'],
  EVIDENCE_REQUIRED: ['PENDING_APPROVAL'],
  REJECTED: ['IN_PROGRESS'],
  OVERDUE: ['IN_PROGRESS', 'PENDING_APPROVAL'],
  APPROVED: [],
  COMPLETE: [],
}

export function canTransition(from: ActionPlanStatus, to: ActionPlanStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export type KanbanColumnKey = 'NOT_STARTED' | 'IN_PROGRESS' | 'REVIEW' | 'NEEDS_REVISION' | 'DONE'

// 5 kolom sesuai PRD §B7 (mapping 8 status bisnis). OVERDUE bukan kolom sendiri —
// selalu ikut kolom "Dikerjakan" (satu-satunya aksi keluar dari OVERDUE adalah
// /start, sama seperti IN_PROGRESS) dan tampil sebagai badge merah di kartu.
export const KANBAN_COLUMNS: { key: KanbanColumnKey; title: string; statuses: string[] }[] = [
  { key: 'NOT_STARTED', title: 'Belum Mulai', statuses: ['NOT_STARTED'] },
  { key: 'IN_PROGRESS', title: 'Dikerjakan', statuses: ['IN_PROGRESS', 'OVERDUE'] },
  { key: 'REVIEW', title: 'Review', statuses: ['PENDING_APPROVAL', 'EVIDENCE_REQUIRED'] },
  { key: 'NEEDS_REVISION', title: 'Perlu Revisi', statuses: ['REJECTED'] },
  { key: 'DONE', title: 'Selesai', statuses: ['APPROVED', 'COMPLETE'] },
]

export function columnForStatus(status: string): KanbanColumnKey {
  return KANBAN_COLUMNS.find((c) => c.statuses.includes(status))?.key ?? 'NOT_STARTED'
}

export type KanbanDropAction =
  | { kind: 'start' }
  | { kind: 'complete' }
  | { kind: 'review-complete' }
  | { kind: 'needs-note' }

type KanbanDropApInput = {
  status: string
  picId: string
  divisionId: string | null
  isPersonal: boolean
  taskId: string | null
}

/**
 * Menentukan aksi backend yang dipicu saat kartu di-drag ke kolom lain.
 * Endpoint status AP (start/submit/review/complete) yang jadi sumber kebenaran —
 * PATCH /api/action-plans/[id] sengaja mengabaikan body.status. Transisi yang
 * butuh catatan wajib (submit -> evaluationNote, review tolak -> reviewNote)
 * TIDAK dieksekusi langsung dari drag; caller diarahkan buka drawer detail.
 * null = transisi ditolak sepenuhnya (beda role/kepemilikan/status), tampilkan toast.
 */
export function resolveKanbanDrop(
  ap: KanbanDropApInput,
  targetColumn: KanbanColumnKey,
  user: { id: string; role: Role; divisionId?: string | null }
): KanbanDropAction | null {
  if (targetColumn === columnForStatus(ap.status)) return null

  const isOwner = ap.picId === user.id
  const isPersonal = ap.isPersonal || !ap.taskId
  // Sama seperti ActionPlanDetail.tsx (client, tidak boleh impor lib/rbac.ts server-only).
  const canReview =
    !isOwner &&
    ap.status === 'PENDING_APPROVAL' &&
    (user.role === 'SUPER_ADMIN' ||
      user.role === 'ADMIN_OPERATIONAL' ||
      (user.role === 'MANAGER' &&
        user.divisionId !== null &&
        user.divisionId !== undefined &&
        user.divisionId === ap.divisionId))

  if (targetColumn === 'IN_PROGRESS') {
    if (isOwner && ['NOT_STARTED', 'REJECTED', 'OVERDUE'].includes(ap.status)) return { kind: 'start' }
    return null
  }
  if (targetColumn === 'REVIEW') {
    if (!isPersonal && isOwner && ['IN_PROGRESS', 'EVIDENCE_REQUIRED'].includes(ap.status)) {
      return { kind: 'needs-note' }
    }
    return null
  }
  if (targetColumn === 'NEEDS_REVISION') {
    return canReview ? { kind: 'needs-note' } : null
  }
  if (targetColumn === 'DONE') {
    if (
      isPersonal &&
      isOwner &&
      ['NOT_STARTED', 'IN_PROGRESS', 'EVIDENCE_REQUIRED', 'REJECTED', 'OVERDUE'].includes(ap.status)
    ) {
      return { kind: 'complete' }
    }
    if (!isPersonal && canReview) return { kind: 'review-complete' }
    return null
  }
  return null
}

/** Kartu boleh di-drag kalau ada minimal satu kolom tujuan yang valid untuk user ini. */
export function canDragKanbanCard(
  ap: KanbanDropApInput,
  user: { id: string; role: Role; divisionId?: string | null }
): boolean {
  return KANBAN_COLUMNS.some((c) => resolveKanbanDrop(ap, c.key, user) !== null)
}

const EARLY_AP_STATUSES = ['NOT_STARTED', 'IN_PROGRESS']

/**
 * Siapa boleh hapus (soft delete) AP. Client-safe (lib/rbac.ts impor next-auth).
 * SA/Admin Ops: status apa pun. Lainnya hanya selagi NOT_STARTED/IN_PROGRESS:
 * Manager divisi sendiri, PIC AP milik sendiri. Gate company tetap di route.
 */
export function canDeleteAP(
  user: { id: string; role: Role; divisionId?: string | null },
  ap: { picId: string; divisionId: string | null; status: string }
): boolean {
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_OPERATIONAL') return true
  if (!EARLY_AP_STATUSES.includes(ap.status)) return false
  if (user.role === 'MANAGER') return !!user.divisionId && user.divisionId === ap.divisionId
  if (user.role === 'PIC') return ap.picId === user.id
  return false
}

import type { ActionPlanStatus, ProposalStatus, Priority } from '@/lib/generated/prisma/client'

/** Satu Action Plan yang jadi tanggung jawab user saat ini (PIC). */
export interface MyWorkItem {
  id: string
  refCode: string
  title: string
  status: ActionPlanStatus
  priority: Priority
  endDate: string
  updatedAt: string
  reviewNote?: string | null
  checklistTotal: number
  checklistDone: number
  taskTitle?: string | null
  projectName?: string | null
  /** Tautan bukti kerja audit. */
  evidenceLink?: string | null
  /** Nama reviewer (Manager divisi) — hanya relevan saat status PENDING_APPROVAL. */
  reviewerName?: string | null
}

/** Proposal DRAFT milik user — butuh aksi "Submit". */
export interface MyWorkProposal {
  id: string
  refCode: string
  title: string
  status: ProposalStatus
  createdAt: string
}

export interface MyWorkApiResponse {
  user: {
    id: string
    name: string
    role: string
    companyName?: string | null
    divisionName?: string | null
  }
  actionPlans: MyWorkItem[]
  proposals: MyWorkProposal[]
  generatedAt: string
}
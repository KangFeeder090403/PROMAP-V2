import { z } from 'zod'

export const createProposalSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  description: z.string().min(1, 'Deskripsi wajib diisi'),
  status: z.enum(['DRAFT', 'SUBMITTED']).optional(),
})

export const reviewProposalSchema = z
  .object({
    action: z.enum(['APPROVE', 'REJECT']),
    reviewNote: z.string().optional(),
  })
  .refine((data) => data.action !== 'REJECT' || !!data.reviewNote?.trim(), {
    message: 'Catatan review wajib diisi saat menolak',
    path: ['reviewNote'],
  })

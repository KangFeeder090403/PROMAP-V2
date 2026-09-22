import { z } from 'zod'

export const createActionPlanSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  outcomeKpi: z.string().min(1, 'Outcome KPI wajib diisi'),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  startDate: z.string().min(1, 'Tanggal mulai wajib diisi'),
  endDate: z.string().min(1, 'Tanggal selesai wajib diisi'),
  taskId: z.string().optional().nullable(),
  picId: z.string().optional().nullable(),
})

// body.status TIDAK PERNAH dikirim — server selalu mengabaikannya (lihat [id]/route.ts)
export const updateActionPlanSchema = createActionPlanSchema
  .omit({ taskId: true, picId: true })
  .partial()

export const submitActionPlanSchema = z.object({
  evaluationNote: z.string().min(1, 'Evaluasi wajib diisi'),
  evidenceLink: z.string().url('Link tidak valid').optional().or(z.literal('')),
})

// APPROVED sengaja tidak ada di sini — dead code di backend, lihat lib/action-plan-status.ts
export const reviewActionPlanSchema = z
  .object({
    action: z.enum(['COMPLETE', 'REJECTED', 'EVIDENCE_REQUIRED']),
    reviewNote: z.string().optional(),
  })
  .refine((data) => data.action === 'COMPLETE' || !!data.reviewNote?.trim(), {
    message: 'Catatan review wajib diisi',
    path: ['reviewNote'],
  })

export const reassignActionPlanSchema = z.object({
  newPicId: z.string().min(1, 'PIC baru wajib dipilih'),
})

export const checklistItemSchema = z.object({
  title: z.string().min(1, 'Judul checklist wajib diisi').max(200, 'Maksimal 200 karakter'),
})

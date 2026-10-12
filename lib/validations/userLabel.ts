import { z } from 'zod'

export const createUserLabelSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(50, 'Maksimal 50 karakter'),
  companyId: z.string().optional(),
})

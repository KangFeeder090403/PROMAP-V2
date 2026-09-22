import { z } from 'zod'

export const createUserLabelSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  companyId: z.string().optional(),
})

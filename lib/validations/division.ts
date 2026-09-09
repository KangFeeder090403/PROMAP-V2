import { z } from 'zod'

export const createDivisionSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  description: z.string().optional(),
  companyId: z.string().min(1, 'Perusahaan wajib dipilih'),
})

export const updateDivisionSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  description: z.string().optional(),
})

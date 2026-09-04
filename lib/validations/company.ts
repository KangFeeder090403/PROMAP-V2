import { z } from 'zod'

const subscriptionEnum = z.enum(['BASIC', 'PREMIUM', 'ENTERPRISE'], {
  errorMap: () => ({ message: 'Subscription tidak valid' }),
})

const logoUrlField = z
  .union([z.string().url('URL logo tidak valid'), z.literal('')])
  .optional()

export const createCompanySchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  uniqueCode: z.string().min(1, 'Kode unik wajib diisi'),
  subscription: subscriptionEnum,
  logoUrl: logoUrlField,
  isActive: z.boolean(),
})

export const updateCompanySchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  logoUrl: logoUrlField,
  isActive: z.boolean(),
})

export const updateCompanySchemaSuperAdmin = updateCompanySchema.extend({
  subscription: subscriptionEnum,
  uniqueCode: z.string().min(1, 'Kode unik wajib diisi'),
})

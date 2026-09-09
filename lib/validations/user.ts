import { z } from 'zod'

const roleEnum = z.enum(['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER', 'PIC'], {
  errorMap: () => ({ message: 'Role tidak valid' }),
})

export const createUserSchema = z.object({
  email: z.string().email('Email tidak valid'),
  name: z.string().min(1, 'Nama wajib diisi'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  phone: z.string().optional(),
  role: roleEnum.optional(),
  companyId: z.string().optional(),
  divisionId: z.string().nullable().optional(),
  userLabelId: z.string().nullable().optional(),
  supervisorId: z.string().nullable().optional(),
})

// Backend PUT /api/users/[id] hanya menerima role, divisionId, userLabelId,
// supervisorId — JANGAN tambah field lain (email/password/name ditolak backend).
export const updateUserSchema = z.object({
  role: roleEnum.optional(),
  divisionId: z.string().nullable().optional(),
  userLabelId: z.string().nullable().optional(),
  supervisorId: z.string().nullable().optional(),
})

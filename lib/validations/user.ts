import { z } from 'zod'

const roleEnum = z.enum(['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER', 'PIC'], {
  errorMap: () => ({ message: 'Role tidak valid' }),
})

export const createUserSchema = z.object({
  email: z.string().email('Email tidak valid'),
  name: z.string().min(1, 'Nama wajib diisi'),
  // Opsional: kosong = akun SSO-only (password null di DB, masuk lewat Google).
  // Lantai 8 karakter mengikuti NIST SP 800-63B; backend menegakkan hal yang sama.
  password: z.string().min(8, 'Password minimal 8 karakter').optional().or(z.literal('')),
  phone: z.string().optional(),
  role: roleEnum.optional(),
  companyId: z.string().optional(),
  divisionId: z.string().nullable().optional(),
  userLabelId: z.string().nullable().optional(),
  supervisorId: z.string().nullable().optional(),
})

// Backend PUT /api/users/[id] menerima name, phone, role, divisionId,
// userLabelId, supervisorId.
export const updateUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').optional(),
  phone: z.string().optional(),
  role: roleEnum.optional(),
  divisionId: z.string().nullable().optional(),
  userLabelId: z.string().nullable().optional(),
  supervisorId: z.string().nullable().optional(),
})

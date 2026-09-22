import type { Prisma, Project, User } from '@/lib/generated/prisma/client'

/** Proposal sudah punya project — klaim atomik kalah balapan. */
export class ConflictError extends Error {
  constructor(message = 'Proposal ini sudah dikonversi menjadi Project') {
    super(message)
    this.name = 'ConflictError'
  }
}

/** Input tidak valid / tidak diizinkan. status menentukan HTTP code di route. */
export class ProjectInputError extends Error {
  constructor(message: string, public status: 400 | 403 = 400) {
    super(message)
    this.name = 'ProjectInputError'
  }
}

export type ProjectInput = {
  name: string
  description?: string | null
  companyId?: string | null
  divisionId?: string | null
  startDate?: Date | null
  endDate?: Date | null
  picIds?: string[]
}

export type CreatedProjectPic = {
  id: string
  name: string
  divisionId: string | null
}

/**
 * Klaim atomik Proposal -> Project. Hanya proposal yang projectId-nya masih
 * null yang bisa diikat, jadi dua request konkuren menghasilkan tepat satu
 * pemenang; sisanya ConflictError dan transaksinya di-rollback.
 */
export async function linkProposalToProject(
  tx: Prisma.TransactionClient,
  proposalId: string,
  projectId: string
) {
  const linked = await tx.proposal.updateMany({
    where: { id: proposalId, projectId: null },
    data: { projectId },
  })
  if (linked.count === 0) throw new ConflictError()
}

/**
 * Satu-satunya tempat aturan tenant + pembuatan Project beserta task starter-nya.
 * Dipakai POST /api/projects dan konversi Proposal → Project supaya aturan
 * scope tidak pernah tersalin dua tempat. Caller WAJIB sudah lolos
 * canManageProject(); helper ini mengurus resolve company/divisi, validasi PIC,
 * dan guard lintas divisi Manager.
 */
export async function createProjectWithTasks(
  tx: Prisma.TransactionClient,
  user: User,
  input: ProjectInput
): Promise<{ project: Project; pics: CreatedProjectPic[] }> {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name) {
    throw new ProjectInputError('Nama project wajib diisi', 400)
  }

  const startDate = input.startDate ?? null
  const endDate = input.endDate ?? null

  if ((startDate && isNaN(startDate.getTime())) || (endDate && isNaN(endDate.getTime()))) {
    throw new ProjectInputError('Format tanggal tidak valid', 400)
  }
  if (startDate && endDate && startDate > endDate) {
    throw new ProjectInputError(
      'Tanggal mulai tidak boleh lebih lambat dari tanggal target selesai',
      400
    )
  }

  let companyId: string
  let divisionId: string | null = null

  if (user.role === 'SUPER_ADMIN') {
    if (!input.companyId) {
      throw new ProjectInputError('companyId is required for SUPER_ADMIN', 400)
    }
    const company = await tx.company.findUnique({ where: { id: input.companyId } })
    if (!company || company.deletedAt) {
      throw new ProjectInputError('Invalid companyId', 400)
    }
    companyId = input.companyId

    if (input.divisionId) {
      const division = await tx.division.findUnique({ where: { id: input.divisionId } })
      if (!division || division.deletedAt || division.companyId !== companyId) {
        throw new ProjectInputError('Invalid divisionId', 400)
      }
      divisionId = input.divisionId
    }
  } else if (user.role === 'ADMIN_OPERATIONAL') {
    companyId = user.companyId!

    if (input.divisionId) {
      const division = await tx.division.findUnique({ where: { id: input.divisionId } })
      if (!division || division.deletedAt || division.companyId !== companyId) {
        throw new ProjectInputError('Invalid divisionId', 400)
      }
      divisionId = input.divisionId
    }
  } else {
    // MANAGER
    companyId = user.companyId!
    divisionId = user.divisionId
  }

  // PIC yang ditugaskan — divalidasi harus se-company & punya divisi, karena
  // Task.divisionId wajib. Divisi task diambil dari divisi PIC-nya sendiri
  // sehingga satu project bisa tampil lintas divisi tanpa ubah schema.
  const picIds: string[] = Array.isArray(input.picIds)
    ? ([...new Set(input.picIds.filter((id: unknown) => typeof id === 'string'))] as string[])
    : []

  const pics = picIds.length
    ? await tx.user.findMany({
        where: { id: { in: picIds }, companyId, deletedAt: null, status: 'ACTIVE' },
        select: { id: true, name: true, divisionId: true },
      })
    : []

  if (pics.length !== picIds.length || pics.some((p) => !p.divisionId)) {
    throw new ProjectInputError('PIC tidak valid atau belum punya divisi', 400)
  }

  // MANAGER hanya boleh menugaskan PIC di divisinya sendiri.
  if (user.role === 'MANAGER' && pics.some((p) => p.divisionId !== user.divisionId)) {
    throw new ProjectInputError('Manager hanya bisa menugaskan PIC di divisinya sendiri', 403)
  }

  const project = await tx.project.create({
    data: {
      name,
      description: input.description ?? null,
      companyId,
      divisionId,
      startDate,
      endDate,
      createdById: user.id,
    },
  })

  if (pics.length) {
    await tx.task.createMany({
      data: pics.map((p) => ({
        title: `Kontribusi ${p.name}`,
        description: `Task awal untuk ${p.name}. Ganti judul dan tambahkan Action Plan sesuai lingkup kerjanya.`,
        projectId: project.id,
        divisionId: p.divisionId!,
        picId: p.id,
        createdById: user.id,
        startDate,
        endDate,
      })),
    })
  }

  return { project, pics }
}

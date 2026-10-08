import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, canCreateAP } from '@/lib/rbac'
import { notify } from '@/lib/notifications'
import { logActivity } from '@/lib/activity-log'
import { isHttpUrl } from '@/lib/utils'
import type { Priority, Role } from '@/lib/generated/prisma/client'

interface CsvImportPayloadItem {
  title: string
  outcomeKpi?: string
  priority?: 'HIGH' | 'MEDIUM' | 'LOW'
  startDate: string
  endDate: string
  picEmail?: string
  evidenceLink?: string
}

interface CsvImportPayload {
  items: CsvImportPayloadItem[]
  taskId?: string | null
  defaultPicId?: string | null
}

type SimpleUser = {
  id: string
  name: string
  email: string
  role: Role
  companyId: string | null
  divisionId: string | null
}

type PreparedItem = {
  title: string
  outcomeKpi: string
  priority: Priority
  startDate: Date
  endDate: Date
  taskId: string | null
  picId: string
  companyId: string
  divisionId: string | null
  isPersonal: boolean
  evidenceLink?: string
}

type TaskWithDivision = {
  id: string
  divisionId: string
  division: {
    companyId: string
  }
}

// Helper pencarian pengguna cerdas (email, username, awalan, atau nama lengkap)
function resolveTargetUser(
  identifier: string | undefined,
  allCompanyUsers: SimpleUser[],
  defaultPicUser: SimpleUser
): SimpleUser | null {
  if (!identifier || !identifier.trim()) return defaultPicUser
  const clean = identifier.trim().toLowerCase()

  // 1. Exact email match (misal: dimas.sobat@promap.id)
  const exactEmail = allCompanyUsers.find((u) => u.email.toLowerCase() === clean)
  if (exactEmail) return exactEmail

  // 2. Exact name match (misal: Dimas Setiawan)
  const exactName = allCompanyUsers.find((u) => u.name.toLowerCase() === clean)
  if (exactName) return exactName

  // 3. Username / Email prefix match (misal: dimas atau dimas.sobat atau dimas@...)
  const cleanPrefix = clean.includes('@') ? clean.split('@')[0] : clean
  const prefixMatch = allCompanyUsers.find((u) => {
    const uPrefix = u.email.split('@')[0].toLowerCase()
    const uFirst = uPrefix.split('.')[0]
    const cFirst = cleanPrefix.split('.')[0]
    return uPrefix === cleanPrefix || uFirst === cFirst || cleanPrefix.startsWith(uFirst)
  })
  if (prefixMatch) return prefixMatch

  // 4. Name contains (misal: "dimas" -> "Dimas Setiawan", "siti" -> "Siti Nurhaliza")
  const namePart = allCompanyUsers.find((u) => u.name.toLowerCase().includes(cleanPrefix))
  if (namePart) return namePart

  return null
}

async function resolveAndValidateTask(
  taskId: string | null,
  user: { role: string; divisionId: string | null }
): Promise<{ task: TaskWithDivision | null; error?: NextResponse }> {
  if (!taskId) return { task: null }

  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    include: { division: true },
  })
  if (!task) {
    return { task: null, error: NextResponse.json({ error: 'Task/Inisiatif yang dipilih tidak ditemukan' }, { status: 404 }) }
  }

  // Validasi scope division jika Manager
  if (user.role === 'MANAGER' && task.divisionId !== user.divisionId) {
    return {
      task: null,
      error: NextResponse.json(
        { error: 'Manager hanya boleh mengimpor Action Plan untuk task pada divisinya sendiri' },
        { status: 403 }
      ),
    }
  }

  return { task }
}

function resolvePicForImport(
  itemPicEmail: string | undefined,
  user: SimpleUser,
  allCompanyUsers: SimpleUser[],
  defaultPicUser: SimpleUser,
  rowNum: number
): { targetUser?: SimpleUser; error?: NextResponse } {
  if (user.role === 'PIC') {
    // PIC selalu mengimpor action plan untuk diri sendiri
    return { targetUser: user }
  }

  const targetUser = resolveTargetUser(itemPicEmail, allCompanyUsers, defaultPicUser)
  if (!targetUser) {
    const availableEmails = allCompanyUsers.slice(0, 5).map((u) => u.email).join(', ')
    return {
      error: NextResponse.json(
        {
          error: `Baris ke-${rowNum}: Pengguna "${itemPicEmail}" tidak ditemukan di organisasi Anda. Contoh email yang aktif: ${availableEmails}`,
        },
        { status: 400 }
      ),
    }
  }

  if (user.role === 'MANAGER' && targetUser.companyId !== user.companyId) {
    return {
      error: NextResponse.json(
        { error: `Baris ke-${rowNum}: Target pengguna berada di luar perusahaan Anda.` },
        { status: 403 }
      ),
    }
  }

  return { targetUser }
}

function validateAndPrepareRow(
  item: CsvImportPayloadItem,
  rowNum: number,
  user: SimpleUser,
  targetUser: SimpleUser,
  task: TaskWithDivision | null
): { prepared?: PreparedItem; error?: NextResponse } {
  const title = item.title?.trim()
  if (!title) {
    return {
      error: NextResponse.json({ error: `Baris ke-${rowNum}: Judul action plan wajib diisi` }, { status: 400 }),
    }
  }

  const outcomeKpi = item.outcomeKpi?.trim() || title
  const priority: Priority =
    item.priority === 'HIGH' || item.priority === 'LOW' ? item.priority : 'MEDIUM'

  const startDate = new Date(item.startDate)
  const endDate = new Date(item.endDate)

  if (Number.isNaN(startDate.getTime())) {
    return {
      error: NextResponse.json(
        { error: `Baris ke-${rowNum}: Tanggal mulai "${item.startDate}" tidak valid` },
        { status: 400 }
      ),
    }
  }

  if (Number.isNaN(endDate.getTime())) {
    return {
      error: NextResponse.json(
        { error: `Baris ke-${rowNum}: Tenggat waktu "${item.endDate}" tidak valid` },
        { status: 400 }
      ),
    }
  }

  if (endDate < startDate) {
    return {
      error: NextResponse.json(
        { error: `Baris ke-${rowNum}: Tenggat waktu tidak boleh lebih awal dari tanggal mulai` },
        { status: 400 }
      ),
    }
  }

  const evidenceLink = typeof item.evidenceLink === 'string' ? item.evidenceLink.trim() : ''
  if (evidenceLink && !isHttpUrl(evidenceLink)) {
    return {
      error: NextResponse.json(
        { error: `Baris ke-${rowNum}: Link bukti harus diawali http:// atau https://` },
        { status: 400 }
      ),
    }
  }

  const isPersonal = !task
  let companyId: string
  let divisionId: string | null

  if (isPersonal) {
    if (!targetUser.companyId && !user.companyId) {
      return {
        error: NextResponse.json(
          { error: `Baris ke-${rowNum}: Pengguna tidak terikat pada perusahaan.` },
          { status: 400 }
        ),
      }
    }
    companyId = targetUser.companyId || user.companyId!
    divisionId =
      targetUser.role === 'SUPER_ADMIN' || targetUser.role === 'ADMIN_OPERATIONAL'
        ? null
        : targetUser.divisionId
  } else {
    companyId = task.division.companyId
    divisionId = task.divisionId
  }

  return {
    prepared: {
      title,
      outcomeKpi,
      priority,
      startDate,
      endDate,
      taskId: task ? task.id : null,
      picId: targetUser.id,
      companyId,
      divisionId,
      isPersonal,
      evidenceLink: evidenceLink || undefined,
    },
  }
}

async function persistImportedActionPlans(preparedList: PreparedItem[]) {
  const include = {
    pic: { select: { id: true, name: true, role: true } },
    division: { select: { id: true, name: true } },
  }

  try {
    return await prisma.actionPlan.createManyAndReturn({
      data: preparedList.map((p) => ({
        title: p.title,
        outcomeKpi: p.outcomeKpi,
        priority: p.priority,
        startDate: p.startDate,
        endDate: p.endDate,
        taskId: p.taskId,
        picId: p.picId,
        companyId: p.companyId,
        divisionId: p.divisionId,
        isPersonal: p.isPersonal,
        status: 'NOT_STARTED',
        ...(p.evidenceLink ? { evidenceLink: p.evidenceLink } : {}),
      })),
      include,
    })
  } catch (batchErr) {
    console.warn('[ACTION_PLANS_IMPORT_CSV] createManyAndReturn fallback to extended transaction:', batchErr)
    return await prisma.$transaction(
      preparedList.map((p) =>
        prisma.actionPlan.create({
          data: {
            title: p.title,
            outcomeKpi: p.outcomeKpi,
            priority: p.priority,
            startDate: p.startDate,
            endDate: p.endDate,
            taskId: p.taskId,
            picId: p.picId,
            companyId: p.companyId,
            divisionId: p.divisionId,
            isPersonal: p.isPersonal,
            status: 'NOT_STARTED',
            ...(p.evidenceLink ? { evidenceLink: p.evidenceLink } : {}),
          },
          include,
        })
      ),
      {
        timeout: 30000,
        maxWait: 10000,
      }
    )
  }
}

async function dispatchImportNotifications(
  createdPlans: { id: string; title: string; picId: string; companyId: string }[],
  creator: { id: string; name: string }
): Promise<void> {
  const notifs = createdPlans.filter((ap) => ap.picId !== creator.id)
  if (notifs.length === 0) return

  await Promise.allSettled(
    notifs.map((ap) =>
      notify({
        userIds: [ap.picId],
        title: 'Action Plan Baru dari Import CSV',
        message: `Ditugaskan oleh ${creator.name}: "${ap.title}"`,
        link: `/action-plans?open=${ap.id}`,
        companyId: ap.companyId,
      })
    )
  )
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!canCreateAP(user)) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki wewenang untuk membuat Action Plan' },
        { status: 403 }
      )
    }

    const body: CsvImportPayload = await req.json()
    const items = Array.isArray(body?.items) ? body.items : []

    if (items.length === 0) {
      return NextResponse.json({ error: 'Daftar action plan tidak boleh kosong' }, { status: 400 })
    }

    // Aturan bisnis: Maksimal 24 action plan per import batch (6 hari kerja x 4 AP/hari)
    if (items.length > 24) {
      return NextResponse.json(
        {
          error: `Maksimal 24 Action Plan per batch (6 hari kerja × 4 AP/hari). Ditemukan ${items.length} item.`,
        },
        { status: 400 }
      )
    }

    // Task & default PIC dari payload modal
    const taskId = body.taskId && body.taskId !== 'personal' ? body.taskId : null
    const { task, error: taskError } = await resolveAndValidateTask(taskId, user)
    if (taskError) return taskError

    const defaultPicId = body.defaultPicId || user.id

    // Ambil seluruh user aktif di perusahaan
    const userWhere: Record<string, unknown> = {
      deletedAt: null,
      status: 'ACTIVE',
    }
    if (user.role !== 'SUPER_ADMIN' && user.companyId) {
      userWhere.companyId = user.companyId
    }

    const [allCompanyUsers, defaultPicUser] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyId: true,
          divisionId: true,
        },
      }),
      prisma.user.findFirst({
        where: { id: defaultPicId, deletedAt: null, status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyId: true,
          divisionId: true,
        },
      }),
    ])

    if (!defaultPicUser) {
      return NextResponse.json({ error: 'PIC default tidak ditemukan atau tidak aktif' }, { status: 404 })
    }

    const preparedList: PreparedItem[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const rowNum = i + 1

      const { targetUser, error: picError } = resolvePicForImport(
        item.picEmail,
        user,
        allCompanyUsers,
        defaultPicUser,
        rowNum
      )
      if (picError || !targetUser) return picError!

      const { prepared, error: rowError } = validateAndPrepareRow(
        item,
        rowNum,
        user,
        targetUser,
        task
      )
      if (rowError || !prepared) return rowError!

      preparedList.push(prepared)
    }

    const createdPlans = await persistImportedActionPlans(preparedList)

    // Catat ke Audit Trail & Activity Log
    await logActivity({
      userId: user.id,
      action: 'CREATED',
      newValue: `Import CSV: berhasil membuat ${createdPlans.length} Action Plan (rencana kerja mingguan)`,
    })

    await dispatchImportNotifications(createdPlans, user)

    return NextResponse.json(
      {
        success: true,
        count: createdPlans.length,
        items: createdPlans,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('[ACTION_PLANS_IMPORT_CSV_POST]', error)
    const err = error as { message?: string; stack?: string }
    return NextResponse.json(
      {
        error: err?.message || 'Terjadi kesalahan internal saat mengimpor CSV',
        detail: process.env.NODE_ENV === 'development' ? String(err?.stack || error) : undefined,
      },
      { status: 500 }
    )
  }
}

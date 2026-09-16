import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, canCreateAP } from '@/lib/rbac'
import { notify } from '@/lib/notifications'
import { logActivity } from '@/lib/activity-log'
import type { Priority } from '@/lib/generated/prisma/client'

interface CsvImportPayloadItem {
  title: string
  outcomeKpi?: string
  priority?: 'HIGH' | 'MEDIUM' | 'LOW'
  startDate: string
  endDate: string
  picEmail?: string
}

interface CsvImportPayload {
  items: CsvImportPayloadItem[]
  taskId?: string | null
  defaultPicId?: string | null
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
    const defaultPicId = body.defaultPicId || user.id

    // Pre-fetch task jika taskId diisi
    let task = null
    if (taskId) {
      task = await prisma.task.findFirst({
        where: { id: taskId, deletedAt: null },
        include: { division: true },
      })
      if (!task) {
        return NextResponse.json({ error: 'Task/Inisiatif yang dipilih tidak ditemukan' }, { status: 404 })
      }

      // Validasi scope division jika Manager
      if (user.role === 'MANAGER' && task.divisionId !== user.divisionId) {
        return NextResponse.json(
          { error: 'Manager hanya boleh mengimpor Action Plan untuk task pada divisinya sendiri' },
          { status: 403 }
        )
      }
    }

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
      }),
    ])

    if (!defaultPicUser) {
      return NextResponse.json({ error: 'PIC default tidak ditemukan atau tidak aktif' }, { status: 404 })
    }

    // Helper pencarian pengguna cerdas (email, username, awalan, atau nama lengkap)
    function resolveTargetUser(identifier: string | undefined) {
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

    // Validasi dan siapkan setiap baris Action Plan
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
    }

    const preparedList: PreparedItem[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const rowNum = i + 1
      const title = item.title?.trim()

      if (!title) {
        return NextResponse.json(
          { error: `Baris ke-${rowNum}: Judul action plan wajib diisi` },
          { status: 400 }
        )
      }

      const outcomeKpi = item.outcomeKpi?.trim() || title
      const priority: Priority =
        item.priority === 'HIGH' || item.priority === 'LOW' ? item.priority : 'MEDIUM'

      const startDate = new Date(item.startDate)
      const endDate = new Date(item.endDate)

      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: `Baris ke-${rowNum}: Tanggal mulai "${item.startDate}" tidak valid` },
          { status: 400 }
        )
      }

      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: `Baris ke-${rowNum}: Tenggat waktu "${item.endDate}" tidak valid` },
          { status: 400 }
        )
      }

      if (endDate < startDate) {
        return NextResponse.json(
          { error: `Baris ke-${rowNum}: Tenggat waktu tidak boleh lebih awal dari tanggal mulai` },
          { status: 400 }
        )
      }

      // Tentukan target PIC secara cerdas
      const targetUser = resolveTargetUser(item.picEmail)
      if (!targetUser) {
        const availableEmails = allCompanyUsers.slice(0, 5).map((u) => u.email).join(', ')
        return NextResponse.json(
          {
            error: `Baris ke-${rowNum}: Pengguna "${item.picEmail}" tidak ditemukan di organisasi Anda. Contoh email yang aktif: ${availableEmails}`,
          },
          { status: 400 }
        )
      }

      // Validasi scope PIC
      if (user.role === 'PIC' && targetUser.id !== user.id) {
        return NextResponse.json(
          { error: `Baris ke-${rowNum}: PIC hanya boleh membuat Action Plan untuk diri sendiri.` },
          { status: 403 }
        )
      }

      if (user.role === 'MANAGER') {
        if (targetUser.companyId !== user.companyId) {
          return NextResponse.json(
            { error: `Baris ke-${rowNum}: Target pengguna berada di luar perusahaan Anda.` },
            { status: 403 }
          )
        }
      }

      const isPersonal = !taskId
      let companyId: string
      let divisionId: string | null

      if (isPersonal) {
        if (!targetUser.companyId) {
          return NextResponse.json(
            { error: `Baris ke-${rowNum}: Target pengguna tidak terikat pada perusahaan.` },
            { status: 400 }
          )
        }
        companyId = targetUser.companyId
        divisionId =
          targetUser.role === 'SUPER_ADMIN' || targetUser.role === 'ADMIN_OPERATIONAL'
            ? null
            : targetUser.divisionId
      } else {
        companyId = task!.division.companyId
        divisionId = task!.divisionId
      }

      preparedList.push({
        title,
        outcomeKpi,
        priority,
        startDate,
        endDate,
        taskId,
        picId: targetUser.id,
        companyId,
        divisionId,
        isPersonal,
      })
    }

    // Simpan semua secara atomik dalam satu transaksi
    const createdPlans = await prisma.$transaction(
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
          },
          include: {
            pic: { select: { id: true, name: true, role: true } },
            division: { select: { id: true, name: true } },
          },
        })
      )
    )

    // Catat ke Audit Trail & Activity Log
    await logActivity({
      userId: user.id,
      action: 'CREATED',
      newValue: `Import CSV: berhasil membuat ${createdPlans.length} Action Plan (rencana kerja mingguan)`,
    })

    // Kirim notifikasi ke PIC yang ditugaskan (jika bukan pembuat)
    const notifs = createdPlans.filter((ap) => ap.picId !== user.id)
    if (notifs.length > 0) {
      await Promise.allSettled(
        notifs.map((ap) =>
          notify({
            userIds: [ap.picId],
            title: 'Action Plan Baru dari Import CSV',
            message: `Ditugaskan oleh ${user.name}: "${ap.title}"`,
            link: `/action-plans?open=${ap.id}`,
            companyId: ap.companyId,
          })
        )
      )
    }

    return NextResponse.json(
      {
        success: true,
        count: createdPlans.length,
        items: createdPlans,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[ACTION_PLANS_IMPORT_CSV_POST]', error)
    return NextResponse.json({ error: 'Terjadi kesalahan internal saat mengimpor CSV' }, { status: 500 })
  }
}

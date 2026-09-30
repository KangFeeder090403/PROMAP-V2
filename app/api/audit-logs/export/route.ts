import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/rbac'
import type { Prisma } from '@/lib/generated/prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format')?.toLowerCase() || 'csv'
    const search = searchParams.get('search')?.trim() || ''
    const action = searchParams.get('action')?.trim() || ''
    const filterUserId = searchParams.get('userId')?.trim() || ''

    // RBAC Scope
    let tenantWhere: Prisma.ActivityLogWhereInput = {}

    // Cabang `project` menutup log konversi Proposal->Project yang user-nya
    // berada di tenant lain (SUPER_ADMIN) — cermin app/api/audit-logs/route.ts.
    if (user.role === 'SUPER_ADMIN') {
      const companyId = searchParams.get('companyId')
      if (companyId) {
        tenantWhere = {
          OR: [
            { user: { companyId } },
            { actionPlan: { companyId } },
            { project: { companyId } },
          ],
        }
      }
    } else if (user.role === 'ADMIN_OPERATIONAL') {
      const cId = user.companyId!
      tenantWhere = {
        OR: [
          { user: { companyId: cId } },
          { actionPlan: { companyId: cId } },
          { project: { companyId: cId } },
        ],
      }
    } else if (user.role === 'MANAGER') {
      const cId = user.companyId!
      tenantWhere = user.divisionId
        ? {
            OR: [
              { user: { divisionId: user.divisionId } },
              { actionPlan: { divisionId: user.divisionId } },
              { project: { divisionId: user.divisionId } },
            ],
          }
        : {
            OR: [
              { user: { companyId: cId } },
              { actionPlan: { companyId: cId } },
              { project: { companyId: cId } },
            ],
          }
    } else {
      tenantWhere = {
        OR: [{ userId: user.id }, { actionPlan: { picId: user.id } }],
      }
    }

    const andConditions: Prisma.ActivityLogWhereInput[] = [tenantWhere]

    if (action && action !== 'ALL') {
      andConditions.push({ action })
    }
    if (filterUserId && filterUserId !== 'ALL') {
      andConditions.push({ userId: filterUserId })
    }
    if (search) {
      andConditions.push({
        OR: [
          { action: { contains: search, mode: 'insensitive' } },
          { oldValue: { contains: search, mode: 'insensitive' } },
          { newValue: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { actionPlan: { title: { contains: search, mode: 'insensitive' } } },
          { project: { name: { contains: search, mode: 'insensitive' } } },
        ],
      })
    }

    const finalWhere: Prisma.ActivityLogWhereInput =
      andConditions.length === 1 ? andConditions[0] : { AND: andConditions }

    const logs = await prisma.activityLog.findMany({
      where: finalWhere,
      orderBy: { createdAt: 'desc' },
      take: 1000,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            division: { select: { name: true } },
          },
        },
        actionPlan: {
          select: {
            id: true,
            title: true,
            task: {
              select: {
                title: true,
                project: { select: { name: true } },
              },
            },
          },
        },
        project: { select: { id: true, name: true } },
      },
    })

    if (format === 'json') {
      return new NextResponse(JSON.stringify(logs, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="promap-audit-log-${Date.now()}.json"`,
        },
      })
    }

    // Generate CSV
    const headers = [
      'Waktu (WIB)',
      'ID Log',
      'Pengguna Pelaksana',
      'Email',
      'Peran (Role)',
      'Divisi',
      'Aksi Tata Kelola',
      'Target Entitas',
      'Nilai Sebelum',
      'Nilai Sesudah',
    ]

    const csvRows = [headers.join(',')]

    for (const log of logs) {
      const dateStr = new Date(log.createdAt).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      const sanitize = (str: string | null | undefined) => {
        if (!str) return '""'
        const clean = str.replaceAll('"', '""').replace(/\r?\n/g, ' ')
        return `"${clean}"`
      }

      const row = [
        sanitize(dateStr),
        sanitize(log.id),
        sanitize(log.user?.name ?? 'Sistem Otomasi ProMaP'),
        sanitize(log.user?.email ?? '-'),
        sanitize(log.user?.role ?? 'SYSTEM'),
        sanitize(log.user?.division?.name ?? 'Umum'),
        sanitize(log.action),
        sanitize(log.actionPlan?.title ?? log.project?.name ?? '-'),
        sanitize(log.oldValue),
        sanitize(log.newValue),
      ]
      csvRows.push(row.join(','))
    }

    const csvContent = '\uFEFFsep=,\r\n' + csvRows.join('\r\n') // with UTF-8 BOM + sep=, for Excel compatibility

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="promap-audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (error) {
    console.error('[AUDIT_LOGS_EXPORT]', error)
    return NextResponse.json({ error: 'Gagal mengekspor audit log' }, { status: 500 })
  }
}

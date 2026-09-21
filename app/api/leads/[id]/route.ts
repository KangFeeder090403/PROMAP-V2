import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, canManageLeads } from '@/lib/rbac'
import type { LeadStatus } from '@/lib/generated/prisma/client'

const VALID_STATUS: LeadStatus[] = ['NEW', 'TRIAL_ACTIVE', 'CONVERTED', 'COLD']

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!canManageLeads(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const lead = await prisma.lead.findUnique({ where: { id: params.id } })
    if (!lead) {
      return NextResponse.json({ error: 'Lead tidak ditemukan' }, { status: 404 })
    }

    const body = await req.json()
    const data: {
      notes?: string | null
      status?: LeadStatus
      trialStartAt?: Date | null
      trialEndAt?: Date | null
    } = {}

    if (body.notes !== undefined) data.notes = body.notes
    if (body.trialStartAt !== undefined) {
      data.trialStartAt = body.trialStartAt ? new Date(body.trialStartAt) : null
    }
    if (body.trialEndAt !== undefined) {
      data.trialEndAt = body.trialEndAt ? new Date(body.trialEndAt) : null
    }
    if (body.status !== undefined) {
      if (!VALID_STATUS.includes(body.status)) {
        return NextResponse.json({ error: 'status tidak valid' }, { status: 400 })
      }
      data.status = body.status as LeadStatus
    }

    const updated = await prisma.lead.update({ where: { id: params.id }, data })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[LEADS_PUT]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

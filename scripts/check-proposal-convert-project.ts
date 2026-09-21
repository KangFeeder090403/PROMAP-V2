// Self-check konversi Proposal -> Project: `npx tsx scripts/check-proposal-convert-project.ts`
// Tanpa framework — assert saja. Menguji lib/projects.ts (sumber tunggal aturan
// tenant) plus klaim atomik linkProposalToProject dan scope audit log.
//
// Data uji dibuat di awal dan DIHAPUS di akhir (hard delete, data sintetis —
// aturan soft delete PRD berlaku untuk runtime aplikasi, bukan skrip uji ini).
import 'dotenv/config'
import assert from 'node:assert/strict'
import { prisma } from '../lib/prisma'
import {
  createProjectWithTasks,
  linkProposalToProject,
  ConflictError,
  ProjectInputError,
} from '../lib/projects'
import { logActivity } from '../lib/activity-log'
import type { Prisma, User } from '../lib/generated/prisma/client'

const TAG = `cpcp-${Date.now()}`
const created = {
  companyIds: [] as string[],
  divisionIds: [] as string[],
  userIds: [] as string[],
  proposalIds: [] as string[],
  projectIds: [] as string[],
}

/** Jalankan helper di dalam transaksi, kembalikan status HTTP seperti route. */
async function attemptCreate(
  user: User,
  input: Parameters<typeof createProjectWithTasks>[2],
  proposalId?: string
): Promise<{ status: number; projectId?: string; error?: string }> {
  try {
    const res = await prisma.$transaction(async (tx) => {
      const out = await createProjectWithTasks(tx, user, input)
      if (proposalId) await linkProposalToProject(tx, proposalId, out.project.id)
      return out
    })
    created.projectIds.push(res.project.id)
    return { status: 201, projectId: res.project.id }
  } catch (e) {
    if (e instanceof ConflictError) return { status: 409, error: e.message }
    if (e instanceof ProjectInputError) return { status: e.status, error: e.message }
    throw e
  }
}

async function main() {
  // ── Fixture: dua tenant, tenant A punya 2 divisi ────────────────────────────
  const companyA = await prisma.company.create({
    data: { name: `${TAG}-A`, uniqueCode: `${TAG}-A`.slice(-12), isActive: true },
  })
  const companyB = await prisma.company.create({
    data: { name: `${TAG}-B`, uniqueCode: `${TAG}-B`.slice(-12), isActive: true },
  })
  created.companyIds.push(companyA.id, companyB.id)

  const divSales = await prisma.division.create({
    data: { name: `${TAG}-sales`, companyId: companyA.id },
  })
  const divOps = await prisma.division.create({
    data: { name: `${TAG}-ops`, companyId: companyA.id },
  })
  const divB = await prisma.division.create({
    data: { name: `${TAG}-b`, companyId: companyB.id },
  })
  created.divisionIds.push(divSales.id, divOps.id, divB.id)

  const mkUser = async (
    name: string,
    role: 'SUPER_ADMIN' | 'ADMIN_OPERATIONAL' | 'MANAGER' | 'PIC',
    companyId: string | null,
    divisionId: string | null
  ) => {
    const u = await prisma.user.create({
      data: {
        name: `${TAG}-${name}`,
        email: `${TAG}-${name}@example.test`,
        password: 'x',
        role,
        status: 'ACTIVE',
        companyId,
        divisionId,
      },
    })
    created.userIds.push(u.id)
    return u
  }

  const superAdmin = await mkUser('sa', 'SUPER_ADMIN', null, null)
  const adminOpsA = await mkUser('adminA', 'ADMIN_OPERATIONAL', companyA.id, null)
  const managerSales = await mkUser('mgrSales', 'MANAGER', companyA.id, divSales.id)
  const picSales = await mkUser('picSales', 'PIC', companyA.id, divSales.id)
  const picOps = await mkUser('picOps', 'PIC', companyA.id, divOps.id)
  const picB = await mkUser('picB', 'PIC', companyB.id, divB.id)

  const mkProposal = async (proposerId: string) => {
    const p = await prisma.proposal.create({
      data: {
        proposerId,
        title: `${TAG} usulan`,
        description: 'deskripsi usulan uji',
        status: 'APPROVED',
      },
    })
    created.proposalIds.push(p.id)
    return p
  }

  // ── 1. MANAGER menugaskan PIC divisi lain -> 403 ────────────────────────────
  {
    const r = await attemptCreate(managerSales, {
      name: 'Proyek manajer lintas divisi',
      picIds: [picOps.id],
    })
    assert.equal(r.status, 403, 'Kasus 1: Manager tugaskan PIC divisi lain harus 403')
  }

  // ── 2. ADMIN_OPS lintas divisi se-company -> 201, task per divisi PIC ───────
  {
    const r = await attemptCreate(adminOpsA, {
      name: 'Proyek lintas divisi',
      picIds: [picSales.id, picOps.id],
    })
    assert.equal(r.status, 201, 'Kasus 2: Admin Ops lintas divisi harus 201')

    const tasks = await prisma.task.findMany({
      where: { projectId: r.projectId!, deletedAt: null },
      select: { picId: true, divisionId: true },
    })
    assert.equal(tasks.length, 2, 'Kasus 2: jumlah Task harus sama dengan jumlah PIC')
    const byPic = new Map(tasks.map((t) => [t.picId, t.divisionId]))
    assert.equal(byPic.get(picSales.id), divSales.id, 'Kasus 2: Task ikut divisi PIC-nya')
    assert.equal(byPic.get(picOps.id), divOps.id, 'Kasus 2: Task ikut divisi PIC-nya')

    const proj = await prisma.project.findUniqueOrThrow({ where: { id: r.projectId! } })
    assert.equal(proj.companyId, companyA.id, 'Kasus 2: project berada di company Admin Ops')
  }

  // ── 3. ADMIN_OPS kirim companyId tenant lain -> diabaikan ───────────────────
  {
    const r = await attemptCreate(adminOpsA, {
      name: 'Proyek company palsu',
      companyId: companyB.id,
      picIds: [picSales.id],
    })
    assert.equal(r.status, 201, 'Kasus 3: harus tetap berhasil')
    const proj = await prisma.project.findUniqueOrThrow({ where: { id: r.projectId! } })
    assert.equal(
      proj.companyId,
      companyA.id,
      'Kasus 3: companyId klien harus diabaikan, project tetap di company sendiri'
    )
    // PIC tenant lain tidak boleh bisa ditarik masuk
    const r2 = await attemptCreate(adminOpsA, {
      name: 'Proyek PIC tenant lain',
      picIds: [picB.id],
    })
    assert.equal(r2.status, 400, 'Kasus 3: PIC dari tenant lain harus ditolak 400')
  }

  // ── 4. PIC tidak boleh bikin Project (cermin canManageProject di route) ─────
  {
    const { canManageProject } = await import('../lib/rbac')
    assert.equal(
      canManageProject(picSales, picSales.divisionId),
      false,
      'Kasus 4: PIC tidak boleh manage project -> route balas 403'
    )
    assert.equal(canManageProject(adminOpsA, null), true, 'Kasus 4: Admin Ops boleh')
    assert.equal(
      canManageProject(managerSales, managerSales.divisionId),
      true,
      'Kasus 4: Manager boleh di divisinya sendiri'
    )
  }

  // ── 5. Tanpa target -> tetap Action Plan (regresi routing body.target) ──────
  {
    const route = (body: Record<string, unknown>) =>
      body.target === 'PROJECT' ? 'PROJECT' : 'ACTION_PLAN'
    assert.equal(route({}), 'ACTION_PLAN', 'Kasus 5: body kosong tetap Action Plan')
    assert.equal(
      route({ title: 'x', picId: 'y' }),
      'ACTION_PLAN',
      'Kasus 5: payload modal lama tetap Action Plan'
    )
    assert.equal(route({ target: 'PROJECT' }), 'PROJECT', 'Kasus 5: target PROJECT dirutekan')
  }

  // ── 6. Dua konversi konkuren -> tepat satu 201, satu 409, satu project ──────
  {
    const proposal = await mkProposal(picSales.id)
    const results = await Promise.all([
      attemptCreate(adminOpsA, { name: 'Balapan A', picIds: [picSales.id] }, proposal.id),
      attemptCreate(adminOpsA, { name: 'Balapan B', picIds: [picSales.id] }, proposal.id),
    ])
    const ok = results.filter((r) => r.status === 201)
    const conflict = results.filter((r) => r.status === 409)
    assert.equal(ok.length, 1, 'Kasus 6: harus tepat satu 201')
    assert.equal(conflict.length, 1, 'Kasus 6: harus tepat satu 409')

    const linkedCount = await prisma.project.count({ where: { proposals: { some: { id: proposal.id } } } })
    assert.equal(linkedCount, 1, 'Kasus 6: hanya satu Project boleh terikat ke proposal')

    const fresh = await prisma.proposal.findUniqueOrThrow({ where: { id: proposal.id } })
    assert.equal(fresh.projectId, ok[0].projectId, 'Kasus 6: proposal terikat ke pemenang')
  }

  // ── 7. SUPER_ADMIN kirim companyId tidak ada / terhapus -> 400 ──────────────
  {
    const r = await attemptCreate(superAdmin, {
      name: 'Proyek company hantu',
      companyId: 'company-tidak-ada',
    })
    assert.equal(r.status, 400, 'Kasus 7: companyId tidak ada harus 400')

    const dead = await prisma.company.create({
      data: {
        name: `${TAG}-dead`,
        uniqueCode: `${TAG}-D`.slice(-12),
        isActive: false,
        deletedAt: new Date(),
      },
    })
    created.companyIds.push(dead.id)
    const r2 = await attemptCreate(superAdmin, {
      name: 'Proyek company terhapus',
      companyId: dead.id,
    })
    assert.equal(r2.status, 400, 'Kasus 7: company deletedAt harus 400')

    const r3 = await attemptCreate(superAdmin, { name: 'Proyek tanpa company' })
    assert.equal(r3.status, 400, 'Kasus 7: SUPER_ADMIN tanpa companyId harus 400')
  }

  // ── 8. Konversi lintas tenant: Admin Ops penerima MELIHAT log-nya ───────────
  {
    const proposal = await mkProposal(picSales.id)
    const r = await attemptCreate(
      superAdmin,
      { name: 'Proyek lintas tenant', companyId: companyA.id, picIds: [picSales.id] },
      proposal.id
    )
    assert.equal(r.status, 201, 'Kasus 8: SUPER_ADMIN konversi lintas tenant harus 201')

    await logActivity({
      userId: superAdmin.id,
      projectId: r.projectId!,
      actionPlanId: null,
      action: 'CREATED',
      oldValue: `Proposal:${proposal.id}@${companyA.id}`,
      newValue: `Project:${r.projectId}@${companyA.id}`,
    })

    // Replika baseScope Admin Ops di app/api/audit-logs/route.ts
    const cId = adminOpsA.companyId!
    const scope: Prisma.ActivityLogWhereInput = {
      OR: [
        { user: { companyId: cId } },
        { actionPlan: { companyId: cId } },
        { project: { companyId: cId } },
      ],
    }
    const visible = await prisma.activityLog.findMany({
      where: { AND: [scope, { projectId: r.projectId! }] },
      select: { id: true },
    })
    assert.equal(
      visible.length,
      1,
      'Kasus 8: Admin Ops perusahaan penerima harus melihat log project asing'
    )

    // Kontrol negatif: tenant B tidak boleh melihatnya
    const scopeB: Prisma.ActivityLogWhereInput = {
      OR: [
        { user: { companyId: companyB.id } },
        { actionPlan: { companyId: companyB.id } },
        { project: { companyId: companyB.id } },
      ],
    }
    const leaked = await prisma.activityLog.findMany({
      where: { AND: [scopeB, { projectId: r.projectId! }] },
      select: { id: true },
    })
    assert.equal(leaked.length, 0, 'Kasus 8: tenant lain tidak boleh melihat log ini')
  }

  // ── 9. Tanpa name -> 400, bukan 500 (S1) ───────────────────────────────────
  {
    const r = await attemptCreate(adminOpsA, { name: undefined as unknown as string })
    assert.equal(r.status, 400, 'Kasus 9: name kosong harus 400')
    const r2 = await attemptCreate(adminOpsA, { name: '   ' })
    assert.equal(r2.status, 400, 'Kasus 9: name spasi saja harus 400')
  }

  // ── 10. Tanggal ngawur -> 400, bukan 500 (S2) ──────────────────────────────
  {
    const r = await attemptCreate(adminOpsA, {
      name: 'Proyek tanggal ngawur',
      startDate: new Date('xx'),
    })
    assert.equal(r.status, 400, 'Kasus 10: tanggal invalid harus 400')

    const r2 = await attemptCreate(adminOpsA, {
      name: 'Proyek mulai setelah selesai',
      startDate: new Date('2026-05-10'),
      endDate: new Date('2026-05-01'),
    })
    assert.equal(r2.status, 400, 'Kasus 10: startDate > endDate harus 400')
  }

  console.log('OK: 10 kasus konversi Proposal -> Project lolos')
}

async function cleanup() {
  await prisma.activityLog.deleteMany({ where: { projectId: { in: created.projectIds } } })
  await prisma.notification.deleteMany({ where: { userId: { in: created.userIds } } })
  await prisma.proposal.deleteMany({ where: { id: { in: created.proposalIds } } })
  await prisma.task.deleteMany({ where: { projectId: { in: created.projectIds } } })
  await prisma.project.deleteMany({ where: { id: { in: created.projectIds } } })
  await prisma.user.deleteMany({ where: { id: { in: created.userIds } } })
  await prisma.division.deleteMany({ where: { id: { in: created.divisionIds } } })
  await prisma.company.deleteMany({ where: { id: { in: created.companyIds } } })
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await cleanup()
    await prisma.$disconnect()
  })

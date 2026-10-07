import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  console.log('🌱 Starting project seeding...')

  // 1. Get Company "Sobat UMKM Pro" or first company
  let company = await prisma.company.findFirst({
    where: { name: { contains: 'Sobat UMKM Pro', mode: 'insensitive' } },
  })

  if (!company) {
    company = await prisma.company.findFirst()
  }

  if (!company) {
    console.error('❌ Error: No company found in database. Please run base seeder first.')
    return
  }
  console.log(`🏢 Using Company: ${company.name} (${company.id})`)

  // 2. Get Divisions (exact match agar tidak nyasar)
  const divIT = await prisma.division.findFirst({
    where: { companyId: company.id, deletedAt: null, name: { equals: 'IT Operasional', mode: 'insensitive' } },
  })
  const divHRBP = await prisma.division.findFirst({
    where: { companyId: company.id, deletedAt: null, name: { equals: 'HRBP', mode: 'insensitive' } },
  })
  const divMarketing = await prisma.division.findFirst({
    where: { companyId: company.id, deletedAt: null, name: { contains: 'Marketing', mode: 'insensitive' } },
  })

  if (!divIT) { console.error('❌ Division "IT Operasional" not found.'); return }
  if (!divHRBP) { console.error('❌ Division "HRBP" not found.'); return }
  if (!divMarketing) { console.error('❌ Division "Marketing" not found.'); return }

  console.log(`📁 IT Operasional: ${divIT.id}`)
  console.log(`📁 HRBP: ${divHRBP.id}`)
  console.log(`📁 Marketing: ${divMarketing.id}`)

  // 3. Get Super Admin for createdById
  let superAdmin = await prisma.user.findFirst({
    where: { companyId: company.id, role: 'SUPER_ADMIN' },
  })
  if (!superAdmin) {
    superAdmin = await prisma.user.findFirst({ where: { companyId: company.id } })
  }
  if (!superAdmin) {
    console.error('❌ Error: No user found to assign as creator.')
    return
  }
  console.log(`👤 Using Creator: ${superAdmin.name} (${superAdmin.id})`)

  const IT  = divIT.id
  const HRB = divHRBP.id
  const MKT = divMarketing.id
  const ALL = null // cross-functional / lintas divisi

  // 4. Projects to seed — sumber: KPI Task Library (sheet Project, Sobat UMKM Pro)
  const projectsData: { name: string; description: string; divisionId: string | null }[] = [
    // ── IT Operasional ─────────────────────────────────────────────────────────
    { name: 'Ai Agent Asisten Mentor',                          description: 'Development of AI Agent Asisten Mentor',                                            divisionId: IT  },
    { name: 'MVP - ProMaP V1',                                  description: 'Minimum Viable Product development of ProMaP V1',                                   divisionId: IT  },
    { name: 'Otomatisasi BOS Check',                            description: 'Automation system for BOS Check workflow',                                          divisionId: IT  },
    { name: 'Link Referal BOS Check',                           description: 'Referral link system for BOS Check',                                                divisionId: IT  },
    { name: 'Toko Online v1',                                   description: 'Development of Online Store version 1',                                             divisionId: IT  },
    { name: 'Data Management Customer (CRM)',                   description: 'Customer data management and CRM system',                                           divisionId: IT  },
    { name: 'Upgrade Website Sobat UMKM Pro',                   description: 'Website upgrade and enhancement for Sobat UMKM Pro',                               divisionId: IT  },
    { name: 'Tes bot assisten OpenClaw',                        description: 'Testing and evaluation of OpenClaw AI assistant bot',                               divisionId: IT  },
    { name: 'Input CRM Randumart - SMART CS CRM TRACKER',       description: 'Project tracking input CRM Randumart SMART CS CRM TRACKER',                        divisionId: IT  },
    { name: 'Input CRM Khaela Wedding - SMART CS CRM TRACKER',  description: 'Project tracking input CRM Khaela Wedding SMART CS CRM TRACKER',                   divisionId: IT  },
    { name: 'MVP - SMART CS CRM',                               description: 'Minimum Viable Product development of SMART CS CRM',                               divisionId: IT  },
    { name: 'Website - SMART CS CRM',                           description: 'Development and maintenance of Website SMART CS CRM',                               divisionId: IT  },
    { name: 'Mobile App - SMART CS CRM',                        description: 'Development of Mobile App SMART CS CRM',                                           divisionId: IT  },
    { name: 'MVP Website - ProMaP versi 2',                     description: 'MVP Website development for ProMaP version 2',                                     divisionId: IT  },
    { name: 'Prototype ProMaP peserta AMP',                     description: 'Prototype ProMaP for AMP programme participants',                                   divisionId: IT  },
    { name: 'ProMaP Mobile Version',                            description: 'Development of ProMaP application in mobile version',                              divisionId: IT  },
    { name: 'Checking Resi',                                    description: 'Receipt checking and verification system',                                          divisionId: IT  },
    { name: 'Design Assets UI',                                 description: 'UI design assets creation and asset management',                                    divisionId: IT  },
    { name: 'Backup Database PC Khaela Wedding ke Gdrive',      description: 'Backup of Khaela Wedding PC database to Google Drive',                             divisionId: IT  },
    { name: 'Testing CRM',                                      description: 'Quality assurance and testing for CRM platform',                                   divisionId: IT  },
    { name: 'Testing ProMaP',                                   description: 'Quality assurance and testing for ProMaP application',                             divisionId: IT  },
    { name: 'Testing Toko Online Randumart',                    description: 'Quality assurance and testing for Randumart Online Store',                         divisionId: IT  },
    { name: 'Sistim HRIS Web Untuk HR Admin',                   description: 'Web-based HRIS system for HR Admin',                                               divisionId: IT  },
    { name: 'Sistim HRIS Web Untuk Karyawan (Mobile)',          description: 'Mobile web-based HRIS system for employees',                                       divisionId: IT  },
    { name: 'Dashboard Analysis',                               description: 'Business analytics and reporting dashboard',                                        divisionId: IT  },
    { name: 'Database Rekrutmen 3 Form dan AI Agent',           description: 'Recruitment database with 3 form types and AI Agent integration',                  divisionId: IT  },
    { name: 'Update Konten Website Sobat UMKM Pro',             description: 'Content update and management for Sobat UMKM Pro website',                         divisionId: IT  },
    { name: 'Update Produk - Toko Online Randumart',            description: 'Product data update for Randumart Online Store',                                   divisionId: IT  },
    { name: 'Grow Meeting - Team SCM',                          description: 'Grow Meeting internal for SCM Team',                                               divisionId: IT  },

    // ── HRBP ───────────────────────────────────────────────────────────────────
    { name: 'Sistimasi KPI',                                                    description: 'KPI systematization and performance framework development',                      divisionId: HRB },
    { name: 'Rekrutmen SDM Magang',                                             description: 'Recruitment process for intern employees',                                       divisionId: HRB },
    { name: 'Rekrutmen SDM Pro Player',                                         description: 'Recruitment process for Pro Player employees',                                   divisionId: HRB },
    { name: 'Pembuatan SOP Sobat UMKM Pro',                                     description: 'Creating Standard Operating Procedures for Sobat UMKM Pro',                     divisionId: HRB },
    { name: 'Pembuatan Workflow, Job Desc, Job Profile, Kompetensi',            description: 'Creating workflow, job description, job profile, and competency framework',      divisionId: HRB },
    { name: 'HR Admin',                                                         description: 'HR administrative management and operations',                                    divisionId: HRB },
    { name: 'Otomasi Dokumen HR',                                               description: 'HR document automation and digitalization',                                      divisionId: HRB },
    { name: 'Membuat Form Database Rekrutmen',                                  description: 'Creating recruitment database intake form',                                      divisionId: HRB },
    { name: 'Deck Rekrutmen SDM – Pro Player',                                  description: 'Presentation deck for Pro Player SDM recruitment',                              divisionId: HRB },
    { name: 'Lomba17 Agustusan',                                                description: 'Independence Day competition event organizing',                                  divisionId: HRB },
    { name: 'Grow Meeting - Team HRD',                                          description: 'Grow Meeting internal for HRD Team',                                            divisionId: HRB },
    { name: 'Kulwa Grup Tanya Bisnis',                                          description: 'WhatsApp group learning — business Q&A programme',                              divisionId: HRB },

    // ── Marketing ──────────────────────────────────────────────────────────────
    { name: 'Carousel',                                         description: 'Social media carousel content creation and publishing',                             divisionId: MKT },
    { name: 'Reels',                                            description: 'Social media Reels video content creation and publishing',                          divisionId: MKT },

    // ── ALL / Cross-functional (divisionId null) ───────────────────────────────
    { name: 'Digitalisasi Modul',                               description: 'Digitalization of operational and training modules',                                divisionId: ALL },
    { name: "Seven Habit's Intern On Boarding",                 description: 'Seven Habits onboarding programme for new interns',                                 divisionId: ALL },
    { name: 'Membuat Google Form & beserta banner BRM 2.0',     description: 'Creating Google Form and promotional banner for BRM 2.0',                          divisionId: ALL },
    { name: 'Assisten Project Manager',                         description: 'Project Manager assistant role and task coordination',                              divisionId: ALL },
    { name: 'Grow Meeting - Team Holding Finance',              description: 'Grow Meeting internal for Holding Finance Team',                                    divisionId: ALL },
    { name: 'Buat Produk Digital',                              description: 'Digital product conceptualization and development',                                 divisionId: ALL },
    { name: 'Smart Business Plan Competition',                  description: 'Smart Business Plan Competition event planning and execution',                      divisionId: ALL },
    { name: 'Deck Akademi Manajer Profesional',                 description: 'Presentation deck for Akademi Manajer Profesional programme',                      divisionId: ALL },
    { name: 'Deck Business Mentoring Group',                    description: 'Presentation deck for Business Mentoring Group sessions',                           divisionId: ALL },
    { name: 'Deck Training Inkubator Bisnis UMKM (IBU)',        description: 'Presentation deck for UMKM Business Incubator Training',                           divisionId: ALL },
    { name: 'Deck Grow Meeting (GM)',                           description: 'Presentation deck for Grow Meeting',                                               divisionId: ALL },
    { name: 'Deck Business Systems Excellence (BSE)',           description: 'Presentation deck for Business Systems Excellence programme',                       divisionId: ALL },
    { name: 'Deck 360 Bisnis Review',                           description: 'Presentation deck for 360 Business Review',                                        divisionId: ALL },
    { name: "Edit Video Motivasi 'Flamming Hot Chips'",         description: "Video editing for Flamming Hot Chips motivational content",                         divisionId: ALL },
    { name: 'Engagement & ProMaP Randumart',                   description: 'Engagement activities and ProMaP programme for Randumart',                          divisionId: ALL },
    { name: 'BMG - Business Mentoring Group',                   description: 'Business Mentoring Group (BMG) programme management',                              divisionId: ALL },
    { name: 'Training IBU',                                     description: 'IBU (Inkubator Bisnis UMKM) training programme',                                   divisionId: ALL },
    { name: 'BOS Check',                                        description: 'BOS Check monitoring, evaluation, and follow-up programme',                        divisionId: ALL },
    { name: 'Akademi Manajer Profesional',                      description: 'Professional Manager Academy (AMP) programme',                                     divisionId: ALL },
    { name: 'Training BRM 1.0',                                 description: 'Business Relationship Management training version 1.0',                            divisionId: ALL },
    { name: 'Training BRM 2.0',                                 description: 'Business Relationship Management training version 2.0',                            divisionId: ALL },
    { name: 'Grow Meeting - Team P21 Gresik & BWI',            description: 'Grow Meeting for Team P21 Gresik and Banyuwangi',                                  divisionId: ALL },
    { name: 'Grow Meeting - Team P21 Surabaya',                 description: 'Grow Meeting for Team P21 Surabaya',                                               divisionId: ALL },
    { name: 'Grow Meeting - CV Ageng Sukses',                   description: 'Grow Meeting for CV Ageng Sukses',                                                 divisionId: ALL },
    { name: '360 Business Review',                              description: '360-degree business review and performance evaluation',                             divisionId: ALL },
    { name: 'Kontributor LMS - Learning Management System',     description: 'Contributor and content management for Learning Management System (LMS)',          divisionId: ALL },
    { name: 'Fasilitator AMP 8/8/2026',                        description: 'Facilitator role for AMP event on 8 August 2026',                                  divisionId: ALL },
    { name: 'Mengubah File PPXS menjadi File PPTX sehingga bisa editable', description: 'Converting PPXS files to editable PPTX format',                        divisionId: ALL },
    { name: 'BRM 2.0 (audiens + MC)',                           description: 'BRM 2.0 event preparation for audience and MC roles',                             divisionId: ALL },
  ]

  // 5. Upsert loop — skip jika sudah ada
  let created = 0
  let skipped = 0
  for (const p of projectsData) {
    const existing = await prisma.project.findFirst({
      where: { companyId: company.id, name: p.name, deletedAt: null },
    })

    if (existing) {
      console.log(`⏩ Skip (exists): "${p.name}"`)
      skipped++
      continue
    }

    await prisma.project.create({
      data: {
        name: p.name,
        description: p.description,
        companyId: company.id,
        divisionId: p.divisionId,
        createdById: superAdmin.id,
        isActive: true,
      },
    })
    console.log(`✅ Created: "${p.name}"`)
    created++
  }

  console.log(`\n🎉 Seeding done! Created: ${created} | Skipped: ${skipped} | Total: ${projectsData.length}`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

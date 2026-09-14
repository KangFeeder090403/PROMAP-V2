import 'dotenv/config'
import { prisma } from '@/lib/prisma'
import type { LeadStatus } from '@/lib/generated/prisma/client'

interface SeedLead {
  name: string
  email: string
  phone: string
  companyName: string
  status: LeadStatus
  trialStartAt?: Date | null
  trialEndAt?: Date | null
  loginCount: number
  lastLoginAt?: Date | null
  notes?: string
  createdAt: Date
}

export async function seedLeads() {
  console.log('Seeding CRM Leads B2B (total target: 69 leads)...')

  const now = new Date()
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000)
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000)

  // 5 entitas utama persis sesuai screenshot
  const topLeads: SeedLead[] = [
    {
      name: 'Bambang Pamungkas',
      email: 'bambang@pertaminapower.co.id',
      phone: '+62 812-3456-7890',
      companyName: 'PT Pertamina Power Solusi',
      status: 'TRIAL_ACTIVE',
      trialStartAt: daysAgo(26),
      trialEndAt: daysFromNow(4),
      loginCount: 14,
      lastLoginAt: hoursAgo(2),
      notes: 'Tertarik paket Enterprise 100 user, sedang uji coba divisi teknis',
      createdAt: daysAgo(26),
    },
    {
      name: 'Siti Nurhaliza',
      email: 'siti.nurhaliza@bankmandiri.co.id',
      phone: '+62 811-9876-5432',
      companyName: 'Bank Mandiri (Persero) Tbk',
      status: 'NEW',
      trialStartAt: null,
      trialEndAt: null,
      loginCount: 0,
      lastLoginAt: null,
      notes: 'Baru mendaftar formulir demo website, butuh approval tim procurement',
      createdAt: hoursAgo(5),
    },
    {
      name: 'Agus Wahyudi',
      email: 'a.wahyudi@telkom.co.id',
      phone: '+62 813-1122-3344',
      companyName: 'Telkom Indonesia',
      status: 'CONVERTED',
      trialStartAt: daysAgo(60),
      trialEndAt: daysAgo(30),
      loginCount: 42,
      lastLoginAt: hoursAgo(26), // kemarin 16:30
      notes: 'Resmi langganan tier Enterprise tahunan 500 user',
      createdAt: daysAgo(60),
    },
    {
      name: 'Dewi Lestari',
      email: 'dewi.lestari@bukitasam.id',
      phone: '+62 815-6677-8899',
      companyName: 'PT Bukit Asam Tbk',
      status: 'TRIAL_ACTIVE',
      trialStartAt: daysAgo(9),
      trialEndAt: daysFromNow(21),
      loginCount: 9,
      lastLoginAt: hoursAgo(9), // hari ini 09:15
      notes: 'Tim operasional tambang mencoba fitur approval evidence',
      createdAt: daysAgo(9),
    },
    {
      name: 'Rudi Santoso',
      email: 'rudi@nusantaralogistik.com',
      phone: '+62 821-4455-6677',
      companyName: 'PT Nusantara Logistik Express',
      status: 'COLD',
      trialStartAt: daysAgo(58),
      trialEndAt: daysAgo(28),
      loginCount: 1,
      lastLoginAt: daysAgo(28),
      notes: 'Masa trial berakhir tanpa konversi, follow up via WA belum direspon',
      createdAt: daysAgo(58),
    },
  ]

  // Sisa 17 NEW (Total: 18)
  const newNames = [
    ['Fajar Nugroho', 'fajar.n@astra.co.id', 'PT Astra International Tbk'],
    ['Maya Safitri', 'maya.s@indofood.co.id', 'PT Indofood Sukses Makmur Tbk'],
    ['Hendra Kurniawan', 'hendra@kalbefarma.co.id', 'PT Kalbe Farma Tbk'],
    ['Rina Marlina', 'rina.m@bca.co.id', 'PT Bank Central Asia Tbk'],
    ['Dimas Aditya', 'dimas@unilever.co.id', 'PT Unilever Indonesia Tbk'],
    ['Eka Prasetya', 'eka.p@bri.co.id', 'PT Bank Rakyat Indonesia Tbk'],
    ['Dian Sastrowardoyo', 'dian.s@paragon-corp.com', 'PT Paragon Technology and Innovation'],
    ['Reza Rahadian', 'reza@sinarmas.com', 'Sinar Mas Group'],
    ['Anita Wijaya', 'anita.w@djarum.com', 'PT Djarum Indonesia'],
    ['Bayu Pratama', 'bayu.p@mayora.co.id', 'PT Mayora Indah Tbk'],
    ['Wulandari Putri', 'wulan@sidomuncul.com', 'PT Industri Jamu Sido Muncul'],
    ['Irwan Santoso', 'irwan@wingscorp.com', 'Wings Group Indonesia'],
    ['Citra Kirana', 'citra.k@garuda-indonesia.com', 'PT Garuda Indonesia Tbk'],
    ['Taufik Hidayat', 'taufik@jasamarga.co.id', 'PT Jasa Marga (Persero) Tbk'],
    ['Gita Gutawa', 'gita@semenindonesia.com', 'PT Semen Indonesia Group'],
    ['Budi Gunawan', 'budi.g@pupukkaltim.com', 'PT Pupuk Kalimantan Timur'],
    ['Mega Suryani', 'mega@kai.id', 'PT Kereta Api Indonesia (Persero)'],
  ]

  // Sisa 32 TRIAL_ACTIVE (Total: 34)
  const trialActiveNames = [
    ['Aris Munandar', 'aris@pgn.co.id', 'PT Perusahaan Gas Negara Tbk', 18, 12],
    ['Linda Permata', 'linda@antam.com', 'PT Aneka Tambang Tbk', 15, 15],
    ['Yoga Pratama', 'yoga@timah.com', 'PT Timah Tbk', 22, 8],
    ['Indah Kusuma', 'indah@pln.co.id', 'PT PLN (Persero)', 8, 22],
    ['Denny Cagur', 'denny@pelindo.co.id', 'PT Pelabuhan Indonesia (Persero)', 11, 19],
    ['Sari Roti Admin', 'procurement@nipponindosari.co.id', 'PT Nippon Indosari Corpindo Tbk', 5, 25],
    ['Andi Soraya', 'andi.s@goto.com', 'PT GoTo Gojek Tokopedia Tbk', 27, 3],
    ['Doni Salman', 'doni@bukalapak.com', 'PT Bukalapak.com Tbk', 14, 16],
    ['Nabila Syakieb', 'nabila@traveloka.com', 'PT Traveloka Indonesia', 20, 10],
    ['Eko Patrio', 'eko@blibli.com', 'PT Global Digital Niaga Tbk (Blibli)', 12, 18],
    ['Titi Kamal', 'titi@tiket.com', 'PT Global Tiket Network', 6, 24],
    ['Christian Sugiono', 'christian@halodoc.com', 'PT Media Dokter Investama', 17, 13],
    ['Luna Maya', 'luna@ruangguru.com', 'PT Ruang Raya Indonesia', 25, 5],
    ['Ariel Noah', 'ariel@kopi-kenangan.com', 'PT Bumi Berkah Boga (Kopi Kenangan)', 10, 20],
    ['Chelsea Islan', 'chelsea@forecoffee.com', 'PT Fore Kopi Indonesia', 23, 7],
    ['Nicholas Saputra', 'nicholas@akr.co.id', 'PT AKR Corporindo Tbk', 4, 26],
    ['Raditya Dika', 'raditya@medcoenergi.com', 'PT Medco Energi Internasional Tbk', 19, 11],
    ['Sule Prikitiw', 'sule@adaro.com', 'PT Adaro Energy Indonesia Tbk', 13, 17],
    ['Vincent Rompies', 'vincent@indikaenergy.com', 'PT Indika Energy Tbk', 7, 23],
    ['Desta Mahendra', 'desta@valenusantara.co.id', 'PT Vale Indonesia Tbk', 21, 9],
    ['Enzy Storia', 'enzy@chandra-asri.com', 'PT Chandra Asri Pacific Tbk', 16, 14],
    ['Hesti Purwadinata', 'hesti@barito.co.id', 'PT Barito Pacific Tbk', 24, 6],
    ['Kaesang Pangarep', 'kaesang@charoenpokphand.co.id', 'PT Charoen Pokphand Indonesia Tbk', 3, 27],
    ['Gibran Rakabuming', 'gibran@japfacomp.co.id', 'PT Japfa Comfeed Indonesia Tbk', 28, 2],
    ['Najwa Shihab', 'najwa@narasi.tv', 'PT Narasi Media Ragam', 9, 21],
    ['Deddy Corbuzier', 'deddy@dcorps.id', 'PT D-Corpus Kreatif Nusantara', 26, 4],
    ['Raffi Ahmad', 'raffi@ransent.id', 'PT Rans Entertainment Corp', 2, 28],
    ['Nagita Slavina', 'nagita@mkgro.id', 'PT Mandiri Prima Usaha', 15, 15],
    ['Atta Halilintar', 'atta@ahhamedia.id', 'PT Ahha Corp Internasional', 22, 8],
    ['Aurel Hermansyah', 'aurel@beautyglow.id', 'PT Aurelia Cantika Perkasa', 8, 22],
    ['Baim Wong', 'baim@tigerwong.id', 'PT Tiger Wong Entertainment', 11, 19],
    ['Paula Verhoeven', 'paula@fashionmodel.id', 'PT Paula Kreatif Mandiri', 18, 12],
  ]

  // Sisa 11 CONVERTED (Total: 12)
  const convertedNames = [
    ['Surya Paloh', 'surya@mediagroup.co.id', 'Media Group Network', 55],
    ['Chairul Tanjung', 'ct@transcorp.co.id', 'CT Corp Nusantara', 62],
    ['Hary Tanoe', 'hary@mncgroup.com', 'MNC Asia Holding Tbk', 48],
    ['Aburizal Bakrie', 'izal@bakriegroup.com', 'Bakrie & Brothers Tbk', 70],
    ['James Riady', 'james@lippogroup.com', 'Lippo Karawaci Tbk', 53],
    ['Franky Widjaja', 'franky@smart-tbk.com', 'PT Sinar Mas Agro Resources and Technology Tbk', 65],
    ['Prajogo Pangestu', 'prajogo@baritopacific.com', 'PT Barito Renewables Energy Tbk', 80],
    ['Low Tuck Kwong', 'low@bayancorp.com', 'PT Bayan Resources Tbk', 91],
    ['Budi Hartono', 'budi@djarumcapital.com', 'PT Djarum Multifinance', 44],
    ['Michael Bambang', 'michael@sarana-menara.com', 'PT Sarana Menara Nusantara Tbk', 59],
    ['Anthoni Salim', 'salim@indofoodagri.com', 'Indofood Agri Resources', 76],
  ]

  // Sisa 4 COLD (Total: 5)
  const coldNames = [
    ['Kurniawan Dwi', 'kurniawan@bataviaexpress.com', 'PT Batavia Express Cargo', 65],
    ['Bambang Soediro', 'bambang@nusapenidatour.com', 'PT Nusa Penida Bahari Travel', 70],
    ['Hendri Ceper', 'hendri@borneoekspres.co.id', 'PT Borneo Kaltim Logistik', 85],
    ['Roni Paslah', 'roni@sumateralogistik.id', 'PT Sumatera Prima Transportasi', 90],
  ]

  const allLeads: SeedLead[] = [...topLeads]

  // Add remaining NEW
  newNames.forEach(([name, email, comp], idx) => {
    allLeads.push({
      name,
      email,
      phone: `+62 81${idx % 9}-1122-${1000 + idx * 47}`,
      companyName: comp,
      status: 'NEW',
      trialStartAt: null,
      trialEndAt: null,
      loginCount: 0,
      lastLoginAt: null,
      notes: 'Pendaftaran formulir demo guest baru',
      createdAt: hoursAgo(idx * 3 + 2),
    })
  })

  // Add remaining TRIAL_ACTIVE
  trialActiveNames.forEach(([name, email, comp, daysPassed, daysRemaining], idx) => {
    allLeads.push({
      name: name as string,
      email: email as string,
      phone: `+62 82${idx % 8}-5566-${2000 + idx * 33}`,
      companyName: comp as string,
      status: 'TRIAL_ACTIVE',
      trialStartAt: daysAgo(daysPassed as number),
      trialEndAt: daysFromNow(daysRemaining as number),
      loginCount: Math.floor(Math.random() * 20) + 3,
      lastLoginAt: hoursAgo(idx * 2 + 1),
      notes: `Evaluasi 30 hari tim operasional (${daysRemaining} hari tersisa)`,
      createdAt: daysAgo(daysPassed as number),
    })
  })

  // Add remaining CONVERTED
  convertedNames.forEach(([name, email, comp, loginCount], idx) => {
    allLeads.push({
      name: name as string,
      email: email as string,
      phone: `+62 81${idx % 7}-9988-${3000 + idx * 51}`,
      companyName: comp as string,
      status: 'CONVERTED',
      trialStartAt: daysAgo(75),
      trialEndAt: daysAgo(45),
      loginCount: loginCount as number,
      lastLoginAt: daysAgo(Math.floor(idx / 3) + 1),
      notes: 'Tenant berbayar aktif, migrasi data inisial sukses',
      createdAt: daysAgo(75),
    })
  })

  // Add remaining COLD
  coldNames.forEach(([name, email, comp, daysAgoTrial], idx) => {
    allLeads.push({
      name: name as string,
      email: email as string,
      phone: `+62 85${idx % 6}-7788-${4000 + idx * 62}`,
      companyName: comp as string,
      status: 'COLD',
      trialStartAt: daysAgo((daysAgoTrial as number) + 30),
      trialEndAt: daysAgo(daysAgoTrial as number),
      loginCount: idx === 0 ? 2 : 1,
      lastLoginAt: daysAgo(daysAgoTrial as number),
      notes: 'Trial kedaluwarsa, belum konversi ke langganan',
      createdAt: daysAgo((daysAgoTrial as number) + 30),
    })
  })

  console.log(`Generated ${allLeads.length} leads data structure. Inserting/updating DB...`)

  // Hapus data dummy lama jika ada atau upsert agar idempoten
  for (const item of allLeads) {
    const existing = await prisma.lead.findFirst({ where: { email: item.email } })
    if (existing) {
      await prisma.lead.update({
        where: { id: existing.id },
        data: {
          name: item.name,
          phone: item.phone,
          companyName: item.companyName,
          status: item.status,
          trialStartAt: item.trialStartAt,
          trialEndAt: item.trialEndAt,
          loginCount: item.loginCount,
          lastLoginAt: item.lastLoginAt,
          notes: item.notes,
          createdAt: item.createdAt,
        },
      })
    } else {
      await prisma.lead.create({
        data: {
          name: item.name,
          email: item.email,
          phone: item.phone,
          companyName: item.companyName,
          status: item.status,
          trialStartAt: item.trialStartAt,
          trialEndAt: item.trialEndAt,
          loginCount: item.loginCount,
          lastLoginAt: item.lastLoginAt,
          notes: item.notes,
          createdAt: item.createdAt,
        },
      })
    }
  }

  const counts = await prisma.lead.groupBy({
    by: ['status'],
    _count: { id: true },
  })

  const total = await prisma.lead.count()

  console.log('✅ Lead seeding complete! Total:', total)
  console.log('Breakdown by status:', counts)
}

if (require.main === module) {
  seedLeads()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

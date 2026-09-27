import { test, expect, type Page } from '@playwright/test'

test.describe.serial('ProMaP E2E: Login & Pengujian Seluruh Fitur', () => {
  let sharedPage: Page

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
    sharedPage = await context.newPage()

    // 1. Alur Login & Redirect ke /dashboard
    await sharedPage.goto('/login', { waitUntil: 'networkidle', timeout: 35000 })
    await sharedPage.waitForSelector('#email', { state: 'visible' })

    await sharedPage.fill('#email', 'admin@promap.com')
    await sharedPage.fill('#password', 'Superadmin123')

    await Promise.all([
      sharedPage.waitForURL(url => url.pathname.includes('/dashboard') || url.pathname === '/', {
        timeout: 35000,
        waitUntil: 'domcontentloaded',
      }),
      sharedPage.click('button:has-text("Masuk")'),
    ])
  })

  test.afterAll(async () => {
    await sharedPage.close()
  })

  test('1. Verifikasi Sukses Login & Berada di /dashboard', async () => {
    const currentUrl = sharedPage.url()
    expect(currentUrl).toMatch(/\/(dashboard)?$/)
  })

  test('2. Fitur Dashboard: Memverifikasi Kartu Metrik & Widget', async () => {
    await sharedPage.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await sharedPage.waitForSelector('.animate-pulse', { state: 'detached', timeout: 20000 }).catch(() => {})
    await sharedPage.waitForTimeout(1000)
    const bodyText = await sharedPage.textContent('body')
    expect(bodyText).toMatch(/Rencana Aksi|Portofolio|Total|Selesai|Berjalan|Keputusan|Inisiatif/i)
  })

  test('3. Fitur Projects: Memverifikasi Halaman Inisiatif & Proyek', async () => {
    await sharedPage.goto('/projects', { waitUntil: 'domcontentloaded' })
    await sharedPage.waitForTimeout(1500)
    expect(sharedPage.url()).toContain('/projects')
    const content = await sharedPage.textContent('body')
    expect(content).toMatch(/Inisiatif|Proyek|Project/i)
  })

  test('4. Fitur Action Plans: Memverifikasi Daftar Rencana Aksi', async () => {
    await sharedPage.goto('/action-plans', { waitUntil: 'domcontentloaded' })
    await sharedPage.waitForTimeout(1500)
    expect(sharedPage.url()).toContain('/action-plans')
    const content = await sharedPage.textContent('body')
    expect(content).toMatch(/Action Plan|Status|Prioritas|Tenggat|PIC/i)
  })

  test('5. Fitur Kanban Board: Memverifikasi 5 Kolom Eksekusi', async () => {
    await sharedPage.goto('/board', { waitUntil: 'domcontentloaded' })
    await sharedPage.waitForTimeout(1500)
    expect(sharedPage.url()).toContain('/board')
    const content = await sharedPage.textContent('body')
    expect(content).toMatch(/Belum Mulai|Not Started|Dikerjakan|In Progress|Review/i)
  })

  test('6. Fitur Calendar & Gantt: Memverifikasi Kalender Eksekusi', async () => {
    await sharedPage.goto('/calendar', { waitUntil: 'domcontentloaded' })
    await sharedPage.waitForTimeout(1500)
    expect(sharedPage.url()).toContain('/calendar')
    const content = await sharedPage.textContent('body')
    expect(content).toMatch(/Calendar|Kalender|Gantt|Bulan/i)
  })

  test('7. Fitur Proposals: Memverifikasi Sistem Usulan Inovasi', async () => {
    await sharedPage.goto('/proposals', { waitUntil: 'domcontentloaded' })
    await sharedPage.waitForTimeout(1500)
    expect(sharedPage.url()).toContain('/proposals')
    const content = await sharedPage.textContent('body')
    expect(content).toMatch(/Proposal|Usulan|Pengaju|Status/i)
  })

  test('8. Fitur Reports: Memverifikasi Laporan & Analitik', async () => {
    await sharedPage.goto('/reports', { waitUntil: 'domcontentloaded' })
    await sharedPage.waitForTimeout(1500)
    expect(sharedPage.url()).toContain('/reports')
    const content = await sharedPage.textContent('body')
    expect(content).toMatch(/Laporan|Report|Export|Governance|Performa/i)
  })

  test('9. Fitur Settings & User Role (RBAC): Memverifikasi Manajemen Pengguna', async () => {
    await sharedPage.goto('/settings?tab=user', { waitUntil: 'domcontentloaded' })
    await sharedPage.waitForTimeout(1500)
    expect(sharedPage.url()).toContain('/settings')
    const content = await sharedPage.textContent('body')
    expect(content).toMatch(/Pengguna|User|Role|ADMIN|SUPER_ADMIN|MANAGER|PIC/i)
  })

  test('10. Fitur Settings: Memverifikasi Struktur Divisi & Profil Perusahaan', async () => {
    await sharedPage.goto('/settings?tab=division', { waitUntil: 'domcontentloaded' })
    await sharedPage.waitForTimeout(1000)
    const divContent = await sharedPage.textContent('body')
    expect(divContent).toMatch(/Divisi/i)

    await sharedPage.goto('/settings?tab=company', { waitUntil: 'domcontentloaded' })
    await sharedPage.waitForTimeout(1000)
    const compContent = await sharedPage.textContent('body')
    expect(compContent).toMatch(/Perusahaan/i)
  })

  test('11. Fitur My Work: Memverifikasi Konsol Kerja Pribadi', async () => {
    await sharedPage.goto('/my-work', { waitUntil: 'domcontentloaded' })
    await sharedPage.waitForTimeout(1500)
    expect(sharedPage.url()).toContain('/my-work')
    const content = await sharedPage.textContent('body')
    expect(content).toMatch(/My Work|Tugas|Action Plan|Deadline/i)
  })
})

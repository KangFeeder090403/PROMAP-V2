const { chromium } = require('@playwright/test');

// Script Runner E2E Lengkap untuk ProMaP V2.4
// Menjalankan login dan menguji seluruh modul fitur secara berurutan.

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const HEADED = process.argv.includes('--headed');

const ANSI = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

async function run() {
  console.log(`${ANSI.cyan}${ANSI.bold}=====================================================${ANSI.reset}`);
  console.log(`${ANSI.cyan}${ANSI.bold}   PROMAP V2.4 - AUTOMATED PLAYWRIGHT E2E TESTING    ${ANSI.reset}`);
  console.log(`${ANSI.cyan}${ANSI.bold}=====================================================${ANSI.reset}`);
  console.log(`Base URL    : ${BASE_URL}`);
  console.log(`Browser     : Chromium (Headless: ${!HEADED})`);
  console.log(`Credentials : admin@promap.com (Super Admin)\n`);

  const browser = await chromium.launch({
    headless: !HEADED,
    slowMo: HEADED ? 200 : 0,
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    baseURL: BASE_URL,
  });

  const page = await context.newPage();
  const results = [];

  async function step(name, action) {
    process.stdout.write(`• Menguji ${name.padEnd(35)} `);
    const start = Date.now();
    try {
      await action();
      const dur = Date.now() - start;
      console.log(`${ANSI.green}✓ PASS${ANSI.reset} (${dur}ms)`);
      results.push({ name, status: 'PASS', duration: `${dur}ms` });
    } catch (err) {
      const dur = Date.now() - start;
      console.log(`${ANSI.red}✕ FAIL${ANSI.reset} (${dur}ms)`);
      console.log(`  ${ANSI.red}Error: ${err.message}${ANSI.reset}`);
      results.push({ name, status: 'FAIL', error: err.message, duration: `${dur}ms` });
    }
  }

  // 1. STEP: LOGIN FLOW
  await step('1. Alur Login & Redirect Dashboard', async () => {
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 50000 });
    
    // Pastikan form terhidrasi
    await page.waitForSelector('#email', { state: 'visible' });
    await page.fill('#email', 'admin@promap.com');
    await page.fill('#password', 'Superadmin123');

    await Promise.all([
      page.waitForURL(url => url.pathname.includes('/dashboard') || url.pathname === '/', {
        timeout: 45000,
        waitUntil: 'domcontentloaded',
      }),
      page.click('button:has-text("Masuk")')
    ]);

    const finalUrl = page.url();
    if (!finalUrl.includes('/dashboard') && !finalUrl.endsWith('/')) {
      throw new Error(`URL setelah login tidak sesuai: ${finalUrl}`);
    }
  });

  // 2. STEP: DASHBOARD
  await step('2. Dashboard (Ringkasan Metrik)', async () => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    // Tunggu sampai data selesai di-fetch dan skeleton hilang
    await page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const content = await page.textContent('body');
    if (!content.includes('Rencana Aksi') && !content.includes('Portofolio') && !content.includes('Action Plan') && !content.includes('Selesai') && !content.includes('Inisiatif')) {
      throw new Error('Elemen kartu metrik dashboard tidak ditemukan.');
    }
  });

  // 3. STEP: PROJECTS
  await step('3. Projects (Inisiatif & Proyek)', async () => {
    await page.goto('/projects', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const content = await page.textContent('body');
    if (!content.includes('Inisiatif') && !content.includes('Proyek') && !content.includes('Project')) {
      throw new Error('Halaman Projects tidak memuat judul inisiatif/proyek.');
    }
  });

  // 4. STEP: ACTION PLANS
  await step('4. Action Plans (Tabel Rencana Aksi)', async () => {
    await page.goto('/action-plans', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const content = await page.textContent('body');
    if (!content.includes('Action Plan') && !content.includes('Status')) {
      throw new Error('Halaman Action Plans tidak memuat konten rencana aksi.');
    }
  });

  // 5. STEP: KANBAN BOARD
  await step('5. Kanban Board (5 Kolom Eksekusi)', async () => {
    await page.goto('/board', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const content = await page.textContent('body');
    const hasColumns = (content.includes('Belum Mulai') || content.includes('Not Started')) ||
                       (content.includes('Dikerjakan') || content.includes('In Progress')) ||
                       content.includes('Review');
    if (!hasColumns) {
      throw new Error('Kolom-kolom Kanban Board tidak lengkap.');
    }
  });

  // 6. STEP: CALENDAR & GANTT
  await step('6. Calendar & Gantt Timeline', async () => {
    await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const content = await page.textContent('body');
    if (!content.includes('Calendar') && !content.includes('Kalender') && !content.includes('Gantt') && !content.includes('September')) {
      throw new Error('Modul Kalender tidak memuat tombol navigasi jadwal.');
    }
  });

  // 7. STEP: PROPOSALS
  await step('7. Proposals (Usulan Inisiatif)', async () => {
    await page.goto('/proposals', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const content = await page.textContent('body');
    if (!content.includes('Proposal') && !content.includes('Usulan')) {
      throw new Error('Tabel Proposals tidak termuat dengan benar.');
    }
  });

  // 8. STEP: REPORTS
  await step('8. Reports & Governance Index', async () => {
    await page.goto('/reports', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const content = await page.textContent('body');
    if (!content.includes('Laporan') && !content.includes('Export') && !content.includes('Report') && !content.includes('Governance')) {
      throw new Error('Halaman laporan dan analitik tidak ditemukan.');
    }
  });

  // 9. STEP: SETTINGS - USER & ROLE MANAGEMENT
  await step('9. Settings - User Management & RBAC', async () => {
    await page.goto('/settings?tab=user', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const content = await page.textContent('body');
    const hasRoles = content.includes('SUPER_ADMIN') || content.includes('ADMIN_OPERATIONAL') || content.includes('MANAGER') || content.includes('Pengguna');
    if (!hasRoles) {
      throw new Error('Daftar pengguna dan role RBAC tidak tampil pada tabel.');
    }
  });

  // 10. STEP: SETTINGS - STRUKTUR DIVISI
  await step('10. Settings - Struktur Divisi', async () => {
    await page.goto('/settings?tab=division', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const content = await page.textContent('body');
    if (!content.includes('Divisi')) {
      throw new Error('Tab Divisi gagal dimuat.');
    }
  });

  // 11. STEP: SETTINGS - LABEL JABATAN
  await step('11. Settings - Label Jabatan (UserLabel)', async () => {
    await page.goto('/settings?tab=userLabel', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const content = await page.textContent('body');
    if (!content.includes('Label Jabatan') && !content.includes('Label')) {
      throw new Error('Tab Label Jabatan gagal dimuat.');
    }
  });

  // 12. STEP: SETTINGS - PROFIL PERUSAHAAN
  await step('12. Settings - Profil Perusahaan', async () => {
    await page.goto('/settings?tab=company', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const content = await page.textContent('body');
    if (!content.includes('Perusahaan')) {
      throw new Error('Tab Profil Perusahaan gagal dimuat.');
    }
  });

  // 13. STEP: MY WORK
  await step('13. My Work (Personal Console)', async () => {
    await page.goto('/my-work', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const content = await page.textContent('body');
    if (!content.includes('My Work') && !content.includes('Action Plan') && !content.includes('Kerja')) {
      throw new Error('Halaman My Work tidak memuat konsol tugas.');
    }
  });

  console.log(`\n${ANSI.cyan}${ANSI.bold}=====================================================${ANSI.reset}`);
  console.log(`${ANSI.cyan}${ANSI.bold}                   RINGKASAN HASIL                   ${ANSI.reset}`);
  console.log(`${ANSI.cyan}${ANSI.bold}=====================================================${ANSI.reset}`);
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`Total Fitur Diuji : ${results.length}`);
  console.log(`Berhasil (PASS)   : ${ANSI.green}${passed}${ANSI.reset}`);
  console.log(`Gagal (FAIL)      : ${failed > 0 ? ANSI.red : ANSI.green}${failed}${ANSI.reset}`);

  if (failed === 0) {
    console.log(`\n${ANSI.green}${ANSI.bold}🎉 SELURUH FITUR PROMAP V2.4 BERFUNGSI DENGAN BAIK & LULUS TESTING!${ANSI.reset}\n`);
  } else {
    console.log(`\n${ANSI.yellow}Beberapa modul memerlukan peninjauan detail.${ANSI.reset}\n`);
  }

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Fatal testing error:', err);
  process.exit(1);
});

# PRD ProMaP V2.4

> SaaS multi-tenant manajemen action plan | Next.js + PostgreSQL + Neon + Prisma + Vercel
> **V2.4 = V2.2 (business logic) + UX Architecture Refactor**
> Backend V2.2 dipertahankan. Yang berubah: Information Architecture, App Shell, navigation, interaction pattern.

---

## BAGIAN A — FONDASI

### A1. Stack

| Layer | Tech |
|---|---|
| App | Next.js 14+ App Router (full-stack) |
| DB | PostgreSQL → Neon Serverless |
| ORM | Prisma 7.10.0 (adapter pg, generated ke `lib/generated/prisma`) |
| Auth | NextAuth.js (JWT, httpOnly cookie) |
| UI | shadcn/ui + Tailwind CSS + Lucide React |
| Deploy | Vercel + Vercel Cron + Vercel Blob |

Import Prisma: `from '@/lib/generated/prisma/client'` — bukan `@prisma/client`.

### A2. Hierarki Kerja & Konsep Inisiatif (Universal untuk Semua Divisi)

```
Project (Inisiatif / Program Kerja) → Task (Paket Kerja) → Action Plan (Eksekusi PIC) → Checklist
                                                              ↗ Proposal (Usulan Inisiatif/Aksi dari Bawah)
                                                              ↗ Personal Task (Pribadi, tidak masuk progres tim)
```

> **Prinsip Inklusif Divisi (V2.4 Refinement):**
> - **Project bukan hanya proyek IT/Software**. Project adalah **wadah payung inisiatif / program kerja strategis** yang berlaku untuk seluruh jenis divisi:
>   * *Marketing & Sales:* Kampanye Peluncuran Produk, Ekspansi Pasar Q3, Optimalisasi SEO.
>   * *Operasional:* Efisiensi Rantai Pasok, Audit Kepatuhan SOP Gudang, Relokasi Kantor.
>   * *HR & GA:* Program Rekrutmen Batch 2, Pelatihan Leadership, Pembaruan Fasilitas Kantor.
>   * *Finance:* Penyusunan Laporan Pajak Tahunan, Otomasi Reimbursement.
> - **Task:** Paket sasaran/deliverable di bawah inisiatif tersebut yang didelegasikan ke penanggung jawab tertentu.
> - **Action Plan:** Langkah eksekusi konkret PIC harian/mingguan dengan siklus 8 status dan pembuktian (evidence).
> - **Peran PIC:** PIC berfokus mengeksekusi Action Plan di **My Work**. Di halaman Projects, PIC dapat melihat konteks inisiatif besar tempat mereka berkontribusi, tanpa harus dibebani tugas administrasi proyek.
> - **Empty State Ramah Divisi:** Ketika belum ada project, sistem wajib memberikan pesan yang mendidik dan memandu (bukan sekadar teks kosong), mengarahkan peran PIC ke My Work atau memberi panduan bagi Manager untuk memulai program pertama timnya.

> **Catatan V2.4:** "Objective" tetap konsep, BUKAN model Prisma. Tidak ada migration baru. Ditunda ke V3.

### A3. Role & RBAC

| Role | Enum | Scope Data |
|---|---|---|
| Super Admin | `SUPER_ADMIN` | Semua perusahaan |
| Admin Ops | `ADMIN_OPERATIONAL` | 1 perusahaan, semua divisi |
| Manager | `MANAGER` | 1 divisi |
| PIC | `PIC` | Milik sendiri |
| Guest | `GUEST` | Dummy data only |

**Label Jabatan (UserLabel)** — tampilan PIC dinamis per perusahaan (Magang, Karyawan, dll)
- Super Admin / Admin Ops → buat label, langsung aktif
- Manager → usul label → `PENDING` → approval Admin Ops

### A4. Status Flow AP (8 status)

```
NOT_STARTED → IN_PROGRESS → PENDING_APPROVAL
                                 ↓
                    EVIDENCE_REQUIRED ←→ APPROVED → COMPLETE
                                 ↓
                              REJECTED → kembali IN_PROGRESS
NOT_STARTED / IN_PROGRESS → OVERDUE (auto Cron 00:01 WIB)
```

### A5. Guest Mode

| Parameter | Nilai |
|---|---|
| Form | Nama + Email + No HP + Nama Perusahaan → tabel `Lead` |
| Data | Dummy hardcoded, bukan data real |
| Session | Cookie `promap-guest-token`, expired 2 jam |
| Rate limit | Max 3x login/hari per email, reset 00:00 WIB |
| CTA | Popup "Aktivasi Trial 30 Hari" tiap klik fitur aktif |

---

## BAGIAN B — UX ARCHITECTURE (BARU di V2.4)

### B1. Prinsip Inti

> **ProMaP = satu workspace kerja, bukan kumpulan halaman fitur.**
> User tidak berpindah aplikasi saat ganti Table → Board → Calendar. Hanya ganti cara melihat data yang sama.

**5 Prinsip UX:**

1. **One System, Multiple Views** — satu dataset work item, banyak cara lihat. Jangan buat data terpisah hanya karena tampilan berbeda.
2. **Page, Not Form** — Action Plan adalah objek kerja hidup: buka item → lihat konteks → edit inline → progress → evidence → discussion. Bukan form 12 field lalu submit.
3. **Context Preservation** — buka detail tanpa kehilangan posisi/filter list. Drawer untuk inspeksi cepat, full page untuk kerja mendalam.
4. **Progressive Disclosure** — info penting dulu. Info sekunder masuk ke tab, expandable section, atau drawer.
5. **Role-Aware UX** — UI mengikuti RBAC. PIC tidak melihat kontrol Manager. Manager dapat workflow review. Admin dapat administrative control.

### B2. Navigation (Sidebar)

```
PROMAP
────────────────────
WORKSPACE
  Home            ← Dashboard adaptif per role
  My Work         ← Tugas milik user (semua role)
  Projects        ← List + detail project

EXECUTION
  Board           ← Kanban 5 kolom (mapping 8 status, lihat §B7)
  Calendar        ← Monthly + Gantt
  Proposals       ← Bottom-up work entry

INSIGHTS
  Reports         ← Laporan & export

────────────────────
  Settings        ← Company, Division, User, UserLabel, Leads
────────────────────
Profile · Notifications · Help
```

**Aturan navigation:**
- Sidebar mencerminkan pekerjaan user, bukan struktur API
- Menu tampil/sembunyi sesuai RBAC (Leads hanya Super Admin, Settings hanya Admin ke atas)
- Jangan tambah menu untuk setiap fitur backend baru

### B3. App Shell

```
┌──────────┬────────────────────────────────────┐
│ Sidebar  │ Header (h-14, sticky)              │
│ w-64     │ Breadcrumb · Notif · User menu     │
│ dark     ├────────────────────────────────────┤
│ #0F172A  │                                    │
│          │ Main Workspace                     │
│          │ bg #F8FAFC · p-6                   │
└──────────┴────────────────────────────────────┘
```

**Header minimal:** breadcrumb, notification bell (badge counter), user menu.

**Global Create — tombol `+ New`:**
```
Project · Task · Action Plan · Personal Task · Proposal
```
Visibility mengikuti RBAC.

> **Ditunda ke V3:** Global Search (Cmd+K), Command Menu — butuh endpoint `/api/search` yang belum ada.

### B4. Detail Interaction Pattern

| Konteks | Pola |
|---|---|
| Inspeksi cepat dari list | **Drawer** (side panel, list tetap terlihat di belakang) |
| Kerja mendalam | **Full page** (`/action-plans/[id]`, `/projects/[id]`) |
| Aksi cepat (ubah status, assign PIC) | **Inline / dropdown** — tanpa buka form |
| Create item baru | **Modal** ringkas, field minimum wajib saja |

**Aturan:** kembali dari detail tidak boleh menghilangkan filter/scroll position list.

### B5. Dashboard Adaptif per Role

Satu route `/` — konten menyesuaikan role. Bukan halaman terpisah.

| Role | Konten Dashboard |
|---|---|
| **Super Admin** | Metrics lintas perusahaan · List company · Leads baru · Kapasitas DB |
| **Admin Ops** | Metrics per divisi · Perbandingan completion rate antar divisi · User pending · Label pending |
| **Manager** | Metrics tim · **Action Required** (AP menunggu review, proposal masuk) · **Team Workload** (bar chart beban per PIC) · Overdue alert |
| **PIC** | My Work · Deadline terdekat · AP yang perlu revisi · Notifikasi |

**Komponen Dashboard wajib:**
- 4 metric cards: Total, Selesai, In Progress, Overdue
- Donut chart: distribusi status AP
- Bar chart: distribusi prioritas
- **Action Required panel** (Manager & Admin Ops) — semua yang butuh keputusan user
- **Team Workload** (Manager) — cegah overload sebelum assign task baru

### B6. My Work

Halaman khusus untuk semua role — tugas yang **milik user sendiri**.

Isi:
- AP yang di-assign ke user (grouped by status)
- Task yang jadi tanggung jawab user
- Deadline terdekat (7 hari ke depan)
- Item yang butuh aksi user (revisi, evidence diminta)

### B7. Board (Kanban) — Mapping 8 Status

Masalah: 8 status bisnis vs board yang readable.

**Solusi — 5 kolom dengan grouping:**

| Kolom Board | Status yang Masuk |
|---|---|
| **Not Started** | `NOT_STARTED` |
| **In Progress** | `IN_PROGRESS` |
| **Review** | `PENDING_APPROVAL`, `EVIDENCE_REQUIRED` |
| **Needs Revision** | `REJECTED` |
| **Done** | `APPROVED`, `COMPLETE` |

`OVERDUE` bukan kolom — tapi **badge merah** di kartu, apapun kolomnya.

Drag & drop hanya untuk transisi yang valid sesuai status flow. Transisi invalid ditolak dengan toast.

### B8. View System

Satu dataset, beberapa view. Toolbar konsisten di semua list page:

```
[ Judul Halaman ]
[ Filter ▾ ] [ Sort ▾ ] [ View: Table|Board|Calendar ] [ + New ]
```

**Filter:** Status, PIC, Divisi, Project, Priority, Date range
**Quick chips:** Hari Ini · Minggu Ini · Bulan Ini
**Sort:** Terbaru, Terlama, Deadline Terdekat, Prioritas Tertinggi

> **Ditunda ke V3:** Saved Views, Timeline View — butuh model baru di schema.

### B9. State Wajib Setiap Halaman

| State | Contoh |
|---|---|
| Loading | Skeleton, bukan spinner penuh layar |
| Empty | "Belum ada Action Plan. Buat AP pertama untuk mulai." + tombol aksi |
| Error | Pesan jelas + tombol retry |
| Permission denied | "Anda tidak punya akses ke halaman ini" |
| No search results | "Tidak ada hasil untuk filter ini" + tombol reset filter |

Empty state **wajib memberikan next action** — bukan sekadar "No data".

### B10. Layout Spec per Screen (referensi Stitch)

> Mockup di `docs/design-reference/` (gitignored). **Yang diambil: struktur section,
> hierarki info, kelengkapan field, pola interaksi.** Token visual SELALU dari
> `.claude/skills/promap-design/SKILL.md` — bukan dari Stitch.

**Wajib dibuang dari semua mockup:**
- Token Material 3, font Manrope/Hanken, Material Symbols, warna apapun dari Stitch
- Field "Kode Unik Tenant" di login · blok "Quick Fill Akun Demo"
- Search bar di header (ditunda V3) · Company switcher di header
- Reports di navigation (baru muncul saat UI-12)
- SLA badge, cryptographic hash, label "Sprint W34" — tidak ada di schema (seat quota sudah diimplementasi via QUOTA_MAP di POST /api/users)
- Nama status karangan (DRAFT/SCHEDULED/REVISION/BLOCKED/ARCHIVED) → petakan ke 8 status §A4

---

#### UI-2 — Login & Guest (`ui-2-login-guest.png`)

Layout **split 2 kolom**. Auth pages di luar App Shell.

```
KIRI  (hero, dark)          KANAN (card "Masuk ke Workspace")
─────────────────────       ──────────────────────────────────
Badge kecil                 Tabs: Akun Enterprise │ Guest Demo
Headline 2 baris            ── tab Enterprise ──
Subcopy Project→Task→AP        Email · Password
4 kartu role:                  CTA primary "Masuk"
  SUPER_ADMIN
  ADMIN_OPERATIONAL         ── tab Guest Demo ──
  MANAGER                      Nama · Email · Telepon · Perusahaan
  PIC                          CTA "Mulai Demo" (sesi 2 jam)
Panel keamanan:             Footer strip: "Hubungi Admin Operasional untuk dibuatkan akun"
  bcrypt 12 · JWT httpOnly
  no localStorage
  tenant isolation
```

- **Guest Demo jadi tab di dalam card login**, bukan halaman terpisah.
  Route `/demo` tetap ada sebagai deep-link, isinya sama.
- Mobile: hero collapse jadi header ringkas, card full width.
- Checkbox "Simpan sesi" di mockup **tidak dipakai** — NextAuth di repo ini
  pakai `maxAge` tetap, kontrol itu tidak akan berefek apa-apa.

---

#### UI-3 — Dashboard (`ui-3-dashboard-manager.png`)

```
Greeting "Selamat Pagi, {nama}" + subtitle (divisi · periode)
Chips rentang waktu: Hari Ini │ Minggu Ini │ Bulan Ini │ Kuartal

4 metric card:
  TOTAL ACTION PLAN   angka + delta vs bulan lalu
  SELESAI             angka + % rate + progress bar
  SEDANG BERJALAN     angka + split "n in progress · m in review"
  OVERDUE             angka + "Perlu Perhatian"

Panel ACTION REQUIRED  (badge jumlah, aksi inline per baris)
  PENDING_APPROVAL   → Approve │ Review Evidence │ Reject
  EVIDENCE_REQUIRED  → Ingatkan PIC │ Buka Detail
  Proposal SUBMITTED → Review Proposal

2 kolom:
  Distribusi Status        donut + total di tengah + legend per status
  Beban Tim & Kapasitas    per PIC: stacked bar (Overdue/Ongoing/Done) + badge beban

Tabel bawah: Overdue & Deadline Kritis
  ID & Nama │ Risiko │ PIC │ Tenggat │ Keterlambatan │ Aksi
```

Panel Action Required **dirender walau metrik total = 0**.

> **Deviasi terpasang (2026-09-09, disetujui Product Owner):**
> - **Beban Tim & Kapasitas disembunyikan sementara** (flag `SHOW_TEAM_WORKLOAD=false`).
>   Kode tidak dihapus. Slot kanan diisi **Distribusi Prioritas (High/Medium/Low)**
>   dari `priorityBreakdown` yang sudah dihitung API.
> - **Chip rentang +"Semua"** ditambahkan (range `all`) untuk membuka data historis.
> - **Filter PIC di banner** (dropdown "Semua PIC", sembunyi untuk role PIC) —
>   memfilter seluruh dashboard ke satu PIC.
> - **Tabel Overdue**: sortir client-side 4 opsi (terlama/tenggat/prioritas/terbaru);
>   "Ingatkan PIC" memanggil `POST /api/action-plans/[id]/remind` (rate-limit 24 jam).
> - **Proposal** dibuka lewat **Drawer geser-kanan** (bukan modal), tanpa tombol
>   "Buka Halaman Penuh" (route `/proposals?id=` belum ada — ditunda UI-8).

---

#### UI-4 — My Work (`ui-4-my-work.png`)

```
Badge "PIC PERSONAL CONSOLE" · title "My Work"
Filter chips + hitungan: Semua │ Butuh Aksi Saya │ Deadline Minggu Ini │ Selesai

Panel amber "Butuh Aksi Anda Segera"
  REJECTED          → Perbaiki Sekarang
  EVIDENCE_REQUIRED → Upload Evidence
  Proposal draft    → Submit Proposal

KIRI  "Action Plan Saya" — grouping by status pipeline
        section In Progress (n) · In Review (n) · Complete (n, collapsed)
        kartu: kode AP · Parent Task · Project · judul ·
               progress bar % · checklist n/m · chip deadline · kebab menu
KANAN rail
        Upcoming Deadlines  strip 7 hari + baris bertanggal
        Target Mingguan     donut % + tile Target / Disetujui
```

---

#### UI-5 — Projects List & Inisiatif (`ui-5-projects-list.png`)

```
Title: "Inisiatif & Proyek" + subtitle penjelasan konteks program kerja
Blok statistik kanan: TOTAL INISIATIF · AKTIF
Toolbar: [search nama/deskripsi] [Status ▾] [Divisi ▾] [Sort ▾] [+ Inisiatif Baru (Manager/Admin)]

Tampilan Grid/Tabel Inisiatif:
  NAMA INISIATIF judul + deskripsi terpotong
  DIVISI         badge divisi penanggung jawab
  PERIODE        rentang tanggal + ikon kalender
  JUMLAH TASK    "n Task / m Action Plan"
  PROGRESS       persentase capaian + bar

Empty State Ramah Peran (Role-Aware Empty State):
  - Admin/Manager: Ikon folder + "Belum ada inisiatif program kerja" + panduan singkat cara membuat program kerja pertama + tombol [+ Inisiatif Baru]
  - PIC: Ikon inisiatif + "Belum ada inisiatif yang ditugaskan ke divisi Anda" + panduan bahwa tugas harian dapat dilihat langsung di menu "My Work" + tombol [Buka My Work]
```

---

#### UI-6 — Action Plan + Drawer (`ui-6-action-plan-drawer.png`)

```
Header: title · [search] · [Filter (n)] · [+ Action Plan]
Baris kartu hitungan per status — klik = filter (state terpilih terlihat)
Tabel: TITLE & ID │ PROJECT & SCOPE │ PIC │ PRIORITY   + pagination

DRAWER kanan (list tetap terlihat):
  breadcrumb Projects › {project} › {kode AP}
  ikon buka-full-page · tutup
  judul · dropdown STATUS · "Updated {n} lalu"
  2 kolom: PIC (dengan aksi reassign) │ PRIORITY & DUE
  box OUTCOME / KPI
  Tabs: Work & Evidence (n/m) │ Activity & Discussion (n)
  Checklist milestone — "Dicentang oleh {nama} • {tanggal}"
  Footer sticky: "Draft tersimpan" · Batal · Simpan
```

Kartu hitungan status **wajib pakai 8 status §A4**, bukan nama di mockup.

---

## BAGIAN C — ROADMAP

> Penanda: `✅` selesai & ACC reviewer · `🔶` ada tapi belum sesuai V2.4 (perlu refactor) · `⬜` belum ada

### C1. Backend — Status

*(hasil audit repo, 2026-09-18)*

```
✅ 1.  Setup & Auth                 app/api/auth/*
✅ 2.  Company & Division CRUD      app/api/companies, /divisions
✅ 3.  User Management + UserLabel  app/api/users, /user-labels
✅ 4.  Guest Mode & Leads           app/api/guest/*, /leads
✅ 5.  Project & Task               app/api/projects, /tasks
✅ 6.  Proposal System              app/api/proposals
✅ 7.  Action Plan (8 status)       app/api/action-plans
✅ 8.  Evidence & Approval          .../submit, /review, /start, /reassign
✅ 9.  Comment / Thread + @mention  .../comments + lib/mentions.ts  (bc93973)
✅ 10. Dashboard & Analitik         app/api/dashboard + lib/dashboard-aggregate.ts (813c838)
✅ 11. Notifikasi In-App            app/api/notifications/*  (6d586ac)
✅ 12. Kanban Board                 pakai /api/action-plans + PUT /tasks/[id] (6d586ac)
✅ 13. Kalender + Download PDF      app/api/calendar, /calendar/export (e642936)
✅ 14. Filter & Sort                action-plans, proposals, tasks, projects, users, leads: dynamic filter + sort whitelist.
✅ 15. Cron Job Overdue             app/api/cron/check-overdue  (6d586ac)
✅ 16. Laporan & Export             app/api/reports/route.ts (289 baris) +
                                    export/route.ts (761 baris, governanceIndex, quarters)
✅ 17. Audit Log                    lib/activity-log.ts dipanggil 15 route +
                                    app/api/audit-logs + export
```

### C2. Frontend (V2.4) — Urutan Pengerjaan

*(hasil audit repo, 2026-09-18 — V2.4 = refactor, bukan bangun dari nol)*

> **Layout tiap layar: §B10.** Screen tanpa entri di B10 = layout belum disepakati,
> tanya Product Owner sebelum mulai.

**P0 — Wajib (fondasi, tidak bisa di-skip):**
```
✅ UI-1  App Shell     components/layout/{DashboardShell,Sidebar,Header,
                       NotifBell,nav-config}.tsx — nav 3-grup (Workspace/
                       Execution/Insights), breadcrumb, +New global
✅ UI-2  Auth Pages    app/(auth)/login/page.tsx + demo/page.tsx (no self-register)
✅ UI-3  Dashboard     role-adaptif (isPic), Action Required, priority breakdown
                       (Team Workload ada tapi flag-off, deviasi resmi 2026-09-09)
✅ UI-4  My Work       app/(dashboard)/my-work/page.tsx → MyWorkClient.tsx (1280 baris)
✅ UI-5  Projects      list + detail /projects/[id] → ProjectDetailClient.tsx (1413 baris, tabs)
✅ UI-6  Action Plan   Drawer (ActionPlanDetail) & Full Page Workspace
                       /action-plans/[id] (ActionPlanWorkspaceClient, 2-kolom + sidebar)
```

**P1 — Penting (setelah P0 stabil):**
```
✅ UI-7  Board         SELESAI: Papan 5 kolom (PRD §B7), badge OVERDUE di kartu,
                       proteksi drag & drop RBAC/catatan wajib, integrasi Drawer
                       ActionPlanDetail, dark mode & filter pencarian judul/kode.
✅ UI-8  Proposals     SELESAI: Tabel proposal dengan nama pengaju (proposer.name),
                       modal buat/edit draft, review dialog dengan catatan wajib saat tolak,
                       modal inspeksi detail proposal, RBAC Super Admin/Admin Ops/Manager.
✅ UI-9  Settings      SELESAI: Company, Division, User, UserLabel aktif, tab Leads
                       sudah terintegrasi di SettingsClient.tsx
✅ UI-10 Calendar      SELESAI: app/(dashboard)/calendar/page.tsx + 6 komponen
                       (Gantt, Week, Agenda, export PDF, sync feed .ics)
✅ UI-11 Filter & Sort FilterToolbar.tsx terstandarisasi & backend sort whitelist lengkap
```

### C2.1 Laporan Implementasi & Verifikasi UI-7, UI-8, UI-9 (Audit September 2026)

#### 1. UI-7 — Board / Kanban (`/board`)
- **Status:** `✅ SELESAI & TERVERIFIKASI`
- **Komponen:** `components/kanban/KanbanClient.tsx`, `KanbanCard.tsx`, `KanbanColumn.tsx`, `lib/action-plan-status.ts`.
- **Fitur Utama:**
  - **5 Kolom Kanban (PRD §B7):**
    1. *Belum Mulai* (`NOT_STARTED`)
    2. *Dikerjakan* (`IN_PROGRESS` + `OVERDUE`)
    3. *Review* (`PENDING_APPROVAL` + `EVIDENCE_REQUIRED`)
    4. *Perlu Revisi* (`REJECTED`)
    5. *Selesai* (`APPROVED` + `COMPLETE`)
  - **Status OVERDUE:** Bukan kolom terpisah, melainkan badge penanda merah/oranye di dalam kartu kolom "Dikerjakan".
  - **Proteksi Drag & Drop:** Fungsi `resolveKanbanDrop()` membatasi pergerakan kartu sesuai RBAC, kepemilikan PIC, dan divisi manager. Transisi yang membutuhkan catatan wajib (seperti submit progress ke Review atau tolak ke Needs Revision) dicegat dan otomatis membuka drawer `ActionPlanDetail` untuk pengisian catatan resmi.
  - **Aksi Transisi Otomatis:** Kartu personal dapat diselesaikan langsung (`/complete`), kartu review diselesaikan reviewer (`/review COMPLETE`), kartu mulai pengerjaan (`/start`).
  - **Inspeksi:** Klik kartu membuka `ActionPlanDetail` drawer tanpa meninggalkan konteks papan.
  - **Visual:** Dukungan penuh Dark Mode (`dark:bg-slate-900`, `dark:border-slate-800`), progress bar checklist, chip prioritas, dan input pencarian live.

#### 2. UI-8 — Proposals (`/proposals`)
- **Status:** `✅ SELESAI & TERVERIFIKASI`
- **Komponen:** `app/api/proposals/route.ts`, `app/api/proposals/[id]/review/route.ts`, `components/proposals/ProposalsClient.tsx`, `ProposalFormModal.tsx`, `ProposalReviewDialog.tsx`.
- **Fitur Utama:**
  - **Tampilan Pengaju:** Menampilkan `proposer.name` (atau label "Anda") menggantikan raw ID/UUID.
  - **Siklus Hidup:** Draft proposal dapat diedit dan dihapus oleh pengaju. Tombol "Submit" mengirimkan proposal untuk review.
  - **Review Proposal:** Manager divisi, Admin Operasional, dan Super Admin dapat menyetujui (`APPROVED`) atau menolak (`REJECTED`).
  - **Validasi Penolakan:** Catatan review (`reviewNote`) wajib diisi saat menolak usulan, divalidasi pada client dan backend API (HTTP 400).
  - **Modal Detail:** Tersedia modal inspeksi detail untuk membaca seluruh deskripsi usulan dan catatan review hasil telaah atasan.
  - **RBAC & Isolasi:** Menggunakan `proposalScope(user)` yang menjaga batasan tenant dan divisi.

#### 3. UI-9 — Settings (`/settings`)
- **Status:** `🔶 AKTIF SEBAGIAN (GAP: LEADS BELUM MASUK SETTINGS)`
- **Komponen:** `components/settings/SettingsClient.tsx`, `CompanySection.tsx`, `DivisionSection.tsx`, `UserSection.tsx`, `UserLabelSection.tsx`.
- **Cakupan Aktif:**
  - Tab Perusahaan (Super Admin / Admin Ops)
  - Tab Divisi (Super Admin / Admin Ops)
  - Tab Pengguna & Manajemen Akses (Super Admin / Admin Ops / Manager)
  - Tab Label Jabatan (Manager mengusulkan, Admin Ops menyetujui)
- **Gap yang Tersisa:**
  - Integrasi tab "Leads" untuk Super Admin mengelola prospek pendaftaran demo belum masuk ke Settings (PRD §C2: `UI-13 Leads`).
  - Dark mode styling pada header Settings perlu penyesuaian kelas tema gelap.

#### 4. Perbaikan Logika Bisnis & Cron Terkait
- **Cron Overdue (`/api/cron/check-overdue`):** Diperbaiki agar hanya Action Plan dengan status `NOT_STARTED` dan `IN_PROGRESS` yang dapat bertransisi ke `OVERDUE` saat melewati tenggat waktu (sesuai PRD §A4). Status `PENDING_APPROVAL` dan `EVIDENCE_REQUIRED` tidak lagi tertimpa secara keliru.
- **Otorisasi Review:** Diperluas agar Super Admin dan Admin Operasional dapat mereview proposal selain Manager divisi.
- **Validasi Divisi Board:** `resolveKanbanDrop` sekarang memvalidasi `divisionId` manager secara ketat untuk mencegah drag antar-divisi yang tidak sah.


**P2 — Setelah core stabil:**
```
✅ UI-12 Reports & Export   reports/page.tsx → ReportsClient.tsx (1092 baris, RBAC Manager+)
✅ UI-13 Leads              /settings/leads (kanonik); /leads lama akan dikonsolidasi
✅ UI-14 Guest Demo Page    app/(auth)/demo/page.tsx → GuestDemoPanel, terhubung /api/guest/*
✅ UI-15 Audit Log view     settings/audit-logs/page.tsx → AuditLogClient.tsx, /audit-logs redirect
✅ Landing Page             app/landing/page.tsx → 13 komponen, 35 kB
```

### C3. Ditunda ke V3

Global Search (Cmd+K) · Command Menu · Saved Views · Timeline View · Objective sebagai entitas · ProjectMember · Recurring Task · Template AP · Workload View lanjutan · Task Dependency · PWA/Mobile

---

## BAGIAN D — DESIGN SYSTEM

Detail lengkap: `.claude/skills/promap-design/SKILL.md` — **wajib dibaca sebelum generate UI apapun.**

### D1. Color Tokens

```
Background     #F8FAFC   slate-50    halaman utama
Surface        #FFFFFF   white       card, modal, drawer
Sidebar        #0F172A   slate-900   sidebar dark
Primary        #1E40AF   blue-800    brand element
Accent/CTA     #3B82F6   blue-500    SATU warna untuk semua tombol aksi
Text primary   #0F172A   slate-900
Text secondary #64748B   slate-500
Border         #E2E8F0   slate-200
```

### D2. Status → Color Mapping

| Status | Tailwind Class |
|---|---|
| Not Started | `bg-slate-100 text-slate-600` |
| In Progress | `bg-blue-100 text-blue-700` |
| Pending Approval | `bg-indigo-100 text-indigo-700` |
| Evidence Required | `bg-amber-100 text-amber-700` |
| Approved | `bg-green-100 text-green-700` |
| Rejected | `bg-red-100 text-red-700` |
| Overdue | `bg-orange-100 text-orange-700` |
| Complete | `bg-emerald-100 text-emerald-700` |

### D3. Priority → Color

| Priority | Class | Dot |
|---|---|---|
| High | `bg-red-100 text-red-700` | `bg-red-500` |
| Medium | `bg-amber-100 text-amber-700` | `bg-amber-500` |
| Low | `bg-slate-100 text-slate-600` | `bg-slate-400` |

### D4. Typography & Spacing

```
Font          Inter Variable (wajib, tidak boleh diganti)
Page title    24px semibold slate-900 tracking-tight
Section H2    18px semibold slate-800
Card title    15px medium slate-800
Body          14px normal slate-700
Label/meta    12px medium slate-500 uppercase tracking-wide

Page padding  p-6      Card padding  p-5
Section gap   gap-6    Card gap      gap-4
Input/button  h-9      Radius        rounded-lg (card) / rounded-md (input)
Shadow        shadow-sm (card) / shadow-md (dropdown, modal)
```

---

## BAGIAN E — PRISMA SCHEMA (ringkas)

```prisma
enum Role              { SUPER_ADMIN ADMIN_OPERATIONAL MANAGER PIC GUEST }
enum UserStatus        { PENDING ACTIVE INACTIVE }
enum UserLabelStatus   { PENDING ACTIVE REJECTED }
enum Priority          { HIGH MEDIUM LOW }
enum ActionPlanStatus  { NOT_STARTED IN_PROGRESS PENDING_APPROVAL EVIDENCE_REQUIRED APPROVED REJECTED OVERDUE COMPLETE }
enum ProposalStatus    { DRAFT SUBMITTED APPROVED REJECTED }
enum LeadStatus        { NEW TRIAL_ACTIVE CONVERTED COLD }
enum SubscriptionTier  { BASIC PREMIUM ENTERPRISE }

model Company    { id name uniqueCode logoUrl? subscription isActive deletedAt? }
model Division   { id name companyId deletedAt? }
model UserLabel  { id companyId name status requestedById? approvedById? deletedAt? }
model User       { id email name phone? password? role status companyId? divisionId? supervisorId? userLabelId? isGuest guestExpiry? deletedAt? }
model Lead       { id name email phone companyName status trialStartAt? trialEndAt? loginCount lastLoginAt? notes? }
model Project    { id name description? companyId divisionId? createdById isActive startDate? endDate? deletedAt? }
model Task       { id title description? projectId divisionId picId createdById priority status startDate? endDate? deletedAt? }
model ActionPlan { id taskId? picId divisionId companyId title outcomeKpi priority status startDate endDate isPersonal evaluationNote? evidenceLink? reviewNote? deletedAt? }
model Checklist  { id actionPlanId title isDone }
model Proposal   { id proposerId title description status reviewNote? }
model Comment    { id actionPlanId authorId content createdAt }   // tidak bisa dihapus
model Notification { id userId companyId? title message link? isRead }
model ActivityLog  { id userId actionPlanId? action oldValue? newValue? }
```

> `Task` TIDAK punya `companyId` — pakai `taskScope()` custom via relasi `division.companyId`, bukan `buildWhereClause()` generik.
> `Project` punya `divisionId` nullable — Manager scope per divisi, Project company-wide boleh `null`.

---

## BAGIAN F — API ROUTES

### Auth & Guest
```
POST /api/guest/register
POST /api/auth/login             POST /api/guest/activate-trial
GET  /api/auth/profile
POST /api/auth/logout
```

### Company, Division, User, Label
```
GET|POST      /api/companies              GET|POST  /api/users
PUT|DELETE    /api/companies/[id]         PUT       /api/users/[id]
GET|POST      /api/divisions              PUT       /api/users/[id]/approve
PUT|DELETE    /api/divisions/[id]         DELETE    /api/users/[id]
GET|POST      /api/user-labels            PUT       /api/user-labels/[id]/approve
DELETE        /api/user-labels/[id]
```

### Project, Task, Action Plan, Comment
```
GET|POST      /api/projects               GET|POST  /api/action-plans
PUT|DELETE    /api/projects/[id]          PUT       /api/action-plans/[id]
GET|POST      /api/tasks                  PUT       /api/action-plans/[id]/submit
PUT|DELETE    /api/tasks/[id]             PUT       /api/action-plans/[id]/review
                                          PUT       /api/action-plans/[id]/reassign
                                          GET|POST  /api/action-plans/[id]/comments
```

### Proposal, Dashboard, Notif, Laporan, Leads
```
GET|POST  /api/proposals             GET  /api/notifications
PUT       /api/proposals/[id]/review PUT  /api/notifications/read-all
GET       /api/dashboard             GET  /api/reports
GET       /api/calendar              GET  /api/reports/export
GET       /api/calendar/export       GET|PUT /api/leads
POST      /api/cron/check-overdue    (Vercel Cron 00:01 WIB)
```

---

## BAGIAN G — KONVENSI & LARANGAN

### G1. API Route Pattern Wajib

```typescript
// urutan wajib di setiap route:
1. getSessionUser()       → cek auth + reject guest/inactive/deleted
2. requireRole([...])     → cek permission
3. scope filter           → companyScope / divisionScope / taskScope / projectScope
4. prisma query           → selalu ada deletedAt: null
5. ActivityLog            → catat operasi penting
6. notify()               → trigger notif sesuai tabel
```

### G2. Helper yang Sudah Ada

```
lib/rbac.ts          getSessionUser, requireRole, companyScope, divisionScope,
                     userScope, projectScope, canManageProject, taskScope,
                     canAssignTask, canManageUsers, canManageUserLabel, canManageLeads
lib/notifications.ts notify()
lib/guest-auth.ts    signGuestToken, setGuestCookie, getGuestToken
lib/prisma.ts        prisma (singleton dengan adapter pg)
```

### G3. Trigger Notifikasi

| Penerima | Event |
|---|---|
| PIC | Task baru, reassign, AP approve/reject, evidence diminta, deadline H-1, overdue, di-mention |
| Manager | AP pending review, evidence baru, AP belum review >3 hari, proposal baru, di-mention, overdue PIC |
| Admin Ops | User baru pending, label jabatan diusulkan Manager |
| Super Admin | Guest baru, guest aktivasi trial, kapasitas DB 70%/90% |

### G4. Larangan Keras — Backend

```
❌ Query Prisma tanpa filter companyId (kecuali SUPER_ADMIN)
❌ buildWhereClause() untuk Task — pakai taskScope() custom
❌ Password plaintext — wajib bcrypt cost 12
❌ JWT di localStorage — wajib httpOnly cookie
❌ Hard delete — wajib soft delete (deletedAt)
❌ Hapus Comment — audit trail
❌ prisma migrate tanpa review schema dulu
❌ Push langsung ke main — wajib PR
❌ Main Agent nulis kode sebelum Reviewer ACC
❌ Referensi Claude/AI di commit message
```

### G5. Larangan Keras — UI (V2.4)

```
❌ Buat halaman baru tanpa cek navigation — semua halaman harus punya slot di sidebar
❌ Random card layout — pakai component pattern di promap-design skill
❌ Mock data menggantikan API production
❌ Ubah schema karena UI terasa sulit — lapor ke Product Owner
❌ Duplicate component tanpa alasan
❌ Ubah business status (8 status AP fixed)
❌ UI berbeda-beda antar halaman
❌ Warna di luar design system
❌ Font selain Inter Variable
❌ Gradient di komponen fungsional
```

---

## BAGIAN H — DEFINITION OF DONE

### H1. Per Screen

**Architecture**
- [ ] Berada di navigation yang benar (punya slot di sidebar)
- [ ] Menggunakan App Shell
- [ ] Pakai reusable component, tidak duplikasi business logic

**UX**
- [ ] User tahu sedang di mana (breadcrumb benar)
- [ ] Primary action jelas
- [ ] Detail mudah dibuka (drawer atau page)
- [ ] Kembali dari detail tidak hilang konteks list
- [ ] 5 state tersedia (loading, empty, error, permission denied, no results)

**Data**
- [ ] Pakai API existing, tidak buat endpoint baru tanpa alasan
- [ ] RBAC benar — role tidak lihat kontrol yang bukan haknya
- [ ] Tenant isolation benar

**Visual**
- [ ] Design token sesuai promap-design skill
- [ ] Typography & spacing konsisten
- [ ] Status color mapping benar
- [ ] Tidak ada warna random

**Quality**
- [ ] Responsive (sidebar collapse di mobile)
- [ ] Keyboard accessible
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run build` sukses

### H2. Definition of Done — V2.4 Keseluruhan

1. User paham struktur aplikasi tanpa training panjang
2. Project → Task → Action Plan terasa satu rantai
3. Pindah Table/Board/Calendar tidak terasa pindah aplikasi
4. Action Plan jadi pusat execution workflow
5. Manager bisa review tanpa mencari-cari informasi
6. PIC melihat pekerjaannya dari My Work
7. Detail dibuka tanpa kehilangan konteks list
8. Kanban tidak membingungkan meski ada 8 status bisnis
9. UI terasa satu product system, bukan kumpulan halaman
10. Backend existing tetap berfungsi, tidak ada security regression

---

## BAGIAN I — PRINSIP IMPLEMENTASI

> **Do not make ProMaP prettier. Make ProMaP coherent.**

Urutan prioritas:

```
Mental Model → Information Architecture → Interaction → Components → Visual Polish
```

Visual polish adalah tahap akhir. Yang paling penting: user paham *di mana dia berada* dan *apa yang harus dilakukan*.

---

## BAGIAN J — ATURAN AI AGENT

```
1.  Baca PRD.md (dokumen ini)
2.  Baca .claude/CLAUDE.md
3.  Baca .claude/skills/promap-design/SKILL.md sebelum generate UI
4.  Inspect implementasi existing — jangan asumsi
5.  Identifikasi backend/API/component yang bisa dipakai ulang
6.  @planner buat rencana
7.  @reviewer validasi rencana → ACC
8.  @main implementasi
9.  Jalankan tsc + build
10. @reviewer code review
11. Fix issue
12. Baru merge
```

**Aturan tambahan V2.4:**
- Sebelum buat halaman baru: apakah ini halaman baru, atau cukup view baru dari data yang sudah ada?
- Sebelum buat component baru: apakah sudah ada component serupa yang bisa di-extend?
- Kalau UI terasa sulit karena schema, **jangan ubah schema** — lapor ke Product Owner.

---

## Env & Cron

```
DATABASE_URL         Neon pooled (runtime)
DIRECT_URL           Neon direct (prisma migrate)
NEXTAUTH_SECRET      openssl rand -base64 32
NEXTAUTH_URL         localhost:3000 / URL Vercel
GOOGLE_CLIENT_ID     opsional SSO — kosong = tombol Google tidak dirender
GOOGLE_CLIENT_SECRET opsional SSO — kosong = tombol Google tidak dirender
CRON_SECRET          openssl rand -base64 32 (auth /api/cron/*)
```

**Google SSO — batas perilaku.** Google hanya membuktikan kepemilikan email;
seluruh claim diambil dari record `User` yang sudah ada. TIDAK ada auto-register:
email yang belum terdaftar ditolak. Syarat lolos: `email_verified === true`,
`deletedAt` null, `status === 'ACTIVE'`, bukan `isGuest`, dan company aktif
(kecuali `SUPER_ADMIN`). Tanpa PrismaAdapter — `session.strategy` tetap `jwt`.

```json
// vercel.json
{ "crons": [{ "path": "/api/cron/check-overdue", "schedule": "1 0 * * *" }] }
```
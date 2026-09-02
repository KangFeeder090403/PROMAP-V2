# PRD ProMaP V2.2 — Final Revised

> Sumber: `ProMaP_V2.2_PRD_Final.docx` (September 2026) — dikonversi ke Markdown, isi utuh.
> Status: Active Development · Sifat: Rahasia / Internal Tim Dev
> Ringkasan operasional untuk agent ada di `.claude/CLAUDE.md`.

---

## BAB 1 — RINGKASAN PRODUK

ProMaP (Project Management Platform) adalah aplikasi SaaS berbasis web untuk membantu perusahaan mengelola proyek, divisi, tugas, dan action plan seluruh karyawan.

| Layer | Teknologi |
|---|---|
| Frontend + Backend | Next.js 14+ App Router — satu codebase full-stack |
| Database | PostgreSQL @ Neon (Serverless) |
| ORM | Prisma ORM + Prisma Studio |
| Deployment | Vercel (native Next.js, integrasi langsung ke Neon) |
| Autentikasi | NextAuth.js, JWT strategy |

### 1.1 Hierarki Work Item

```
Project → Objective → Task → Action Plan → Checklist
```

| Work Item | Dibuat Oleh | Deskripsi |
|---|---|---|
| Project | Admin / Manager | Tujuan besar atau inisiatif utama perusahaan/divisi |
| Objective | Admin / Manager | Sasaran terukur dalam sebuah Project (OKR-style) |
| Task | Manager | Delegasi resmi pekerjaan dari Manager ke PIC |
| Action Plan | PIC / Staff | Langkah taktis yang dibuat PIC untuk menyelesaikan Task-nya |
| Proposal | PIC / Staff | Ide/pekerjaan yang diusulkan Staff ke Manager, butuh approval |
| Personal Task | PIC / Staff | Pekerjaan pribadi mandiri, tidak menghitung ke progres tim |
| Checklist | PIC / Staff | Rincian terkecil di dalam Action Plan |

### 1.2 Value Proposition

- **Multi-tenant SaaS** — satu codebase melayani banyak perusahaan klien dengan isolasi data ketat
- **Fleksibilitas budaya kerja** — Top-Down (delegasi murni) dan Bottom-Up (staff buat proposal sendiri)
- **Evidence & Approval Workflow** — setiap penyelesaian tugas disertai bukti kerja dan disetujui Manager
- **Comment / Thread per AP** — komunikasi Manager ↔ PIC terpusat di dalam sistem
- **Label Jabatan Dinamis** — label PIC sesuai budaya perusahaan (Magang, Karyawan, dll)
- **Guest Demo Mode** — calon klien lihat demo dengan data simulasi sebelum berlangganan

---

## BAB 2 — USER PERSONA & RBAC

### 2.1 Daftar Role & Cakupan Data

| Role | Enum | Target User | Cakupan Data | Akses Utama |
|---|---|---|---|---|
| Super Admin | `SUPER_ADMIN` | Direktur / IT ProMaP | Lintas semua perusahaan | Full access semua fitur & perusahaan, kelola Leads |
| Admin Operasional | `ADMIN_OPERATIONAL` | HR / Direktur Klien | 1 perusahaan, semua divisi | Kelola divisi, user, label jabatan, project |
| Manager | `MANAGER` | Kepala Divisi | 1 divisi saja | Assign task, approve AP & evidence, usul label jabatan |
| PIC / Staff | `PIC` | Karyawan (label dinamis) | Milik sendiri saja | Buat AP, submit evidence, comment, ubah status |
| Guest | `GUEST` | Calon Klien (Demo) | Data dummy simulasi saja | View-only dashboard/kanban/kalender, CTA trial |

### 2.2 Label Jabatan Dinamis (UserLabel)

Role `PIC` adalah role **teknis sistem** untuk RBAC/permission. Label yang tampil di UI ditentukan Admin/Manager sesuai budaya perusahaan.

| Aktor | Hak Kelola Label | Catatan |
|---|---|---|
| Super Admin | Buat/Edit/Hapus — langsung aktif | Akses penuh semua label semua perusahaan |
| Admin Operasional | Buat/Edit/Hapus — langsung aktif | Hanya untuk perusahaannya sendiri |
| Manager | Usulkan label baru — status `PENDING` | Butuh approval Admin Ops sebelum aktif di dropdown |

Contoh label: Magang, Karyawan, Staff Senior, Koordinator, Operator, Freelancer.

### 2.3 RBAC Matrix

| Kapabilitas | Super Admin | Admin Ops | Manager | PIC | Guest |
|---|---|---|---|---|---|
| Manajemen Perusahaan & Subscription | ✅ | ❌ | ❌ | ❌ | ❌ |
| Kelola Leads & Data Prospek | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manajemen User (CRUD + Approval) | ✅ Global | ✅ 1 Co. | ❌ | ❌ | ❌ |
| Kelola Label Jabatan | ✅ Global | ✅ 1 Co. | ⏳ Usul | ❌ | ❌ |
| Kelola Divisi & Project | ✅ | ✅ | ✅ Div. | ❌ | ❌ |
| Assign Task ke PIC | ✅ | ✅ | ✅ | ❌ | ❌ |
| Buat / Edit Action Plan | ✅ | ✅ | ✅ | ✅ | ❌ |
| Submit Evidence | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve / Reject Evidence & AP | ✅ | ✅ | ✅ | ❌ | ❌ |
| Comment / Thread per AP | ✅ | ✅ | ✅ | ✅ | ❌ |
| Buat Proposal (Bottom-Up) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Buat Personal Task | ✅ | ✅ | ✅ | ✅ | ❌ |
| Kanban Board | ✅ Semua | ✅ Co. | ✅ Div. | ✅ Own | 👁 Demo |
| Dashboard & Analitik | ✅ Global | ✅ Co. | ✅ Div. | ✅ Own | 👁 Demo |
| Kalender & Gantt + Download | ✅ | ✅ | ✅ | ✅ | 👁 Demo |
| Export Laporan | ✅ | ✅ | ✅ | ❌ | ❌ |
| Notifikasi In-App | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## BAB 3 — FITUR UTAMA

### 3.1 Autentikasi & User Management

- Login email + password (NextAuth.js Credentials Provider)
- Google SSO opsional via NextAuth.js Google Provider
- JWT disimpan di **httpOnly cookie** (aman dari XSS)
- User baru status `PENDING` — butuh approval Admin Ops / Super Admin sebelum aktif
- Atasan langsung: 1 Manager membawahi beberapa PIC, 1 PIC hanya di bawah 1 Manager
- Setiap PIC punya label jabatan dari dropdown UserLabel perusahaannya

### 3.2 Guest Mode & Demo

**Flow:**
1. Calon klien klik "Coba Demo Gratis" di halaman login
2. Isi form: Nama Lengkap + Email + No HP + Nama Perusahaan
3. Data tersimpan di tabel `Lead` — Super Admin notif "Prospek baru masuk"
4. Guest masuk environment simulasi, data dummy hardcoded (bukan data real perusahaan manapun)
5. Setiap klik fitur aktif (buat/edit/export) → popup CTA "Aktivasi Trial 30 Hari"
6. Jika accept trial: `Lead` diupdate, countdown 30 hari mulai, Super Admin notif "Leads aktivasi trial"

**Batasan Teknis:**

| Parameter | Nilai / Aturan |
|---|---|
| Data yang ditampilkan | Dummy hardcoded — bukan data perusahaan real |
| Durasi session | Expired otomatis setelah 2 jam |
| Limit login per hari | Maksimal 3x login Guest dari 1 email yang sama |
| Fitur yang bisa diakses | Dashboard, Kanban, Kalender (view-only, data simulasi) |
| Fitur yang diblokir | Buat/Edit/Delete AP, Export, Settings, User Management |
| CTA Trigger | Popup muncul setiap kali Guest mencoba aksi aktif |
| Data form disimpan | Nama, Email, No HP, Nama Perusahaan → tabel `Lead` |

### 3.3 Proposal System (Bottom-Up)

- PIC/Staff mengusulkan pekerjaan/ide ke Manager tanpa menunggu ditugaskan
- Status: `DRAFT` → `SUBMITTED` → `APPROVED` (jadi Task resmi) / `REJECTED`
- Manager dapat approve proposal jadi Action Plan resmi, atau tolak dengan catatan
- **Fitur ini dapat dinonaktifkan per perusahaan klien oleh Admin Operasional**

### 3.4 Manajemen Action Plan

Action Plan dibuat PIC/Staff sebagai langkah taktis menyelesaikan Task.
Wajib diisi: Judul, Outcome/KPI, Prioritas, Start Date, End Date.

**Status Flow (8 status):**

| Status | Aktor | Keterangan |
|---|---|---|
| `NOT_STARTED` | Sistem | Status awal saat AP baru dibuat |
| `IN_PROGRESS` | PIC | PIC mulai mengerjakan AP |
| `PENDING_APPROVAL` | PIC | PIC selesai & submit untuk review Manager (wajib isi Evaluasi) |
| `EVIDENCE_REQUIRED` | Manager | Manager request PIC upload bukti kerja tambahan |
| `APPROVED` | Manager | Manager menyetujui hasil & evidence — AP selesai resmi |
| `REJECTED` | Manager | Manager menolak — PIC dapat catatan revisi, status kembali `IN_PROGRESS` |
| `OVERDUE` | Sistem | Auto-update Cron Job jika deadline terlewat & belum Complete |
| `COMPLETE` | Manager | AP resmi selesai setelah Approved & evidence diterima |

**Evidence & Complete Workflow:**
- Saat PIC submit `PENDING_APPROVAL`, modal wajib muncul:
  - Field "Hasil/Evaluasi" — deskripsi hasil kerja (**wajib**)
  - Field "Link Bukti Kerja" — URL Google Drive / file pendukung (opsional)
- Manager dapat: Approve · Request Evidence tambahan · Reject dengan catatan revisi
- Jika Reject: status kembali `IN_PROGRESS`, PIC notif + catatan Manager
- Jika Reassign: dialihkan ke PIC lain, sistem kirim notif otomatis ke PIC baru

### 3.5 Comment / Thread per Action Plan

- Section Comment di bagian bawah detail AP
- Semua user terlibat (PIC, Manager, Admin Ops, Super Admin) dapat menulis komentar
- Tampil kronologis (terbaru di bawah) dengan nama, label jabatan, timestamp
- Mendukung `@mention` — user yang di-mention dapat notifikasi
- **Komentar tidak dapat dihapus** (menjaga audit trail diskusi)
- Manager dapat menulis catatan revisi langsung di thread, tidak hanya via `reviewNote`

### 3.6 Kanban Board

- 5 kolom: Not Started → In Progress → Pending Approval → Overdue → Complete
- Drag & drop ubah status antar kolom (disertai popup konfirmasi)
- Multi-select checkbox + "Ubah Status Massal" untuk bulk action
- Kartu menampilkan: Prioritas badge (warna), nama AP, label jabatan PIC, Deadline
- Menu ⋮ per kartu: Edit, Reassign, Lihat Comment, Lihat Evidence, Delete

### 3.7 Dashboard & Analitik

- Donut Chart: proporsi status tugas — jumlah unit + persentase + tooltip interaktif
- Bar Chart: distribusi prioritas (High / Medium / Low)
- Bar Chart: produktivitas per PIC (completion rate)
- Footer metrics: Total Tugas, Selesai, In Progress, Overdue, Completion Rate (%)
- Semua chart difilter otomatis sesuai scope role (Global / Company / Division / Personal)

### 3.8 Kalender & Gantt View

- Tampilan kalender bulanan mirip Google Calendar
- Task multi-hari dirender sebagai bar horizontal (Gantt-style)
- Klik bar → popup detail (Nama AP, PIC, Label Jabatan, Status, Project, Divisi, Deadline)
- Sinkronisasi data real-time mencegah event double/tumpang tindih
- Navigasi bulan: panah kiri/kanan

**Download Kalender (per bulan):**
- Format PDF/PNG
- Layout KIRI — tabel daftar AP (Nama AP, PIC, Start Date, End Date)
- Layout KANAN — visual kalender Gantt dengan bar berwarna per AP
- Filter download mengikuti scope role pengguna

### 3.9 Filter & Pencarian

- Quick filter chips: Hari Ini / Minggu Ini / Bulan Ini
- Custom filter dropdown: Status, PIC, Label Jabatan, Divisi, Project, Priority, Date Range
- Sort: Terbaru→Terlama (default), Terlama→Terbaru, Deadline Terdekat, Prioritas Tertinggi
- Filter dapat ditumpuk (kombinasi multiple filter)
- Tombol Reset Filter
- Filter otomatis dikunci sesuai scope role — contoh: role PIC hanya bisa mencari AP dan Project Goal miliknya sendiri

### 3.10 Notifikasi In-App

- Ikon lonceng di header dengan badge counter merah (jumlah unread)
- Panel dropdown toggle — judul, pesan singkat, timestamp per notif
- Klik notif → navigasi langsung ke halaman/item terkait
- Tombol "Tandai Semua Dibaca" + klik individual mark as read

| Penerima | Trigger Notifikasi |
|---|---|
| PIC / Staff | Task baru di-assign · Task di-reassign ke orang lain · AP di-approve ✅ · AP di-reject / perlu revisi ❌ (beserta catatan) · Manager request evidence tambahan · Di-mention (@) dalam comment AP · Deadline H-1 · Status AP jadi Overdue |
| Manager | AP bawahan masuk `PENDING_APPROVAL` · PIC submit evidence baru · AP belum di-review >3 hari · Proposal baru dari PIC/Staff · Di-mention (@) · Task PIC jadi Overdue · Usulan label jabatan baru dari Manager lain (jika Admin Ops) |
| Admin Ops | User baru mendaftar (status Pending) · Manager mengusulkan label jabatan baru · Divisi baru dibuat |
| Super Admin | Prospek baru masuk (Guest isi form demo) · Guest aktivasi Trial 30 Hari · Perusahaan klien baru didaftarkan · Kapasitas database 70% dan 90% |

### 3.11 Laporan & Evaluasi

- Laporan progres per Project, per Divisi, per PIC
- Riwayat evidence dan catatan evaluasi per Action Plan
- Riwayat thread comment per AP tersedia di laporan detail
- Export ke PDF dan Excel
- Audit Log: riwayat perubahan status per AP (siapa, kapan, dari status apa ke apa)
- **Integrasi HRIS**: sistem mengirim data Action Plan per karyawan ke website HRIS perusahaan secara otomatis

---

## BAB 4 — PRISMA SCHEMA (PostgreSQL / Neon)

Simpan di `prisma/schema.prisma`, jalankan `npx prisma migrate dev`.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─── ENUMS ───────────────────────────────────────────────────

enum Role {
  SUPER_ADMIN
  ADMIN_OPERATIONAL
  MANAGER
  PIC
  GUEST
}

enum UserStatus {
  PENDING
  ACTIVE
  INACTIVE
}

enum UserLabelStatus {
  PENDING   // Diusulkan Manager, menunggu approval Admin Ops
  ACTIVE    // Sudah disetujui, tampil di dropdown
  REJECTED
}

enum Priority {
  HIGH
  MEDIUM
  LOW
}

enum ActionPlanStatus {
  NOT_STARTED
  IN_PROGRESS
  PENDING_APPROVAL
  EVIDENCE_REQUIRED
  APPROVED
  REJECTED
  OVERDUE
  COMPLETE
}

enum ProposalStatus {
  DRAFT
  SUBMITTED
  APPROVED
  REJECTED
}

enum LeadStatus {
  NEW           // Baru isi form demo
  TRIAL_ACTIVE  // Sudah aktivasi trial 30 hari
  CONVERTED     // Sudah jadi klien berbayar
  COLD          // Tidak ada respon
}

enum SubscriptionTier {
  BASIC
  PREMIUM
  ENTERPRISE
}

// ─── MODELS ──────────────────────────────────────────────────

model Company {
  id           String           @id @default(cuid())
  name         String
  uniqueCode   String           @unique
  logoUrl      String?
  subscription SubscriptionTier @default(BASIC)
  isActive     Boolean          @default(true)
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  deletedAt    DateTime?

  divisions     Division[]
  users         User[]
  projects      Project[]
  userLabels    UserLabel[]
  notifications Notification[]
}

// Label jabatan dinamis per perusahaan (Magang, Karyawan, dll)
model UserLabel {
  id            String          @id @default(cuid())
  companyId     String
  name          String          // "Magang", "Karyawan", "Koordinator", dll
  status        UserLabelStatus @default(ACTIVE)
  requestedById String?         // Jika diusulkan oleh Manager
  approvedById  String?         // Admin Ops yang approve
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  company Company @relation(fields: [companyId], references: [id])
  users   User[]
}

model User {
  id           String     @id @default(cuid())
  email        String     @unique
  name         String
  phone        String?
  password     String?
  role         Role       @default(PIC)
  status       UserStatus @default(PENDING)
  companyId    String?
  divisionId   String?
  supervisorId String?
  userLabelId  String?    // Label jabatan (Magang, Karyawan, dll)
  // Guest fields
  isGuest      Boolean    @default(false)
  guestExpiry  DateTime?  // Session expired 2 jam
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  deletedAt    DateTime?

  company       Company?   @relation(fields: [companyId], references: [id])
  division      Division?  @relation(fields: [divisionId], references: [id])
  userLabel     UserLabel? @relation(fields: [userLabelId], references: [id])
  supervisor    User?      @relation("Supervision", fields: [supervisorId], references: [id])
  subordinates  User[]     @relation("Supervision")
  assignedTasks Task[]     @relation("TaskPIC")
  createdTasks  Task[]     @relation("TaskCreator")
  actionPlans   ActionPlan[]
  proposals     Proposal[]
  comments      Comment[]
  notifications Notification[]
  activityLogs  ActivityLog[]
}

// Tabel Leads untuk tracking prospek dari Guest Demo
model Lead {
  id           String     @id @default(cuid())
  name         String
  email        String
  phone        String
  companyName  String
  status       LeadStatus @default(NEW)
  trialStartAt DateTime?
  trialEndAt   DateTime?
  loginCount   Int        @default(0)   // Track berapa kali login Guest
  lastLoginAt  DateTime?
  notes        String?    // Catatan follow-up dari Super Admin
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}

model Division {
  id          String    @id @default(cuid())
  name        String
  description String?
  companyId   String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  company     Company @relation(fields: [companyId], references: [id])
  users       User[]
  tasks       Task[]
  actionPlans ActionPlan[]
}

model Project {
  id          String    @id @default(cuid())
  name        String
  description String?
  companyId   String
  createdById String
  isActive    Boolean   @default(true)
  startDate   DateTime?
  endDate     DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  company Company @relation(fields: [companyId], references: [id])
  tasks   Task[]
}

model Task {
  id          String           @id @default(cuid())
  title       String
  description String?
  projectId   String
  divisionId  String
  picId       String
  createdById String
  priority    Priority         @default(MEDIUM)
  status      ActionPlanStatus @default(NOT_STARTED)
  startDate   DateTime?
  endDate     DateTime?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  deletedAt   DateTime?

  project     Project  @relation(fields: [projectId], references: [id])
  division    Division @relation(fields: [divisionId], references: [id])
  pic         User     @relation("TaskPIC", fields: [picId], references: [id])
  createdBy   User     @relation("TaskCreator", fields: [createdById], references: [id])
  actionPlans ActionPlan[]
}

model ActionPlan {
  id             String           @id @default(cuid())
  taskId         String?
  picId          String
  divisionId     String
  companyId      String
  title          String
  outcomeKpi     String
  priority       Priority         @default(MEDIUM)
  status         ActionPlanStatus @default(NOT_STARTED)
  startDate      DateTime
  endDate        DateTime
  isPersonal     Boolean          @default(false)
  // Evidence & Approval
  evaluationNote String?          // Diisi PIC saat submit
  evidenceLink   String?          // Link bukti kerja
  reviewNote     String?          // Catatan Manager (approve/reject/revisi)
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  deletedAt      DateTime?

  task         Task?    @relation(fields: [taskId], references: [id])
  pic          User     @relation(fields: [picId], references: [id])
  division     Division @relation(fields: [divisionId], references: [id])
  checklists   Checklist[]
  comments     Comment[]
  activityLogs ActivityLog[]
}

// Thread diskusi per Action Plan
model Comment {
  id           String   @id @default(cuid())
  actionPlanId String
  authorId     String
  content      String   // Mendukung @mention dengan format @userId
  createdAt    DateTime @default(now())
  // Tidak ada updatedAt/deletedAt — komentar tidak bisa dihapus (audit trail)

  actionPlan ActionPlan @relation(fields: [actionPlanId], references: [id])
  author     User       @relation(fields: [authorId], references: [id])
}

model Checklist {
  id           String   @id @default(cuid())
  actionPlanId String
  title        String
  isDone       Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  actionPlan ActionPlan @relation(fields: [actionPlanId], references: [id])
}

model Proposal {
  id          String         @id @default(cuid())
  proposerId  String
  title       String
  description String
  status      ProposalStatus @default(DRAFT)
  reviewNote  String?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  proposer User @relation(fields: [proposerId], references: [id])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  companyId String?
  title     String
  message   String
  link      String?  // URL navigasi saat notif diklik
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user    User     @relation(fields: [userId], references: [id])
  company Company? @relation(fields: [companyId], references: [id])
}

model ActivityLog {
  id           String   @id @default(cuid())
  userId       String
  actionPlanId String?
  action       String   // STATUS_CHANGED | EVIDENCE_SUBMITTED | COMMENT_ADDED | REASSIGNED
  oldValue     String?
  newValue     String?
  createdAt    DateTime @default(now())

  user       User        @relation(fields: [userId], references: [id])
  actionPlan ActionPlan? @relation(fields: [actionPlanId], references: [id])
}
```

---

## BAB 5 — API ROUTES (Next.js App Router)

### 5.1 Auth & Guest

| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/auth/register` | Registrasi user baru (status `PENDING`) |
| POST | `/api/auth/login` | Login email + password, return JWT |
| GET | `/api/auth/profile` | Ambil profil user yang sedang login |
| POST | `/api/auth/logout` | Logout, hapus session/cookie |
| POST | `/api/guest/register` | Guest isi form demo → simpan ke `Lead`, return session terbatas |
| POST | `/api/guest/activate-trial` | Guest aktivasi trial 30 hari → update Lead status |

### 5.2 Perusahaan, Divisi, User & Label

| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/companies` | List perusahaan (Super Admin) |
| POST | `/api/companies` | Buat perusahaan baru |
| PUT | `/api/companies/[id]` | Update perusahaan |
| DELETE | `/api/companies/[id]` | Soft delete perusahaan |
| GET | `/api/divisions` | List divisi (filter by companyId) |
| POST | `/api/divisions` | Buat divisi baru |
| PUT | `/api/divisions/[id]` | Update divisi |
| GET | `/api/users` | List user (filter by scope) |
| POST | `/api/users` | Buat user baru |
| PUT | `/api/users/[id]` | Update user (role, divisi, label, supervisor) |
| PUT | `/api/users/[id]/approve` | Approve user Pending → Active |
| GET | `/api/user-labels` | List label jabatan (filter by companyId) |
| POST | `/api/user-labels` | Buat label baru (Super Admin/Admin Ops: aktif; Manager: pending) |
| PUT | `/api/user-labels/[id]/approve` | Admin Ops approve/reject usulan label dari Manager |
| DELETE | `/api/user-labels/[id]` | Hapus label jabatan |

### 5.3 Project, Task, Action Plan & Comment

| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/projects` | List project (filter by scope) |
| POST | `/api/projects` | Buat project baru |
| PUT | `/api/projects/[id]` | Update project |
| GET | `/api/tasks` | List task (filter by scope) |
| POST | `/api/tasks` | Buat & assign task ke PIC |
| PUT | `/api/tasks/[id]` | Update task |
| GET | `/api/action-plans` | List AP (filter + sort) |
| POST | `/api/action-plans` | Buat AP baru |
| PUT | `/api/action-plans/[id]` | Update AP |
| PUT | `/api/action-plans/[id]/submit` | PIC submit AP + evidence |
| PUT | `/api/action-plans/[id]/review` | Manager approve/reject/request evidence |
| PUT | `/api/action-plans/[id]/reassign` | Reassign AP ke PIC lain |
| GET | `/api/action-plans/[id]/comments` | List comment per AP (kronologis) |
| POST | `/api/action-plans/[id]/comments` | Tambah comment baru (support @mention) |

### 5.4 Proposal, Dashboard, Kalender, Laporan & Leads

| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/proposals` | List proposal |
| POST | `/api/proposals` | Buat proposal baru |
| PUT | `/api/proposals/[id]/review` | Approve/reject proposal |
| GET | `/api/dashboard` | Data statistik (scope by role) |
| GET | `/api/calendar` | Data kalender Gantt (filter month/scope) |
| GET | `/api/calendar/export` | Export kalender PDF/PNG per bulan |
| GET | `/api/notifications` | List notif (unread first) |
| PUT | `/api/notifications/read-all` | Tandai semua notif dibaca |
| GET | `/api/reports` | Laporan progres (filter project/divisi/PIC) |
| GET | `/api/reports/export` | Export laporan PDF/Excel |
| GET | `/api/leads` | List prospek Guest (Super Admin only) |
| PUT | `/api/leads/[id]` | Update notes/status lead (follow-up) |
| POST | `/api/cron/check-overdue` | Cron: auto-update status Overdue + kirim notif |

---

## BAB 6 — STRUKTUR FOLDER & DEPLOYMENT

### 6.1 Struktur Folder

```
promap-v2/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── demo/page.tsx              ← Guest form demo
│   ├── (dashboard)/
│   │   ├── layout.tsx                 ← Sidebar + Header + NotifBell
│   │   ├── page.tsx                   ← Dashboard utama
│   │   ├── action-plans/page.tsx
│   │   ├── kanban/page.tsx
│   │   ├── calendar/page.tsx
│   │   ├── proposals/page.tsx
│   │   ├── projects/page.tsx
│   │   ├── reports/page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       ├── user-labels/page.tsx   ← Kelola label jabatan
│   │       └── leads/page.tsx         ← Data prospek Guest (Super Admin)
│   └── api/
│       ├── auth/
│       ├── guest/
│       │   ├── register/
│       │   └── activate-trial/
│       ├── companies/
│       ├── divisions/
│       ├── users/
│       ├── user-labels/
│       ├── projects/
│       ├── tasks/
│       ├── action-plans/
│       │   └── [id]/
│       │       ├── submit/
│       │       ├── review/
│       │       ├── reassign/
│       │       └── comments/
│       ├── proposals/
│       ├── dashboard/
│       ├── calendar/
│       │   └── export/
│       ├── notifications/
│       ├── reports/
│       │   └── export/
│       ├── leads/
│       └── cron/
│           └── check-overdue/
├── components/
│   ├── ui/                  ← Button, Modal, Badge, Dropdown
│   ├── kanban/              ← KanbanBoard, KanbanCard
│   ├── calendar/            ← CalendarView, EventBar, DownloadModal
│   ├── charts/              ← DonutChart, BarChart
│   ├── comments/            ← CommentThread, CommentInput, MentionPicker
│   ├── notifications/       ← NotifBell, NotifPanel
│   ├── guest/               ← GuestDemoForm, GuestCTAPopup
│   └── forms/
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── rbac.ts
│   ├── notifications.ts
│   └── mentions.ts          ← Parse & resolve @mention
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── middleware.ts
├── vercel.json
└── .env.local
```

### 6.2 Environment Variables

| Variable | Sumber / Keterangan |
|---|---|
| `DATABASE_URL` | Neon → Connection String (pooled, untuk runtime) |
| `DIRECT_URL` | Neon → Connection String (direct, untuk prisma migrate) |
| `NEXTAUTH_SECRET` | Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` (dev) / URL Vercel (prod) |
| `GOOGLE_CLIENT_ID` | Google Cloud Console (jika pakai Google SSO) |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console (jika pakai Google SSO) |

### 6.3 Deployment Stack

| Komponen | Platform | Catatan |
|---|---|---|
| Frontend + API | Vercel | Auto-deploy dari GitHub, native Next.js |
| Database | Neon Serverless | Auto-sleep, scale-to-zero, free tier tersedia |
| ORM / Migration | Prisma | `npx prisma migrate deploy` saat setiap deploy |
| Cron Job | Vercel Cron | `vercel.json` — berjalan 00:01 harian |
| File Storage | Vercel Blob | Attachment evidence/bukti kerja PIC |
| Calendar Export | Puppeteer / jsPDF | Generate PDF kalender per bulan (server-side) |

**vercel.json:**
```json
{
  "crons": [{ "path": "/api/cron/check-overdue", "schedule": "1 0 * * *" }]
}
```

---

## BAB 7 — ROADMAP PENGEMBANGAN V2

| # | Modul | Deliverable | Status |
|---|---|---|---|
| 1 | Setup & Auth | Next.js + Prisma + Neon, Login, Register, JWT, RBAC middleware | In Progress |
| 2 | Company & Division | CRUD Perusahaan, CRUD Divisi, Onboarding klien baru | Planned |
| 3 | User Management | CRUD User, approval Pending→Active, supervisor assignment | Planned |
| 4 | Label Jabatan | CRUD UserLabel, alur approval Manager→Admin Ops, dropdown dinamis | Planned |
| 5 | Guest Mode & Leads | Form demo Guest, simpan Leads, session 2 jam, limit 3x/hari, CTA trial | Planned |
| 6 | Project & Task | CRUD Project, CRUD Task, assign PIC, multi-tenant filter | Planned |
| 7 | Proposal System | Buat proposal, review Manager, convert ke Task resmi | Planned |
| 8 | Action Plan | CRUD AP, Outcome/KPI, 8 status flow lengkap | Planned |
| 9 | Evidence & Approval | Submit evidence modal, review flow Approve/Revisi/Reject, reassign | Planned |
| 10 | Comment & @Mention | Thread per AP, @mention, notif ke user yang di-mention | Planned |
| 11 | Dashboard & Chart | Donut chart, bar chart, metrics footer, filter scope per role | Planned |
| 12 | Notifikasi | In-app notif, bell + badge, semua trigger event, navigasi klik | Planned |
| 13 | Kanban Board | Drag & drop, multi-select, bulk status, konfirmasi popup | Planned |
| 14 | Kalender + Download | Monthly view, Gantt bar, popup detail, export PDF per bulan | Planned |
| 15 | Filter & Sort | Quick chips, multi-filter, sort waktu/deadline/prioritas, reset | Planned |
| 16 | Cron Job Overdue | Vercel Cron 00:01, auto-update status Overdue + notif PIC & Manager | Planned |
| 17 | Laporan & Export | Report per project/divisi/PIC + riwayat evidence & comment, PDF/Excel | Planned |
| 18 | Audit Log | ActivityLog per AP: siapa, kapan, perubahan status apa | Planned |

### Roadmap V3 (Future)

| # | Modul | Deskripsi |
|---|---|---|
| 1 | Recurring Task | AP rutin otomatis terbuat ulang sesuai jadwal (harian/mingguan/bulanan) |
| 2 | Template AP | Manager/Admin buat template AP standar yang bisa dipakai berulang |
| 3 | Workload View | Tampilan kapasitas beban kerja per PIC sebelum Manager assign task baru |
| 4 | Task Dependency | AP B tidak bisa dimulai sebelum AP A selesai |
| 5 | @Mention Advanced | Mention di luar comment (di deskripsi AP, proposal, dll) |
| 6 | PWA / Mobile | Convert Next.js ke PWA untuk akses mobile yang lebih baik |

---

## LARANGAN KERAS

```
❌ Query Prisma tanpa filter companyId (kecuali Super Admin)
❌ Password plaintext — wajib bcrypt
❌ JWT di localStorage — wajib httpOnly cookie
❌ Hard delete — wajib soft delete (deletedAt)
❌ Delete Comment — tidak bisa dihapus (audit trail)
❌ prisma migrate tanpa review schema dulu
❌ Push langsung ke main — wajib PR
❌ Main Agent nulis kode sebelum Reviewer ACC
```

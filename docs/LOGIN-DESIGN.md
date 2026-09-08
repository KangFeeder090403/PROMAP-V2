# ProMaP Login — Modern Enterprise SaaS

> Design specification untuk halaman autentikasi ProMaP.
> Referensi stitch: `docs/design-reference/ui-2-login-guest.png`.
> Arah seni: **modern premium & airy** (Linear/Vercel — restraint tapi canggih).
> Prinsip copy: **anti-teknis** — semua istilah engineering dibuang dari halaman publik.

---

## Layout Overview

```
┌────────────────────────────────────────────────────────────┐
│  Top Bar (dark #0F172A, border-b) — brand + panduan akses  │
├────────────────────────────────────────────────────────────┤
│  Main (max-w-7xl, centered)                                 │
│  ┌───────────────────────────────┬──────────────────────┐  │
│  │  Hero (kiri, dark)            │  Login Card (kanan)  │  │
│  │  - tagline / headline         │  Header + Tabs       │  │
│  │  - gradient headline          │  Enterprise │ Guest  │  │
│  │  - 4 role badges              │  - email · password  │  │
│  │  - trust note "Data aman"     │  - CTA · Google SSO  │  │
│  └───────────────────────────────┴──────────────────────┘  │
├────────────────────────────────────────────────────────────┤
│  System Footer (dark) — copyright + legal links            │
└────────────────────────────────────────────────────────────┘
```

- Seluruh halaman berlatar `#0F172A` (dark), card login putih kontras.
- Mobile: hero collapse di atas, card full-width di bawah.

---

## 1. Top Bar

| Bagian | Konten |
|---|---|
| Brand mark | gradient blue→indigo, ikon centang |
| Nama | **ProMaP** (font-bold, 18px) |
| Deskripsi | "Platform Eksekusi & Tata Kelola Tim" |
| Link kanan | "Panduan Hak Akses" (ikon shield) |

> Tanpa badge `v2.4`, tanpa status "Neon DB & NextAuth Connected", tanpa "RBAC".

---

## 2. Hero (Kiri)

### 2.1 Tagline badge
Pill halus dengan dot hijau: **"Sebuah ruang kerja untuk semua ide tim Anda"**

### 2.2 Headline
- Font extrabold, tracking-tight, putih.
- Baris kedua pakai gradient `from-blue-400 via-sky-300 to-indigo-300`.
- Teks: "Satu Tempat untuk / **Mengubah Rencana Menjadi Nyata.**"

### 2.3 Subcopy
"Rapikan alur kerja tim Anda — dari ide, tugas, hingga aksi nyata. Setiap langkah tercatat, setiap penyelesaian terbukti, dan setiap pencapaian terukur dalam satu wadah yang sama."

### 2.4 Role badges (2×2 / 4-garis)
Tiap badge: ikon berwarna dalam kotak rounded + nama role + deskripsi hangat.

| Role | Warna ikon | Deskripsi |
|---|---|---|
| SUPER_ADMIN | blue | Pantau semua tenant & alur prospek |
| ADMIN_OPS | indigo | Kelola seluruh divisi satu perusahaan |
| MANAGER | emerald | Tinjau & setujui pekerjaan divisi |
| PIC | amber | Eksekusi tugas & unggah bukti |

> Label display `ADMIN_OPS` (dari stitch). Nilai teknis di enum tetap `ADMIN_OPERATIONAL`.

### 2.5 Trust note (bukan teknis)
Ikon shield emerald + judul "Data Anda terlindungi" + kalimat hangat tentang akses berwenang. **Tanpa** bcrypt/JWT/cookie/localStorage/Company ID/§G4.

---

## 3. Login Card (Kanan)

### 3.1 Header
- Judul: "Masuk ke Workspace"
- Subtitle: "Pilih metode autentikasi sesuai otorisasi Anda"
- Ikon key di pojok kanan.

### 3.2 Tabs (underline-style)
- **Akun Perusahaan** (ikon building) — aktif, garis biru
- **Guest Demo** (ikon sparkles amber + badge "Trial") — garis amber

### 3.3 Enterprise form (`LoginForm`)
- Email (ikon mail, label "Alamat Email")
- Kata Sandi (ikon lock + eye toggle + "Lupa kata sandi?")
- CTA biru: "Masuk ke Workspace ProMaP" + panah
- Divider "Atau lanjutkan dengan"
- Tombol SSO: "Lanjut dengan Google" (setup env menyusul)

> **Tidak** menampilkan: field "Kode Unik Tenant" (PRD line 230 — bukan MVP) & checkbox "Simpan sesi" (PRD line 262-263 — NextAuth pakai maxAge tetap).

### 3.4 Guest tab (`GuestDemoPanel`)
- Alert amber: "Jelajahi ProMaP secara gratis"
- Field: Nama · Email Bagian · No. Handphone/WA · Nama Perusahaan
- Info bawah: "Sesi demo berakhir otomatis" + "Gratis, tanpa kartu kredit"
- CTA amber: "Mulai Akses Guest (Trial 2 Jam)" + ikon zap
- State: checking (skeleton) / active / expired / form

### 3.5 Card footer
Centered trust: ikon shield emerald + "Aman. Terpercaya. Siap membantu tim Anda."
> Tanpa "TLS 1.3...", tanpa "Build 2026.09.V2.4".

---

## 4. System Footer
- © 2026 ProMaP Precision Enterprise. Hak Cipta Dilindungi.
- Link: Ketentuan Layanan · Kebijakan Privasi · Status Layanan
- Tanpa "Next.js 14+ App Router & Prisma 7.10".

---

## 5. Desain Prinsip
- **Airy**: banyak whitespace, spacing kelipatan 4px, hirarki jelas.
- **Restraint**: satu aksen biru, sisanya neutral/gelap.
- **Satu layer**: card putih bersih, hindari kotak bertumpuk (beda dari stitch yang ber-lapis).
- **Anti-teknis**: istilah engineering (PRD §, bcrypt, JWT, Prisma, RBAC, NextAuth, drip) tidak muncul di UI.

---

## 6. Komponen & File Mapping

| Komponen | File |
|---|---|
| Layout (top bar + main + footer) | `app/(auth)/layout.tsx` |
| Top bar | `components/auth/AuthTopBar.tsx` |
| Hero | `components/auth/AuthHero.tsx` |
| Login card wrapper | `components/auth/AuthCard.tsx` |
| Form enterprise | `components/auth/LoginForm.tsx` |
| Guest demo | `components/auth/GuestDemoPanel.tsx` |
| System footer | `components/auth/AuthSystemFooter.tsx` |
| Skeleton | `components/auth/AuthFormSkeleton.tsx` |

---

## 7. Implementasi Notes
- Font: Inter Variable.
- Ikon: Lucide React.
- Library: Next.js App Router, Tailwind, shadcn/ui (Tabs), react-hook-form + Zod.
- Auth: NextAuth.js credentials; Google SSO tombol ready (setup env menyusul).
- Tenancy: isolasi per Company ID (backend), tanpa input tenant di UI.

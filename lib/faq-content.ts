import type { Role } from '@/lib/generated/prisma/client'

export interface FaqItem {
  id: string
  question: string
  answer: string
  category: 'workflow' | 'roles' | 'navigation' | 'features'
  roles: Role[]
  relatedRoutes: string[]
  tags: string[]
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-ap-status-workflow',
    question: 'Bagaimana alur siklus kerja 8 Status Action Plan?',
    answer:
      'Action Plan melalui 8 status kerja terstruktur:\n' +
      '1. NOT_STARTED: Rencana kerja telah dibuat namun belum dieksekusi.\n' +
      '2. IN_PROGRESS: Sedang dalam tahap pengerjaan aktif oleh PIC.\n' +
      '3. PENDING_APPROVAL: PIC mengajukan hasil kerja untuk ditinjau oleh Manager atau pembuat task.\n' +
      '4. EVIDENCE_REQUIRED: Peninjau meminta bukti dukung tambahan sebelum menyetujui.\n' +
      '5. APPROVED: Hasil kerja dan bukti pendukung disetujui oleh atasan.\n' +
      '6. COMPLETE: Tahap akhir penyelesaian rencana aksi secara definitif.\n' +
      '7. REJECTED: Pengajuan ditolak dengan alasan catatan revisi, status kembali ke IN_PROGRESS.\n' +
      '8. OVERDUE: Penanda otomatis sistem saat tanggal tenggat terlampaui dan status belum Complete.',
    category: 'workflow',
    roles: ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER', 'PIC', 'GUEST'],
    relatedRoutes: ['/action-plans', '/board', '/my-work'],
    tags: ['status', 'action plan', 'siklus', 'approval', 'workflow', 'overdue'],
  },
  {
    id: 'faq-kanban-board-columns',
    question: 'Bagaimana relasi Papan Kanban 5 Kolom dengan 8 Status dan badge OVERDUE?',
    answer:
      'Papan Kanban menyederhanakan visualisasi kerja ke dalam 5 kolom terpadu:\n' +
      '- Not Started: Menampung status NOT_STARTED.\n' +
      '- In Progress: Menampung status IN_PROGRESS.\n' +
      '- Review: Menampung status PENDING_APPROVAL dan EVIDENCE_REQUIRED.\n' +
      '- Needs Revision: Menampung status REJECTED yang perlu perbaikan.\n' +
      '- Done: Menampung status APPROVED dan COMPLETE.\n\n' +
      'Catatan: OVERDUE bukan nama kolom, melainkan penanda badge merah pada kartu jika target tanggal tenggat terlewati.',
    category: 'workflow',
    roles: ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER', 'PIC', 'GUEST'],
    relatedRoutes: ['/board', '/action-plans'],
    tags: ['kanban', 'board', 'kolom', 'overdue', 'badge', 'review'],
  },
  {
    id: 'faq-personal-vs-task-ap',
    question: 'Apa perbedaan Action Plan Personal vs Action Plan Terkait Task?',
    answer:
      'Perbedaan mendasar terletak pada kepemilikan dan jalur persetujuan:\n' +
      '- Action Plan Terkait Task: Terikat pada proyek atau tugas terdistribusi. Wajib melalui peninjauan (review) dan persetujuan Manager atau penugasan sebelum berstatus Approved atau Complete.\n' +
      '- Action Plan Personal: Inisiatif kerja mandiri PIC tanpa asosiasi task proyek. PIC memiliki kewenangan penuh memperbarui dan menyelesaikan item secara mandiri tanpa memerlukan alur approval berjenjang.',
    category: 'workflow',
    roles: ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER', 'PIC', 'GUEST'],
    relatedRoutes: ['/action-plans', '/my-work', '/tasks'],
    tags: ['personal', 'task', 'mandiri', 'approval', 'review'],
  },
  {
    id: 'faq-evidence-requirement',
    question: 'Mengapa status menjadi EVIDENCE_REQUIRED dan apa bentuk bukti yang valid?',
    answer:
      'Status EVIDENCE_REQUIRED ditetapkan ketika peninjau membutuhkan verifikasi faktual atas klaim penyelesaian kerja.\n' +
      'Bukti dukung yang sah mencakup:\n' +
      '- Tautan dokumen publik atau cloud storage (Google Drive, Docs, Figma, repositori kode).\n' +
      '- Laporan kerja terperinci yang dicantumkan pada deskripsi evidens atau catatan aktivitas.\n' +
      'Setelah tautan bukti diunggah oleh PIC, status beralih kembali ke antrean peninjauan Manager.',
    category: 'workflow',
    roles: ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER', 'PIC'],
    relatedRoutes: ['/action-plans', '/board', '/my-work'],
    tags: ['evidence', 'bukti', 'verifikasi', 'dokumen', 'tautan'],
  },
  {
    id: 'faq-role-matrix-permissions',
    question: 'Bagaimana pembagian matriks hak akses 5 Role di ProMaP?',
    answer:
      'Hak akses data didasarkan pada isolasi tenant dan peran pengguna:\n' +
      '- Super Admin: Akses lintas perusahaan, manajemen tenant, audit menyeluruh, dan monitoring sistem.\n' +
      '- Admin Operational: Akses penuh dalam satu perusahaan, manajemen divisi, pengguna, persetujuan label jabatan, dan template proposal.\n' +
      '- Manager: Akses dalam satu divisi kerja, penugasan task, peninjauan proposal, review action plan, serta pemantauan beban tim.\n' +
      '- PIC: Akses ke task yang ditugaskan, pengelolaan action plan mandiri, pengunggahan bukti kerja, dan halaman My Work pribadi.\n' +
      '- Guest: Akses baca terbatas pada data simulasi demo tanpa izin modifikasi data produksi.',
    category: 'roles',
    roles: ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER', 'PIC', 'GUEST'],
    relatedRoutes: ['/settings', '/dashboard'],
    tags: ['role', 'hak akses', 'rbac', 'super admin', 'manager', 'pic', 'scope'],
  },
  {
    id: 'faq-proposal-workflow',
    question: 'Bagaimana alur pengajuan dan persetujuan Proposal Proyek?',
    answer:
      'Alur kerja proposal proyek:\n' +
      '1. Pembuatan draf proposal dengan rincian anggaran, sasaran, jadwal, dan estimasi beban kerja.\n' +
      '2. Pengajuan proposal kepada Manager divisi terkait atau Admin Operasional.\n' +
      '3. Review formal: Evaluator dapat memberikan status APPROVED, REJECTED, atau meminta revisi parsial.\n' +
      '4. Setelah proposal disetujui, proyek dapat diinisiasi dan dipecah ke dalam struktur task serta action plan tim.',
    category: 'workflow',
    roles: ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER', 'GUEST'],
    relatedRoutes: ['/proposals', '/projects'],
    tags: ['proposal', 'approval', 'proyek', 'anggaran', 'pengajuan'],
  },
  {
    id: 'faq-my-work-navigation',
    question: 'Bagaimana mengoptimalkan halaman My Work untuk fokus kerja harian PIC?',
    answer:
      'Halaman My Work dirancang khusus sebagai pusat kerja personal:\n' +
      '- Bagian Butuh Aksi: Menampilkan daftar tugas dan rencana kerja yang memerlukan tindakan segera (revisi, permintaan bukti, persetujuan menunggu).\n' +
      '- Bagian Tenggat Terdekat: Menyusun urutan prioritas kerja berdasarkan kedekatan batas waktu (H-3, H-1, Hari H).\n' +
      '- Metrik Ringkas: Menghitung persentase ketercapaian target mingguan dan jumlah item yang telah selesai.',
    category: 'navigation',
    roles: ['MANAGER', 'PIC', 'GUEST'],
    relatedRoutes: ['/my-work', '/dashboard'],
    tags: ['my work', 'tenggat', 'prioritas', 'harian', 'fokus'],
  },
  {
    id: 'faq-filter-sort-export',
    question: 'Bagaimana cara menggunakan fitur Filter, Sort, dan Ekspor Laporan?',
    answer:
      'Fitur penyaringan dan ekspor data tersedia di bilah alat atas setiap modul:\n' +
      '- Filter: Menyaring data berdasarkan status, prioritas, PIC penanggung jawab, rentang tanggal, atau divisi.\n' +
      '- Sort: Mengurutkan item berdasarkan tenggat terdekat, tanggal dibuat, atau abjad.\n' +
      '- Ekspor: Pada modul laporan dan kalender, gunakan tombol ekspor untuk mengunduh format CSV data tabular, PDF ringkasan, atau berkas ICS untuk sinkronisasi kalender kerja.',
    category: 'features',
    roles: ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER', 'PIC', 'GUEST'],
    relatedRoutes: ['/reports', '/calendar', '/action-plans', '/projects'],
    tags: ['filter', 'sort', 'ekspor', 'csv', 'pdf', 'ics', 'laporan'],
  },
  {
    id: 'faq-theme-toggle',
    question: 'Bagaimana cara mengubah tema tampilan antarmuka (Light dan Dark)?',
    answer:
      'Peralihan tema dapat diakses langsung melalui tombol ikon tema di bagian kanan atas Header aplikasi:\n' +
      '- Klik ikon Matahari atau Bulan untuk beralih antara Light Theme dan Dark Theme secara instan.\n' +
      '- Preferensi tema Anda tersimpan di peramban dan dipertahankan saat membuka halaman lain.',
    category: 'features',
    roles: ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER', 'PIC', 'GUEST'],
    relatedRoutes: ['/dashboard', '/settings'],
    tags: ['theme', 'dark mode', 'light mode', 'tampilan', 'header'],
  },
  {
    id: 'faq-checklist-and-audit-log',
    question: 'Bagaimana aturan checklist Action Plan dan pencatatan riwayat audit trail?',
    answer:
      'Aturan integritas data pada rencana aksi:\n' +
      '- Sub-tugas Checklist: Setiap item checklist merepresentasikan milestone mikro. Persentase progres dihitung otomatis berdasarkan proporsi checklist terselesaikan.\n' +
      '- Audit Trail Terproteksi: Seluruh perubahan status, pengeditan teks, reassign PIC, dan pengunggahan bukti dicatat ke dalam Activity Log permanen.\n' +
      '- Catatan audit dan riwayat komentar tidak dapat dihapus demi kepatuhan tata kelola kerja.',
    category: 'features',
    roles: ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER', 'PIC', 'GUEST'],
    relatedRoutes: ['/action-plans', '/audit-log'],
    tags: ['checklist', 'audit', 'activity log', 'riwayat', 'integritas'],
  },
  {
    id: 'faq-notification-triggers',
    question: 'Kapan notifikasi otomatis dikirimkan dan apa pemicunya?',
    answer:
      'Sistem ProMaP memicu notifikasi berbasis peristiwa secara otomatis:\n' +
      '- PIC menerima notifikasi saat ditugaskan task baru, action plan disetujui/ditolak, permintaan bukti diajukan, batas waktu H-1, atau berstatus Overdue.\n' +
      '- Manager menerima notifikasi ketika ada pengajuan approval baru, unggahan bukti, proposal baru masuk, atau laporan keterlambatan anggota tim.\n' +
      '- Notifikasi ditampilkan pada lonceng di header dan diperbarui secara berkala.',
    category: 'workflow',
    roles: ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER', 'PIC'],
    relatedRoutes: ['/dashboard', '/my-work'],
    tags: ['notifikasi', 'lonceng', 'reminder', 'tenggat', 'h-1'],
  },
  {
    id: 'faq-support-escalation',
    question: 'Bagaimana prosedur eskalasi kendala teknis dan kontak bantuan?',
    answer:
      'Jika mengalami kendala hak akses, akun, atau konfigurasi sistem:\n' +
      '1. Hubungi Manager divisi untuk penyesuaian penugasan task atau revisi alur kerja.\n' +
      '2. Hubungi Admin Operasional perusahaan Anda untuk reset kata sandi, perubahan label jabatan, atau pendaftaran anggota baru.\n' +
      '3. Hubungi Super Admin organisasi jika terjadi kendala langganan tenant atau gangguan teknis infrastruktur aplikasi.',
    category: 'roles',
    roles: ['SUPER_ADMIN', 'ADMIN_OPERATIONAL', 'MANAGER', 'PIC', 'GUEST'],
    relatedRoutes: ['/settings', '/dashboard'],
    tags: ['bantuan', 'eskalasi', 'kontak', 'dukungan', 'admin'],
  },
]

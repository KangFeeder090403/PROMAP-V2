import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing/LandingPage'

export const metadata: Metadata = {
  title: 'ProMaP — Platform Eksekusi & Pemantauan Rencana Kerja Perusahaan',
  description:
    'Platform SaaS manajemen action plan berbasis bukti kerja. Delegasi, eksekusi, evidence, approval, laporan — semua dalam satu workspace tim. Coba demo gratis 30 hari.',
}

export default function RootPage() {
  return <LandingPage />
}

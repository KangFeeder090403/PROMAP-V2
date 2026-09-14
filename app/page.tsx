import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { LandingPage } from '@/components/landing/LandingPage'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ProMaP — Platform Eksekusi & Pemantauan Rencana Kerja Perusahaan',
  description:
    'Platform SaaS manajemen action plan berbasis bukti kerja. Delegasi, eksekusi, evidence, approval, laporan — semua dalam satu workspace tim. Coba demo gratis 30 hari.',
}

/**
 * Root page — ditangani langsung di server tanpa middleware rewrite.
 * - Guest     → tampilkan landing page (URL tetap http://localhost:3000)
 * - Logged in → redirect ke /projects (halaman utama dashboard)
 */
export default async function RootPage() {
  const session = await getServerSession(authOptions)

  if (session?.user?.id) {
    redirect('/projects')
  }

  return <LandingPage />
}

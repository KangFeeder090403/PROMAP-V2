import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ProMaP — Project Management Platform',
  description: 'SaaS multi-tenant untuk manajemen proyek, tugas, dan action plan.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}

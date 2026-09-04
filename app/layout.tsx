import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'ProMaP — Project Management Platform',
  description: 'SaaS multi-tenant untuk manajemen proyek, tugas, dan action plan.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="font-sans bg-slate-50">{children}</body>
    </html>
  )
}

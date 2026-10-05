import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'ProMaP — Project Management Platform',
  description: 'SaaS multi-tenant untuk manajemen proyek, tugas, dan action plan.',
}

// Jalan sebelum paint pertama supaya tidak ada kedip putih saat tema gelap aktif.
// Default selalu mode terang resmi ProMaP. Mode gelap hanya aktif jika user memilihnya via ThemeToggle.
const themeScript = `
try {
  var p = window.location.pathname
  if (p !== '/' && p !== '/landing') {
    var t = localStorage.getItem('promap-theme')
    if (t === 'dark') document.documentElement.classList.add('dark')
  }
} catch (e) {}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans bg-slate-50 dark:bg-slate-900">
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}

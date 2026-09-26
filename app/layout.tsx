import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ProMaP — Project Management Platform',
  description: 'SaaS multi-tenant untuk manajemen proyek, tugas, dan action plan.',
}

// Jalan sebelum paint pertama supaya tidak ada kedip putih saat tema gelap aktif.
const themeScript = `
try {
  var t = localStorage.getItem('promap-theme')
  if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  if (t === 'dark') document.documentElement.classList.add('dark')
} catch (e) {}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans bg-slate-50 dark:bg-slate-900">{children}</body>
    </html>
  )
}

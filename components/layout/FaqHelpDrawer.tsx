'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  HelpCircle,
  Search,
  X,
  ChevronDown,
  BookOpen,
  RotateCcw,
  Building2,
} from 'lucide-react'
import { FAQ_ITEMS, type FaqItem } from '@/lib/faq-content'
import type { Role } from '@/lib/generated/prisma/client'

interface FaqHelpDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userRole: Role
}

function FaqAccordionItem({ item }: { item: FaqItem }) {
  return (
    <details className="group border-b border-slate-100 last:border-b-0 dark:border-slate-800/80">
      <summary className="flex cursor-pointer list-none items-center justify-between py-3 font-medium text-sm text-slate-800 select-none [&::-webkit-details-marker]:hidden dark:text-slate-200">
        <span className="pr-3 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {item.question}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180 dark:text-slate-500" />
      </summary>
      <div className="pb-3 text-xs leading-relaxed text-slate-600 whitespace-pre-line dark:text-slate-400">
        {item.answer}
      </div>
    </details>
  )
}

export function FaqHelpDrawer({ open, onOpenChange, userRole }: Readonly<FaqHelpDrawerProps>) {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')

  // Filter awal berdasarkan hak akses role
  const roleFaqs = useMemo(() => {
    return FAQ_ITEMS.filter((item) => item.roles.includes(userRole))
  }, [userRole])

  // Filter pencarian teks
  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return roleFaqs
    return roleFaqs.filter((item) => {
      const matchQuestion = item.question.toLowerCase().includes(q)
      const matchAnswer = item.answer.toLowerCase().includes(q)
      const matchTags = item.tags.some((tag) => tag.toLowerCase().includes(q))
      return matchQuestion || matchAnswer || matchTags
    })
  }, [roleFaqs, searchQuery])

  // Identifikasi topik relevan dengan pathname saat ini
  const { relatedFaqs, otherFaqs } = useMemo(() => {
    if (!pathname) {
      return { relatedFaqs: [], otherFaqs: filteredFaqs }
    }

    const related: FaqItem[] = []
    const others: FaqItem[] = []

    for (const item of filteredFaqs) {
      const isRelated = item.relatedRoutes.some((route) => {
        if (route === '/dashboard' && (pathname === '/' || pathname === '/dashboard')) {
          return true
        }
        return pathname === route || pathname.startsWith(`${route}/`)
      })

      if (isRelated) {
        related.push(item)
      } else {
        others.push(item)
      }
    }

    return { relatedFaqs: related, otherFaqs: others }
  }, [filteredFaqs, pathname])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl outline-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right dark:border-slate-800 dark:bg-slate-900"
          aria-describedby="faq-drawer-desc"
        >
          {/* Header Drawer */}
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                  <HelpCircle className="h-4 w-4" />
                </div>
                <div>
                  <DialogPrimitive.Title className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Pusat Bantuan &amp; FAQ
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description
                    id="faq-drawer-desc"
                    className="text-xs text-slate-500 dark:text-slate-400"
                  >
                    Panduan alur kerja dan jawaban pertanyaan umum sistem
                  </DialogPrimitive.Description>
                </div>
              </div>
              <DialogPrimitive.Close
                aria-label="Tutup Pusat Bantuan"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            {/* Search Bar */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari topik bantuan, kata kunci, alur kerja..."
                className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:bg-slate-900"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Hapus kata kunci"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Body Konten FAQ */}
          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
            {filteredFaqs.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-10 px-4 text-center dark:border-slate-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                  <Search className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                  Tidak ada topik yang sesuai
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Tidak ditemukan pertanyaan dengan kata kunci &quot;{searchQuery}&quot;.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Pencarian
                </button>
              </div>
            ) : (
              <>
                {/* Topik Relevan Konteks Halaman */}
                {relatedFaqs.length > 0 && (
                  <section>
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Topik Terkait Halaman Ini</span>
                    </div>
                    <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50 px-3 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-800/30">
                      {relatedFaqs.map((faq) => (
                        <FaqAccordionItem key={faq.id} item={faq} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Topik Lainnya / Semua Topik */}
                {otherFaqs.length > 0 && (
                  <section>
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>{relatedFaqs.length > 0 ? 'Topik Lainnya' : 'Daftar Pertanyaan'}</span>
                    </div>
                    <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-3 dark:divide-slate-800 dark:border-slate-800">
                      {otherFaqs.map((faq) => (
                        <FaqAccordionItem key={faq.id} item={faq} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>

          {/* Footer Bantuan & Eskalasi */}
          <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="shrink-0 rounded-md bg-blue-50 p-2 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Butuh bantuan lebih lanjut?
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Hubungi Administrator Operasional atau Super Admin perusahaan Anda.
                </p>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

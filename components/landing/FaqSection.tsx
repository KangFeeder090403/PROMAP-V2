'use client'

import { useRef, useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

const FAQS = [
  {
    q: 'Bagaimana sesi demo ProMaP berlangsung?',
    a: 'Sesi demo berlangsung langsung di peramban Anda dengan akun tamu uji coba. Anda dapat mengeksplorasi seluruh tampilan kerja — mulai dari papan Kanban, pengunggahan dokumen bukti, hingga ekspor laporan — menggunakan data contoh perusahaan yang realistis tanpa perlu konfigurasi awal.',
  },
  {
    q: 'Apakah data perusahaan kami aman dan terisolasi?',
    a: 'Ya. ProMaP dirancang dengan arsitektur multi-tenant ketat. Data setiap perusahaan dipisahkan secara terisolasi di tingkat database, didukung hak akses bertingkat (Super Admin, Admin Operasional, Manajer, dan PIC), serta pencatatan log audit permanen yang tidak dapat dimanipulasi.',
  },
  {
    q: 'Berapa lama waktu yang dibutuhkan untuk tim mulai menggunakan ProMaP?',
    a: 'ProMaP berbasis komputasi awan siap pakai (SaaS). Tidak diperlukan instalasi server lokal. Setelah akun perusahaan didaftarkan, pimpinan dan manajer dapat langsung mengatur divisi, mengundang anggota tim, dan mulai mendelegasikan rencana aksi dalam hitungan jam.',
  },
  {
    q: 'Apakah kami bisa mengekspor laporan kinerja untuk kebutuhan rapat?',
    a: 'Tentu saja. ProMaP menyediakan fitur ekspor satu klik ke format PDF resmi siap presentasi dan format Excel tabular untuk analisis lebih lanjut. Format laporan dirancang sesuai standar pemaparan kepada jajaran Dewan Direksi.',
  },
  {
    q: 'Bagaimana jika penanggung jawab tugas (PIC) berganti di tengah jalan?',
    a: 'Manajer dapat melakukan penugasan ulang (reassign) kapan saja. Seluruh riwayat aktivitas, dokumen bukti yang telah diunggah sebelumnya, dan catatan penugasan akan tetap tersimpan utuh di kartu rencana aksi untuk menjaga kelangsungan audit.',
  },
]

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.faq-header', {
          scrollTrigger: { trigger: '.faq-header', start: 'top 85%', once: true },
          y: 24,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
        })
        gsap.from('.faq-item', {
          scrollTrigger: { trigger: '.faq-list', start: 'top 85%', once: true },
          y: 20,
          opacity: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power3.out',
          clearProps: 'all',
        })
      })
      return () => mm.revert()
    },
    { scope: containerRef }
  )

  const toggleAccordion = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx)
  }

  return (
    <section id="faq" ref={containerRef} className="bg-slate-50/50 py-16 backdrop-blur-xs sm:py-20 dark:bg-slate-950/50">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Header */}
        <div className="faq-header mb-12 text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
            <HelpCircle className="h-3.5 w-3.5" />
            Tanya Jawab Seputar Layanan
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Pertanyaan yang Sering Diajukan
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            Temukan jawaban atas hal-hal penting seputar keamanan, penerapan sistem, dan mekanisme kerja sama ProMaP.
          </p>
        </div>

        {/* Accordion List */}
        <div className="faq-list space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx
            return (
              <div
                key={faq.q}
                className="faq-item overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors duration-150 dark:border-slate-800 dark:bg-slate-900"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-semibold text-slate-900 transition-colors hover:text-blue-700 dark:text-slate-100 dark:hover:text-blue-400"
                >
                  <span className="flex-1">{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500 ${
                      isOpen ? 'rotate-180 text-blue-700 dark:text-blue-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-3 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-400 sm:text-sm">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

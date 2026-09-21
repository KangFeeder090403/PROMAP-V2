'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

export function AmbientBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Orb 1: Primary Electric Blue — melayang & berdenyut
        gsap.to('.ambient-orb-1', {
          x: '35vw',
          y: '25vh',
          scale: 1.35,
          opacity: 0.45,
          duration: 9,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })

        // Orb 2: Vibrant Indigo/Cyan — orbit silang
        gsap.to('.ambient-orb-2', {
          x: '-30vw',
          y: '-20vh',
          scale: 0.85,
          opacity: 0.4,
          duration: 11,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 0.5,
        })

        // Orb 3: Deep Royal Blue — melayang di tengah-bawah
        gsap.to('.ambient-orb-3', {
          x: '20vw',
          y: '-30vh',
          scale: 1.4,
          opacity: 0.35,
          duration: 13,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 1.2,
        })

        // Orb 4: Top Center Glow Accent
        gsap.to('.ambient-orb-4', {
          y: '18vh',
          scale: 1.25,
          opacity: 0.3,
          duration: 8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })

        // Grid subtle drift (efek matrix/cyber modern)
        gsap.to('.ambient-grid', {
          backgroundPosition: '0px 60px',
          duration: 20,
          repeat: -1,
          ease: 'linear',
        })
      })

      return () => mm.revert()
    },
    { scope: containerRef }
  )

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Grid bergaris halus dinamis dengan animasi pergerakan vertikal */}
      <div
        className="ambient-grid absolute inset-0 opacity-[0.045] dark:opacity-[0.09]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #1E40AF 1px, transparent 1px), linear-gradient(to bottom, #1E40AF 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radial soft vignette overlay agar bagian tengah lebih terang */}
      <div className="absolute inset-0 bg-radial from-transparent via-white/50 to-white dark:via-slate-950/60 dark:to-slate-950" />

      {/* Orb 1 - Electric Blue (kiri atas) */}
      <div className="ambient-orb-1 absolute -left-20 -top-20 h-[560px] w-[560px] rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 opacity-30 blur-[90px] dark:from-blue-500 dark:to-indigo-600 dark:opacity-40" />

      {/* Orb 2 - Vibrant Cyan/Sky (kanan tengah) */}
      <div className="ambient-orb-2 absolute -right-20 top-[30vh] h-[520px] w-[520px] rounded-full bg-gradient-to-bl from-sky-400 to-blue-600 opacity-25 blur-[100px] dark:from-sky-500 dark:to-blue-700 dark:opacity-35" />

      {/* Orb 3 - Deep Royal Blue (kiri bawah) */}
      <div className="ambient-orb-3 absolute -left-10 top-[65vh] h-[600px] w-[600px] rounded-full bg-gradient-to-r from-blue-700 to-indigo-800 opacity-25 blur-[110px] dark:from-blue-800 dark:to-indigo-900 dark:opacity-35" />

      {/* Orb 4 - Pusat atas Hero Spotlight */}
      <div className="ambient-orb-4 absolute left-1/2 top-[-100px] h-[450px] w-[650px] -translate-x-1/2 rounded-full bg-blue-500/25 blur-[100px] dark:bg-blue-600/35" />
    </div>
  )
}

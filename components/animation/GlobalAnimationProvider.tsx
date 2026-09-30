'use client'

import React, { useEffect } from 'react'
import gsap from 'gsap'

/**
 * Global GSAP Ultra Dynamic Kinetic Animation Provider
 * Menggerakkan seluruh mikro-interaksi tombol, kartu, switcher tab,
 * dan dialog di seluruh fitur ProMaP secara serentak.
 */
export function GlobalAnimationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Delegasi Event Tombol: Slam Compression + Elastic Spring Pop
    const handlePointerDown = (e: PointerEvent) => {
      const target = (e.target as HTMLElement).closest(
        'button, [role="button"], a[data-tactile], input[type="submit"], [role="tab"]'
      ) as HTMLElement | null
      if (!target || target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') return

      gsap.to(target, {
        scale: 0.91,
        duration: 0.08,
        ease: 'power3.in',
        overwrite: 'auto',
      })
    }

    const handlePointerUp = (e: PointerEvent) => {
      const target = (e.target as HTMLElement).closest(
        'button, [role="button"], a[data-tactile], input[type="submit"], [role="tab"]'
      ) as HTMLElement | null
      if (!target) return

      const isTab = target.getAttribute('role') === 'tab' || target.closest('[role="tablist"]')

      const tl = gsap.timeline({ defaults: { overwrite: 'auto' } })
      tl.to(target, {
        scale: 1.08,
        duration: 0.14,
        ease: 'back.out(4.5)',
      }).to(target, {
        scale: 1,
        duration: 0.12,
        ease: 'power2.out',
      })

      // Jika tombol tab: tambahkan mikro-jiggle
      if (isTab) {
        gsap.fromTo(
          target,
          { x: -3 },
          {
            x: 0,
            duration: 0.2,
            ease: 'elastic.out(1.2, 0.3)',
          }
        )
      }
    }

    const handlePointerCancel = (e: PointerEvent) => {
      const target = (e.target as HTMLElement).closest(
        'button, [role="button"], a[data-tactile], input[type="submit"], [role="tab"]'
      ) as HTMLElement | null
      if (!target) return

      gsap.to(target, {
        scale: 1,
        duration: 0.15,
        ease: 'power2.out',
        overwrite: 'auto',
      })
    }

    // 2. Delegasi Card Hover Lift 3D
    const handleMouseOver = (e: MouseEvent) => {
      const card = (e.target as HTMLElement).closest(
        '[data-card], .hover-lift, [data-hover-lift]'
      ) as HTMLElement | null
      if (!card || card.dataset.lifted === 'true') return

      card.dataset.lifted = 'true'
      gsap.to(card, {
        y: -3,
        duration: 0.2,
        ease: 'power2.out',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        overwrite: 'auto',
      })
    }

    const handleMouseOut = (e: MouseEvent) => {
      const card = (e.target as HTMLElement).closest(
        '[data-card], .hover-lift, [data-hover-lift]'
      ) as HTMLElement | null
      if (!card) return

      const related = e.relatedTarget as HTMLElement | null
      if (related && card.contains(related)) return

      card.dataset.lifted = 'false'
      gsap.to(card, {
        y: 0,
        duration: 0.22,
        ease: 'power2.inOut',
        boxShadow: '',
        overwrite: 'auto',
      })
    }

    document.addEventListener('pointerdown', handlePointerDown, { passive: true })
    document.addEventListener('pointerup', handlePointerUp, { passive: true })
    document.addEventListener('pointercancel', handlePointerCancel, { passive: true })
    document.addEventListener('mouseover', handleMouseOver, { passive: true })
    document.addEventListener('mouseout', handleMouseOut, { passive: true })

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('pointercancel', handlePointerCancel)
      document.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('mouseout', handleMouseOut)
    }
  }, [])

  return <>{children}</>
}

/**
 * Utility GSAP: Slam Compression + Elastic Pop
 */
export function triggerKineticSlam(el: HTMLElement) {
  gsap.timeline()
    .to(el, { scale: 0.82, duration: 0.08, ease: 'power3.in' })
    .to(el, { scale: 1.16, duration: 0.16, ease: 'back.out(4)' })
    .to(el, { scale: 1, duration: 0.12, ease: 'power2.out' })
}

/**
 * Utility GSAP: Haptic Shake (untuk Error, Overdue, atau Ditolak)
 */
export function triggerHapticShake(el: HTMLElement) {
  gsap.timeline()
    .to(el, { x: -6, duration: 0.04 })
    .to(el, { x: 6, duration: 0.05 })
    .to(el, { x: -3, duration: 0.04 })
    .to(el, { x: 3, duration: 0.04 })
    .to(el, { x: 0, duration: 0.05 })
}

/**
 * Utility GSAP: Glow Flash Ring
 */
export function triggerGlowFlash(el: HTMLElement, color = 'rgba(59, 130, 246, 0.8)') {
  gsap.timeline()
    .to(el, { boxShadow: `0 0 20px ${color}`, duration: 0.1, ease: 'power2.in' })
    .to(el, { boxShadow: 'none', duration: 0.3, ease: 'power2.out' })
}

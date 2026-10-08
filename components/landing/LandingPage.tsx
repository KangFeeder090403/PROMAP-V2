'use client'

import { useEffect } from 'react'
import { THEME_STORAGE_KEY } from '@/lib/theme'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingHero } from '@/components/landing/LandingHero'
import { InteractiveProductTour } from '@/components/landing/InteractiveProductTour'
import { PainVsSolution } from '@/components/landing/PainVsSolution'
import { FeatureCards } from '@/components/landing/FeatureCards'
import { WorkflowSection } from '@/components/landing/WorkflowSection'
import { SecurityTrustSection } from '@/components/landing/SecurityTrustSection'
import { FaqSection } from '@/components/landing/FaqSection'
import { DemoFormSection } from '@/components/landing/DemoFormSection'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { AmbientBackground } from '@/components/landing/AmbientBackground'

export function LandingPage() {
  useEffect(() => {
    // Landing page selalu full light mode
    const root = document.documentElement
    root.classList.remove('dark')

    return () => {
      // Kembalikan tema jika user berpindah ke rute lain (misal login/demo)
      try {
        if (localStorage.getItem(THEME_STORAGE_KEY) === 'dark') root.classList.add('dark')
      } catch {}
    }
  }, [])

  return (
    <div className="relative min-h-screen bg-white text-slate-900 antialiased">
      <AmbientBackground />
      <LandingNav />
      <main>
        <LandingHero />
        <InteractiveProductTour />
        <PainVsSolution />
        <FeatureCards />
        <WorkflowSection />
        <SecurityTrustSection />
        <FaqSection />
        <DemoFormSection />
      </main>
      <LandingFooter />
    </div>
  )
}

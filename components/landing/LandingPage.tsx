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
  return (
    <div className="relative min-h-screen bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-50">
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

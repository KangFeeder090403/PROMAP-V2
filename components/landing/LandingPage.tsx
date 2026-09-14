import { LandingNav } from '@/components/landing/LandingNav'
import { LandingHero } from '@/components/landing/LandingHero'
import { DashboardPreview } from '@/components/landing/DashboardPreview'
import { FeatureCards } from '@/components/landing/FeatureCards'
import { WorkflowSection } from '@/components/landing/WorkflowSection'
import { DemoFormSection } from '@/components/landing/DemoFormSection'
import { LandingFooter } from '@/components/landing/LandingFooter'

export function LandingPage() {
  return (
    <div className="min-h-screen antialiased">
      <LandingNav />
      <main>
        <LandingHero />
        <DashboardPreview />
        <FeatureCards />
        <WorkflowSection />
        <DemoFormSection />
      </main>
      <LandingFooter />
    </div>
  )
}

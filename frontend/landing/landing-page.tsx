import { MarketingNav } from "@/landing/components/layout/landing-nav"
import { LandingHero } from "@/landing/components/hero/landing-hero"
import { ProblemSection } from "@/landing/components/sections/problem-section"
import { HowItWorksSection } from "@/landing/components/sections/how-it-works"
import { FeaturesSection } from "@/landing/components/sections/features-section"
import { IntegrationsSection } from "@/landing/components/sections/integrations-section"
import { TestimonialsSection } from "@/landing/components/sections/testimonials-section"
import { CtaSection } from "@/landing/components/sections/cta-section"
import { LandingFooter } from "@/landing/components/ui/landing-footer"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <main>
        <LandingHero />
        <ProblemSection />
        <HowItWorksSection />
        <FeaturesSection />
        <IntegrationsSection />
        <TestimonialsSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  )
}

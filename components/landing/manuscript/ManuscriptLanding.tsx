import { LandingNav } from './LandingNav'
import { Hero } from './Hero'
import { ContentsBanner } from './ContentsBanner'
import { WhySection } from './WhySection'
import { FeaturesSection } from './FeaturesSection'
import { AlsoSection } from './AlsoSection'
import { AboutSection } from './AboutSection'
import { SignUpBand } from './SignUpBand'
import { LandingFooter } from './LandingFooter'

// The landing page in Manuscript, built to design/landing-manuscript/.
// Rendered inside a Manuscript ThemeScope (app/page.tsx). Plain paper: the
// handoff's ruled page texture is left out, and ruled lines appear only
// inside the cards it rules (the ledger, the event card, the desk cards).
// Body text is the handoff's body brown; headings and strong text set their
// own.
export function ManuscriptLanding() {
  return (
    <div className="text-secondary-foreground">
      <LandingNav />
      <main id="top">
        <Hero />
        <ContentsBanner />
        <WhySection />
        <FeaturesSection />
        <AlsoSection />
        <AboutSection />
        <SignUpBand />
      </main>
      <LandingFooter />
    </div>
  )
}

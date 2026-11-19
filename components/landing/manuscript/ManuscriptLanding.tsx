import { LandingHeaderOffset } from '../LandingHeaderOffset'
import { LandingReveals } from '../LandingReveals'
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
      {/* The logo's "back to top" target: the very top of the page (the
          sticky header can't be, since it's always on screen). */}
      <div id="top" />
      <LandingNav />
      {/* Section reveals (soft): motion.css and LandingReveals. */}
      <main className="[--reveal-distance:12px] [--reveal-duration:560ms] [--reveal-stagger:60ms]">
        <Hero />
        <ContentsBanner />
        <WhySection />
        <FeaturesSection />
        <AlsoSection />
        <AboutSection />
        <SignUpBand />
      </main>
      <LandingReveals />
      <LandingHeaderOffset />
      <LandingFooter />
    </div>
  )
}

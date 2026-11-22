import { LandingHeaderOffset } from '../LandingHeaderOffset'
import { LandingReveals } from '../LandingReveals'
import { LandingNav } from './LandingNav'
import { Hero } from './Hero'
import { PartsStrip } from './PartsStrip'
import { WhySection } from './WhySection'
import { FeaturesSection } from './FeaturesSection'
import { AlsoSection } from './AlsoSection'
import { AboutSection } from './AboutSection'
import { SignUpBand } from './SignUpBand'
import { LandingFooter } from './LandingFooter'

// The landing page in Classic Light and Classic Dark, built to
// design/landing-classic/. Rendered inside a Classic ThemeScope
// (LandingPage); both modes share this markup and differ only in the
// theme's colors. Body text is the handoff's body color; headings and strong
// text set their own.
export function ClassicLanding() {
  return (
    <div className="text-secondary-foreground">
      {/* The logo's "back to top" target: the very top of the page (the
          sticky header can't be, since it's always on screen). */}
      <div id="top" />
      <LandingNav />
      {/* Section reveals (gentle): motion.css and LandingReveals. */}
      <main className="[--reveal-distance:12px] [--reveal-duration:480ms] [--reveal-stagger:60ms]">
        <Hero />
        <PartsStrip />
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

import { BannerStrip } from '@/components/hud/BannerStrip'
import { APP_PARTS } from '../content'
import { CONTAINER } from '../layout'
import { LandingHeaderOffset } from '../LandingHeaderOffset'
import { LandingReveals } from '../LandingReveals'
import { LandingNav } from './LandingNav'
import { Hero } from './Hero'
import { WhySection } from './WhySection'
import { FeaturesSection } from './FeaturesSection'
import { AlsoSection } from './AlsoSection'
import { AboutSection } from './AboutSection'
import { SignUpBand } from './SignUpBand'
import { LandingFooter } from './LandingFooter'

// The landing page in Cyberpunk, built to design/landing/. Rendered inside a
// Cyberpunk ThemeScope (LandingPage).
export function CyberpunkLanding() {
  return (
    <>
      {/* The logo's "back to top" target: the very top of the page (the
          sticky header can't be, since it's always on screen). */}
      <div id="top" />
      <LandingNav />
      {/* Section reveals (crisp): motion.css and LandingReveals. */}
      <main className="[--reveal-distance:8px] [--reveal-duration:320ms] [--reveal-stagger:40ms]">
        <Hero />
        <BannerStrip items={[...APP_PARTS]} className="mb-2" contentClassName={CONTAINER} />
        <WhySection />
        <FeaturesSection />
        <AlsoSection />
        <AboutSection />
        <SignUpBand />
      </main>
      <LandingReveals />
      <LandingHeaderOffset />
      <LandingFooter />
    </>
  )
}

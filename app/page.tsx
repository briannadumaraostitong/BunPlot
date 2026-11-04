import type { Metadata } from 'next'
import { getTheme, type ThemeId } from '@/lib/themes'
import { ThemeScope } from '@/components/theme/ThemeScope'
import { BannerStrip } from '@/components/hud/BannerStrip'
import { LandingNav } from '@/components/landing/LandingNav'
import { Hero } from '@/components/landing/Hero'
import { WhySection } from '@/components/landing/WhySection'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { AlsoSection } from '@/components/landing/AlsoSection'
import { AboutSection } from '@/components/landing/AboutSection'
import { SignUpBand } from '@/components/landing/SignUpBand'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { CONTAINER } from '@/components/landing/layout'

export const metadata: Metadata = {
  description:
    'Your timeline, outline, characters and places, organized in one workspace and connected to each other, from the first idea to the finished book.',
}

// The landing page's theme, whatever the visitor's own. The sections take
// their look from it: tokens and shape through the ThemeScope, and the framed
// spots from its `frames` setting (a plain card when it has none).
const THEME: ThemeId = 'cyberpunk'

const APP_PARTS = ['Timeline', 'Outline', 'Characters', 'Places', 'Storyboard', 'Exports']

// The landing page for signed-out visitors (proxy.ts sends signed-in ones to
// the dashboard). The ThemeScope applies THEME to this page only and leaves
// the visitor's setting alone.
export default function HomePage() {
  const { frames } = getTheme(THEME)
  return (
    // leading-[normal]: the design sets line heights only where it needs them.
    <ThemeScope theme={THEME} className="min-h-dvh overflow-x-clip leading-[normal]">
      <LandingNav />
      <main id="top">
        <Hero />
        <div className={`${CONTAINER} mb-2`}>
          <BannerStrip items={APP_PARTS} />
        </div>
        <WhySection frames={frames} />
        <FeaturesSection frames={frames} />
        <AlsoSection />
        <AboutSection frames={frames} />
        <SignUpBand />
      </main>
      <LandingFooter />
    </ThemeScope>
  )
}

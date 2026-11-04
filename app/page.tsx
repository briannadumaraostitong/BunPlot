import type { Metadata } from 'next'
import { ThemeScope } from '@/components/theme/ThemeScope'
import { BannerStrip } from '@/components/hud/BannerStrip'
import { LandingNav } from '@/components/landing/LandingNav'
import { Hero } from '@/components/landing/Hero'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { CONTAINER } from '@/components/landing/layout'

export const metadata: Metadata = {
  description:
    'Your timeline, outline, characters and places, organized in one workspace and connected to each other, from the first idea to the finished book.',
}

const APP_PARTS = ['Timeline', 'Outline', 'Characters', 'Places', 'Storyboard', 'Exports']

// The landing page for signed-out visitors (proxy.ts sends signed-in ones to
// the dashboard). Always Cyberpunk, whatever the visitor's own theme: the
// ThemeScope applies it to this page only and leaves their setting alone.
export default function HomePage() {
  return (
    // leading-[normal]: the design sets line heights only where it needs them.
    <ThemeScope theme="cyberpunk" className="min-h-dvh overflow-x-clip leading-[normal]">
      <LandingNav />
      <main id="top">
        <Hero />
        <div className={`${CONTAINER} mb-2`}>
          <BannerStrip items={APP_PARTS} />
        </div>
      </main>
      <LandingFooter />
    </ThemeScope>
  )
}

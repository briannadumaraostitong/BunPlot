import type { Metadata } from 'next'
import { ThemeScope } from '@/components/theme/ThemeScope'
import { HERO } from '@/components/landing/content'
import { ClassicLanding } from '@/components/landing/classic/ClassicLanding'
import { CyberpunkLanding } from '@/components/landing/cyberpunk/CyberpunkLanding'
import { ManuscriptLanding } from '@/components/landing/manuscript/ManuscriptLanding'
import { LandingRevealScript } from '@/components/landing/LandingRevealScript'

export const metadata: Metadata = {
  description: HERO.body,
}

// Each theme's landing page: its own sections (components/landing/<theme>/)
// on the shared copy and example data (components/landing/content.ts). The
// theme is chosen here on the server, so the page can branch on it, unlike
// the app, whose theme only the browser knows.
const LANDINGS = {
  // One landing for Classic, in the device's light or dark setting
  // ('classic') or a fixed mode: the modes differ only in colors.
  classic: ClassicLanding,
  'classic-light': ClassicLanding,
  'classic-dark': ClassicLanding,
  cyberpunk: CyberpunkLanding,
  manuscript: ManuscriptLanding,
}

// The landing page's theme, whatever the visitor's own: Classic, light or
// dark as the visitor's device is set.
const THEME: keyof typeof LANDINGS = 'classic'

// The landing page for signed-out visitors (proxy.ts sends signed-in ones to
// the dashboard). The ThemeScope applies THEME to this page only, its tokens,
// shape and frames, and leaves the visitor's setting alone.
export default function HomePage() {
  const Landing = LANDINGS[THEME]
  return (
    // leading-[normal]: the design sets line heights only where it needs them.
    <ThemeScope theme={THEME} className="min-h-dvh overflow-x-clip leading-[normal]">
      {/* Before the hero in the HTML, so it runs before the hero's first
          paint. */}
      <LandingRevealScript />
      <Landing />
    </ThemeScope>
  )
}

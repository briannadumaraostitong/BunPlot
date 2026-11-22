import type { Metadata } from 'next'
import { ThemeScope } from '@/components/theme/ThemeScope'
import { HERO } from '@/components/landing/content'
import { ClassicLanding } from '@/components/landing/classic/ClassicLanding'
import { CyberpunkLanding } from '@/components/landing/cyberpunk/CyberpunkLanding'
import { ManuscriptLanding } from '@/components/landing/manuscript/ManuscriptLanding'
import { LandingRevealScript } from '@/components/landing/LandingRevealScript'
import type { Look } from '@/lib/looks'

export const LANDING_METADATA: Metadata = {
  description: HERO.body,
}

// Each look's landing page: its theme's own sections
// (components/landing/<theme>/) on the shared copy and example data
// (components/landing/content.ts). The look is chosen on the server, so this
// can branch on it, unlike the app, whose theme only the browser knows.
const LANDINGS: Record<Look, () => React.ReactNode> = {
  // One landing for Classic, in the device's light or dark setting
  // ('classic') or a fixed mode: the modes differ only in colors.
  classic: ClassicLanding,
  'classic-light': ClassicLanding,
  'classic-dark': ClassicLanding,
  cyberpunk: CyberpunkLanding,
  manuscript: ManuscriptLanding,
}

// The landing page for signed-out visitors, in a look: one page per look
// (app/landing/<look>/), which proxy.ts shows at / for the look of the
// visitor's saved theme, Classic following the device without one. The
// ThemeScope applies the look to this page only, its tokens, shape and
// frames, and leaves the visitor's setting alone.
// `fontVariables` replaces font variables for this page (the Cyberpunk
// landing's preloaded fonts, app/fonts/cyberpunk-landing.ts).
export function LandingPage({ look, fontVariables }: { look: Look; fontVariables?: React.CSSProperties }) {
  const Landing = LANDINGS[look]
  return (
    // leading-[normal]: the design sets line heights only where it needs them.
    <ThemeScope theme={look} style={fontVariables} className="min-h-dvh overflow-x-clip leading-[normal]">
      {/* Before the hero in the HTML, so it runs before the hero's first
          paint. */}
      <LandingRevealScript />
      <Landing />
    </ThemeScope>
  )
}

import type { Metadata } from 'next'
import { ThemeScope } from '@/components/theme/ThemeScope'
import { HERO } from '@/components/landing/content'
import { CyberpunkLanding } from '@/components/landing/cyberpunk/CyberpunkLanding'

export const metadata: Metadata = {
  description: HERO.body,
}

// Each theme's landing page: its own sections (components/landing/<theme>/)
// on the shared copy and example data (components/landing/content.ts). The
// theme is chosen here on the server, so the page can branch on it, unlike
// the app, whose theme only the browser knows.
const LANDINGS = {
  cyberpunk: CyberpunkLanding,
}

// The landing page's theme, whatever the visitor's own.
const THEME: keyof typeof LANDINGS = 'cyberpunk'

// The landing page for signed-out visitors (proxy.ts sends signed-in ones to
// the dashboard). The ThemeScope applies THEME to this page only, its tokens,
// shape and frames, and leaves the visitor's setting alone.
export default function HomePage() {
  const Landing = LANDINGS[THEME]
  return (
    // leading-[normal]: the design sets line heights only where it needs them.
    <ThemeScope theme={THEME} className="min-h-dvh overflow-x-clip leading-[normal]">
      <Landing />
    </ThemeScope>
  )
}

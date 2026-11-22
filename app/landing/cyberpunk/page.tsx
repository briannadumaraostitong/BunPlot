import { LandingPage, LANDING_METADATA } from '@/components/landing/LandingPage'
import { CYBERPUNK_LANDING_FONT_VARIABLES } from '@/app/fonts/cyberpunk-landing'

// The landing page in the 'cyberpunk' look, shown at / by proxy.ts, with
// Cyberpunk's latin fonts preloaded (app/fonts/cyberpunk-landing.ts).
export const metadata = LANDING_METADATA

export default function Page() {
  return <LandingPage look="cyberpunk" fontVariables={CYBERPUNK_LANDING_FONT_VARIABLES} />
}

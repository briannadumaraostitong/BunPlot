import { LandingPage, LANDING_METADATA } from '@/components/landing/LandingPage'

// The landing page in the 'classic-dark' look, shown at / by proxy.ts.
export const metadata = LANDING_METADATA

export default function Page() {
  return <LandingPage look="classic-dark" />
}

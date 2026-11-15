import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { NAV, SECTIONS } from '../content'
import { CONTAINER } from '../layout'
import { CTA } from './cta'

export function LandingNav() {
  return (
    <header className="border-b border-border">
      <nav aria-label="Main" className={`${CONTAINER} flex flex-wrap items-center gap-x-8 gap-y-4 py-[18px]`}>
        <a href="#top" aria-label="BunPlot, back to top">
          <Logo size={34} wordmark preload className="gap-2.5" wordmarkClassName="text-[24px] leading-[normal] text-foreground" />
        </a>
        <div className="flex flex-auto flex-wrap gap-x-7 gap-y-2 text-[16px] font-bold">
          {SECTIONS.map(({ href, label }) => (
            <a key={href} href={href} className="transition-colors hover:text-foreground">
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-3.5 py-3 text-[16px] font-bold text-foreground transition-colors hover:text-link">
            {NAV.logIn}
          </Link>
          <Link href="/signup" className={CTA.navPrimary}>
            {NAV.getStarted}
          </Link>
        </div>
      </nav>
    </header>
  )
}

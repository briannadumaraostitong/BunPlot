import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { NAV, SECTIONS } from '../content'
import { CONTAINER } from '../layout'
import { CTA } from './cta'

export function LandingNav() {
  return (
    // id="top": the logo's "back to top" link lands at the very top.
    <header id="top" className="border-b border-border bg-background/94">
      <nav aria-label="Main" className={`${CONTAINER} flex flex-wrap items-center gap-x-8 gap-y-4 py-[18px]`}>
        <a href="#top" aria-label="BunPlot, back to top">
          {/* The wordmark's size: the theme's rule reads --wordmark-size. */}
          <Logo size={32} wordmark preload className="gap-2.5 [--wordmark-size:28px]" wordmarkClassName="leading-[normal] text-[hsl(var(--heading-ink))]" />
        </a>
        <div className="flex flex-auto flex-wrap gap-x-7 gap-y-2 text-[15px]">
          {SECTIONS.map(({ href, label }) => (
            <a key={href} href={href} className="transition-colors hover:text-accent">
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-3.5 py-3 text-[15px] text-foreground transition-colors hover:text-accent">
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

import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { NAV, SECTIONS } from '../content'
import { CONTAINER } from '../layout'
import { CTA } from './cta'

export function LandingNav() {
  return (
    // id="top": the logo's "back to top" link lands at the very top.
    <header id="top" className="border-b border-border bg-background/94">
      {/* Phones: one row, the logo on the left and the two links on the right,
          without the section links. From md up the row wraps as needed. */}
      <nav aria-label="Main" className={`${CONTAINER} flex items-center justify-between gap-3 py-[18px] md:flex-wrap md:justify-start md:gap-x-8 md:gap-y-4`}>
        {/* Below 480px only the mark shows; the link's label still names it. */}
        <a href="#top" aria-label="BunPlot, back to top">
          {/* The wordmark's size: the theme's rule reads --wordmark-size. */}
          <Logo size={32} wordmark preload className="gap-2.5 [--wordmark-size:28px]" wordmarkClassName="leading-[normal] text-[hsl(var(--heading-ink))] max-[480px]:hidden" />
        </a>
        <div className="hidden flex-auto flex-wrap gap-x-7 gap-y-2 text-[15px] md:flex">
          {SECTIONS.map(({ href, label }) => (
            <a key={href} href={href} className="transition-colors hover:text-accent">
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-2 py-3 text-[15px] text-foreground md:px-3.5 transition-colors hover:text-accent">
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

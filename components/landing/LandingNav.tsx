import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { CTA } from './cta'
import { CONTAINER } from './layout'

const SECTIONS = [
  { href: '#why', label: 'Why BunPlot' },
  { href: '#features', label: 'Features' },
  { href: '#about', label: 'About' },
]

export function LandingNav() {
  return (
    <header className="border-b border-border bg-background/92">
      <nav aria-label="Main" className={`${CONTAINER} flex flex-wrap items-center gap-x-8 gap-y-4 py-[18px]`}>
        <a href="#top" aria-label="BunPlot, back to top">
          <Logo size={32} wordmark preload className="gap-2.5" wordmarkClassName="text-[22px] text-primary" />
        </a>
        <div className="flex flex-auto flex-wrap gap-x-7 gap-y-2 text-[15px] uppercase tracking-[1px]">
          {SECTIONS.map(({ href, label }) => (
            <a key={href} href={href} className="text-(--hud-text-body) transition-colors hover:text-accent">
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-3.5 py-3 text-[15px] uppercase tracking-[1px] text-foreground transition-colors hover:text-accent">
            Log in
          </Link>
          <Link href="/signup" className={CTA.navPrimary}>
            Get started
          </Link>
        </div>
      </nav>
    </header>
  )
}

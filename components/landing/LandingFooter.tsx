import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { AssetCredit } from '@/components/brand/AssetCredit'
import { CONTAINER } from './layout'

const LINKS = [
  { href: '#why', label: 'Why BunPlot' },
  { href: '#features', label: 'Features' },
  { href: '#about', label: 'About' },
  { href: '#credits', label: 'Credits' },
]

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-sidebar">
      <div className={`${CONTAINER} flex flex-wrap justify-between gap-x-12 gap-y-6 py-10`}>
        <div className="flex flex-col gap-2.5">
          <Logo size={28} wordmark className="gap-2.5" wordmarkClassName="text-xl text-primary" />
          {/* Placeholder until the owner's name is filled in. */}
          <span className="font-mono text-[12px] text-muted-foreground">© 2026 [YOUR NAME]</span>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-7 gap-y-3 text-[15px] uppercase tracking-[1px]">
          {LINKS.map(({ href, label }) => (
            <a key={href} href={href} className="text-(--hud-text-body) transition-colors hover:text-accent">
              {label}
            </a>
          ))}
          <Link href="/login" className="text-(--hud-text-body) transition-colors hover:text-accent">
            Log in
          </Link>
        </nav>
        {/* Required by the frames' CC BY 4.0 license; see ASSETS.md. */}
        <div id="credits" className="mt-2 basis-full">
          <AssetCredit
            className="font-mono text-[12px] leading-[1.7] text-muted-foreground"
            linkClassName="text-accent-2 no-underline hover:text-accent"
          />
        </div>
      </div>
    </footer>
  )
}

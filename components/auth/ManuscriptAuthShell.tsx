import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import type { AuthShellProps } from './AuthShell'

// The frame around the sign-in and sign-up forms in Manuscript, from the
// landing page's handoff (design/landing-manuscript/): the logo back to the
// landing page, an italic oxblood eyebrow, a Cormorant heading in its own
// case, and the form on a sheet of paper under a Courier label, with the
// ledger's bookmark ribbon. Plain paper, no ruled lines.
export function ManuscriptAuthShell({ eyebrow, title, panelTitle, footer, children }: AuthShellProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12 text-secondary-foreground">
      <div className="w-full max-w-[440px]">
        <Link href="/" aria-label="BunPlot home" className="mb-10 inline-block">
          <Logo size={32} wordmark preload className="gap-2.5 [--wordmark-size:28px]" wordmarkClassName="leading-[normal] text-[hsl(var(--heading-ink))]" />
        </Link>
        <p className="mb-2 font-heading text-[21px] italic text-accent">{eyebrow}</p>
        <h1 className="mb-7 font-heading text-[40px] font-semibold leading-[1.05] text-[hsl(var(--heading-ink))]">{title}</h1>
        <div className="relative overflow-hidden rounded-(--radius) border border-border bg-card [box-shadow:var(--paper-shadow)]">
          <div
            aria-hidden="true"
            className="absolute top-0 right-6 h-12 w-3.5 bg-accent [clip-path:polygon(0_0,100%_0,100%_100%,50%_84%,0_100%)]"
          />
          <p className="border-b border-border py-3.5 pr-14 pl-6 font-mono text-[12px] uppercase tracking-[1.5px] text-muted-foreground">
            {panelTitle}
          </p>
          <div className="p-6">{children}</div>
        </div>
        {footer && <div className="mt-8 text-sm">{footer}</div>}
      </div>
    </div>
  )
}

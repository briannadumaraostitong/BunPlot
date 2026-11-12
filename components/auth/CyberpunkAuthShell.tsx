import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { Eyebrow } from '@/components/hud/Eyebrow'
import { HudPanel } from '@/components/hud/HudPanel'
import type { AuthShellProps } from './AuthShell'

// The frame around the sign-in and sign-up forms in Cyberpunk, the landing
// page's look: the logo back to the landing page, an eyebrow and heading,
// and the form in a HUD panel, which grows with its content (error messages
// included), unlike a fixed frame.
export function CyberpunkAuthShell({ eyebrow, eyebrowTone, title, panelTitle, footer, children }: AuthShellProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px]">
        <Link href="/" aria-label="BunPlot home" className="mb-10 inline-block">
          <Logo size={32} wordmark preload className="gap-2.5" wordmarkClassName="text-[22px] text-primary" />
        </Link>
        <Eyebrow tone={eyebrowTone} className="mb-3 tracking-normal">
          {eyebrow}
        </Eyebrow>
        <h1 className="mb-8 font-heading text-[34px] font-bold uppercase leading-[1.05] tracking-[1px] text-primary">{title}</h1>
        <HudPanel title={panelTitle}>{children}</HudPanel>
        {footer && <div className="mt-8 text-sm text-(--hud-text-body)">{footer}</div>}
      </div>
    </div>
  )
}

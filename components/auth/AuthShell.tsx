import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { Eyebrow } from '@/components/hud/Eyebrow'
import { HudPanel } from '@/components/hud/HudPanel'

// The frame around the sign-in and sign-up forms, in the landing page's look
// (app/(auth)/layout.tsx renders them in its theme): the logo back to the
// landing page, an eyebrow and heading, and the form in a HUD panel, which
// grows with its content (error messages included), unlike a fixed frame.
export function AuthShell({
  eyebrow,
  eyebrowTone,
  title,
  panelTitle,
  footer,
  children,
}: {
  eyebrow: string
  eyebrowTone?: 'cyan' | 'pink'
  title: string
  // The panel's header bar, written in capitals as it's shown.
  panelTitle: string
  footer?: React.ReactNode
  children: React.ReactNode
}) {
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

// Field labels and the footer link, shared by both forms.
export const AUTH_LABEL = 'text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'
export const AUTH_LINK = 'text-accent-2 uppercase tracking-[1px] transition-colors hover:text-accent'

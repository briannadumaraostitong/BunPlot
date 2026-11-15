import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { CARD, EYEBROW, HEADING, TAG, TAG_NEUTRAL, WINDOW_DOTS } from '@/components/landing/classic/styles'
import type { AuthShellProps } from './AuthShell'

// The frame around the sign-in and sign-up forms in Classic Light and Dark,
// the landing page's look (design/landing-classic/): the logo back to the
// landing page, an eyebrow label, a Bricolage heading, and the form in a
// card styled like the hero's app window, with its three dots and a tag
// carrying the panel title.
export function ClassicAuthShell({ eyebrow, title, panelTitle, footer, children }: AuthShellProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12 text-secondary-foreground">
      <div className="w-full max-w-[440px]">
        <Link href="/" aria-label="BunPlot home" className="mb-10 inline-block">
          <Logo size={34} wordmark preload className="gap-2.5" wordmarkClassName="text-[24px] leading-[normal] text-foreground" />
        </Link>
        <p className={EYEBROW}>{eyebrow}</p>
        <h1 className={`mb-7 text-[40px] leading-[1.05] ${HEADING}`}>{title}</h1>
        <div className={`overflow-hidden ${CARD}`}>
          <div className="flex items-center gap-3 border-b border-border px-[22px] py-4">
            <span aria-hidden="true" className="flex flex-1 gap-1.5">
              {WINDOW_DOTS.map((dot) => (
                <span key={dot} className={`size-[11px] rounded-full ${dot}`} />
              ))}
            </span>
            {/* The panel title is written in capitals (Cyberpunk shows it
                so); Classic's tags are in sentence case. */}
            <span className={`${TAG} ${TAG_NEUTRAL} px-3 py-1 lowercase first-letter:uppercase`}>{panelTitle}</span>
          </div>
          <div className="p-6">{children}</div>
        </div>
        {footer && <div className="mt-8 text-sm">{footer}</div>}
      </div>
    </div>
  )
}

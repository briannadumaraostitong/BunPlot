import Link from 'next/link'
import { SIGN_UP } from '../content'
import { CONTAINER } from '../layout'
import { CTA } from './cta'
import { CARD, EYEBROW, HEADING, HEADING_FACE, TAG_BLUE } from './styles'

// The full-bleed band on powder blue: the call to sign up, beside a picture
// of the New project dialog with a second card offset behind it.
export function SignUpBand() {
  return (
    <section
      id="signup"
      aria-labelledby="signup-heading"
      className="border-y border-y-[hsl(var(--band-line))] bg-[hsl(var(--band))]"
    >
      <div className={`${CONTAINER} flex flex-wrap items-center gap-14 py-20`}>
        <div className="min-w-0 flex-[1_1_420px]">
          <p className={EYEBROW}>{SIGN_UP.eyebrow}</p>
          <h2 id="signup-heading" className={`mb-[18px] text-[52px] leading-[1.02] ${HEADING}`}>{SIGN_UP.title}</h2>
          <p className="mb-7 max-w-[460px] text-[18px] leading-[1.7]">
            Name it, add a cover if you like, and you&apos;re on the timeline. Bring in chapters, characters and places as the story grows.
          </p>
          <div className="flex flex-wrap items-center gap-3.5">
            <Link href="/signup" className={CTA.primary}>
              {SIGN_UP.primary}
            </Link>
            <Link href="/login" className={CTA.outline}>
              {SIGN_UP.secondary}
            </Link>
          </div>
        </div>

        <div className="relative ml-auto min-w-0 max-w-[520px] flex-[1_1_420px]">
          {/* The card behind, in the neutral tag color, without a shadow. */}
          <div
            aria-hidden="true"
            className="absolute top-[18px] -right-3.5 -bottom-3.5 left-[18px] rounded-(--radius) border border-border bg-[hsl(var(--tag-neutral))]"
          />
          <div
            role="img"
            aria-label="The New project dialog: the name My first book typed in, a blank cover, and a Create project button"
            className={`relative px-7 pt-[26px] pb-6 ${CARD}`}
          >
            <div className="mb-5 flex items-center justify-between">
              <span className={`text-[24px] tracking-[-0.02em] ${HEADING_FACE}`}>New project</span>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-muted-foreground">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </div>
            <div className="flex items-stretch gap-5">
              <div className={`flex h-[132px] w-24 flex-none flex-col items-center justify-center gap-2 rounded-[6px] text-[12px] font-bold ${TAG_BLUE}`}>
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <circle cx="9" cy="9.5" r="1.6" />
                  <path d="M20 16l-5-5-8 8" />
                </svg>
                Add cover
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="text-[13px] font-bold uppercase tracking-[0.09em] text-muted-foreground">Name</span>
                {/* 47px: the mockup's 44px plus its 1.5px borders. */}
                <span className="flex h-[47px] items-center rounded-[8px] border-[1.5px] border-link bg-background px-3.5 text-[17px] font-semibold text-foreground">
                  My first book
                  <span className="ml-0.5 inline-block h-5 w-0.5 bg-foreground" />
                </span>
                <span className="text-[13px] text-muted-foreground">You can rename it any time.</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <span className="px-3.5 py-2.5 text-[15px] font-bold text-muted-foreground">Cancel</span>
              <span className={CTA.small}>Create project</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

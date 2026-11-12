import Link from 'next/link'
import { SIGN_UP } from '../content'
import { CONTAINER } from '../layout'
import { CTA } from './cta'
import { HEADING, ITALIC_EYEBROW } from './styles'

// On the darker paper between full-bleed double rules.
export function SignUpBand() {
  return (
    <section
      id="signup"
      aria-labelledby="signup-heading"
      className="border-y-3 border-double border-y-[hsl(var(--rule))] bg-sidebar"
    >
      <div className={`${CONTAINER} py-[72px] text-center`}>
        <p className={`mb-2 text-[21px] ${ITALIC_EYEBROW}`}>{SIGN_UP.eyebrow}</p>
        <h2 id="signup-heading" className={`mb-7 text-[48px] ${HEADING}`}>{SIGN_UP.title}</h2>
        <div className="flex flex-wrap items-center justify-center gap-3.5">
          <Link href="/signup" className={CTA.primary}>
            {SIGN_UP.primary}
          </Link>
          <Link href="/login" className={CTA.outline}>
            {SIGN_UP.secondary}
          </Link>
        </div>
      </div>
    </section>
  )
}

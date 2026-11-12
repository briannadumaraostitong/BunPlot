import Link from 'next/link'
import { Eyebrow } from '@/components/hud/Eyebrow'
import { SIGN_UP } from '../content'
import { CONTAINER } from '../layout'
import { CTA } from './cta'

export function SignUpBand() {
  return (
    <section id="signup" aria-labelledby="signup-heading" className={`${CONTAINER} py-[104px]`}>
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-xl corner-cut border border-accent bg-card px-11 py-12">
        <div>
          <Eyebrow tone="pink" className="mb-2.5 tracking-normal">{SIGN_UP.eyebrow}</Eyebrow>
          <h2 id="signup-heading" className="font-heading text-[40px] font-bold uppercase leading-[1.05] text-primary">
            {SIGN_UP.title}
          </h2>
        </div>
        <div className="flex flex-wrap gap-3.5">
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

import Link from 'next/link'
import { Eyebrow } from '@/components/hud/Eyebrow'
import { CTA } from './cta'
import { CONTAINER } from './layout'

export function SignUpBand() {
  return (
    <section id="signup" aria-labelledby="signup-heading" className={`${CONTAINER} py-[104px]`}>
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-xl corner-cut border border-accent bg-card px-11 py-12">
        <div>
          <Eyebrow tone="pink" className="mb-2.5 tracking-normal">Ready when you are</Eyebrow>
          <h2 id="signup-heading" className="text-[40px] font-bold uppercase leading-[1.05] text-primary">
            Start your first project
          </h2>
        </div>
        <div className="flex flex-wrap gap-3.5">
          <Link href="/signup" className={CTA.primary}>
            Create account
          </Link>
          <Link href="/login" className={CTA.outline}>
            Log in
          </Link>
        </div>
      </div>
    </section>
  )
}

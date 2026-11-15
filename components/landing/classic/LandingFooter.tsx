import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { COPYRIGHT, NAV, SECTIONS } from '../content'
import { CONTAINER } from '../layout'

export function LandingFooter() {
  return (
    <footer className={`${CONTAINER} pt-11 pb-14`}>
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
        <div className="flex flex-col gap-1.5">
          <Logo size={28} wordmark className="gap-2.5" wordmarkClassName="text-[22px] leading-[normal] text-foreground" />
          <span className="text-[14px] text-muted-foreground">{COPYRIGHT}</span>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-7 gap-y-3 text-[16px] font-bold">
          {SECTIONS.map(({ href, label }) => (
            <a key={href} href={href} className="transition-colors hover:text-foreground">
              {label}
            </a>
          ))}
          <Link href="/login" className="transition-colors hover:text-foreground">
            {NAV.logIn}
          </Link>
        </nav>
        {/* The fonts' credit. This landing shows none of the Nightcity
            frames, so their CC BY credit (AssetCredit) isn't needed here;
            the #credits anchor stays, as on every theme's landing. */}
        <p id="credits" className="mt-2 basis-full text-[13px] text-muted-foreground">
          Set in Bricolage Grotesque and Figtree, under the SIL Open Font License.
        </p>
      </div>
    </footer>
  )
}

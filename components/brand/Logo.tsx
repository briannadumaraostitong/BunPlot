import Image from 'next/image'
import { cn } from '@/lib/utils'

// The only place the logo file is named. Swapping in the final logo means
// replacing public/brand/logo.svg (or changing this path for another format);
// the app icons (app/icon.tsx, app/apple-icon.tsx) read the same file. The mark
// keeps its own colors in every theme.
export const LOGO_SRC = '/brand/logo.svg'

interface LogoProps {
  size?: number
  // The "BunPlot" text next to the mark. Without it the mark is the image's
  // only label, so it gets alt text.
  wordmark?: boolean
  // Loads the mark eagerly, for where it shows above the fold on every page.
  preload?: boolean
  className?: string
}

export function Logo({ size = 28, wordmark = false, preload = false, className }: LogoProps) {
  return (
    <span className={cn('flex items-center gap-1.5', className)}>
      <Image
        src={LOGO_SRC}
        alt={wordmark ? '' : 'BunPlot'}
        width={size}
        height={size}
        // An SVG: nothing for the image optimizer to do.
        unoptimized
        preload={preload}
        className="shrink-0"
      />
      {wordmark && (
        <span data-slot="wordmark" className="text-xl font-semibold tracking-tight">
          BunPlot
        </span>
      )}
    </span>
  )
}

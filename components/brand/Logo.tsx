import Image from 'next/image'
import { cn } from '@/lib/utils'
import { LOGO_SRCS } from '@/lib/brand'
import type { ThemeId } from '@/lib/themes'

// The app's logo mark (files named per theme in lib/brand.ts), optionally with
// the "BunPlot" wordmark. Each theme can have its own version: one image per
// distinct file, and CSS shows the one for the nearest data-theme (<html> or a
// ThemeScope), so there's no React theme state and no flash. While themes
// share a file, that's a single image and no stylesheet.

// Theme ids grouped by file, in LOGO_SRCS order.
const LOGO_FILES = Object.entries(LOGO_SRCS).reduce<{ src: string; themes: ThemeId[] }[]>((files, [id, src]) => {
  const file = files.find((f) => f.src === src)
  if (file) file.themes.push(id as ThemeId)
  else files.push({ src, themes: [id as ThemeId] })
  return files
}, [])
const PER_THEME = LOGO_FILES.length > 1

// Inside each theme, hide the logo images that aren't for it, except inside a
// differently themed element nested in it (a ThemeScope), whose own rule
// decides. Generated from the theme ids so a new theme is covered.
const LOGO_CSS = Object.keys(LOGO_SRCS)
  .map((id) => `[data-theme="${id}"] [data-logo]:not([data-logo~="${id}"]):not([data-theme="${id}"] [data-theme]:not([data-theme="${id}"]) [data-logo]){display:none}`)
  .join('')

interface LogoProps {
  size?: number
  // The "BunPlot" text next to the mark. Without it the mark is the image's
  // only label, so it gets alt text.
  wordmark?: boolean
  // Loads the mark eagerly, for where it shows above the fold on every page.
  // With per-theme files it's ignored: the images load lazily instead, so the
  // hidden ones are never downloaded.
  preload?: boolean
  className?: string
  // Size or color for the wordmark where the sidebar's doesn't fit (landing).
  wordmarkClassName?: string
}

export function Logo({ size = 28, wordmark = false, preload = false, className, wordmarkClassName }: LogoProps) {
  return (
    <span className={cn('flex items-center gap-1.5', className)}>
      {LOGO_FILES.map(({ src, themes }) => (
        <Image
          key={src}
          src={src}
          alt={wordmark ? '' : 'BunPlot'}
          width={size}
          height={size}
          // An SVG: nothing for the image optimizer to do.
          unoptimized
          preload={!PER_THEME && preload}
          loading={PER_THEME ? 'lazy' : undefined}
          data-logo={PER_THEME ? themes.join(' ') : undefined}
          className="shrink-0"
        />
      ))}
      {PER_THEME && (
        // React hoists this into <head> once, however many logos render.
        <style href="bunplot-logo" precedence="default">
          {LOGO_CSS}
        </style>
      )}
      {wordmark && (
        <span data-slot="wordmark" className={cn('text-xl font-semibold tracking-tight', wordmarkClassName)}>
          BunPlot
        </span>
      )}
    </span>
  )
}

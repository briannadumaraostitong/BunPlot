import { cn } from '@/lib/utils'

// The credit CC BY 4.0 requires for the Nightcity frames (see ASSETS.md),
// worded as in design/landing/HANDOFF.md. Shown in the landing footer and in
// Settings. Links take the surrounding text color unless linkClassName says
// otherwise.
const LINKS = {
  hud: 'https://www.colorosse.com/assets/2d/ui/nightcity-hud-frame-set',
  modals: 'https://www.colorosse.com/assets/2d/ui/nightcity-modals',
  license: 'https://creativecommons.org/licenses/by/4.0/',
}

export function AssetCredit({ className, linkClassName }: { className?: string; linkClassName?: string }) {
  const link = cn('underline underline-offset-2 hover:text-foreground', linkClassName)
  const external = { target: '_blank', rel: 'noopener noreferrer', className: link }
  return (
    <p className={className}>
      HUD frames: <a href={LINKS.hud} {...external}>&ldquo;Nightcity HUD Frame Set&rdquo;</a> and{' '}
      <a href={LINKS.modals} {...external}>&ldquo;Nightcity Modals&rdquo;</a> by Oğuzhan Girgin, licensed under{' '}
      <a href={LINKS.license} {...external}>CC BY 4.0</a>. The modal frame is modified (its built-in buttons are removed).
    </p>
  )
}

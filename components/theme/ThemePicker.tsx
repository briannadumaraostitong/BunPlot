'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from './ThemeProvider'
import { getTheme, type ThemeDefinition, type ThemeSetting } from '@/lib/themes'

const OPTIONS: { value: ThemeSetting; label: string }[] = [
  { value: 'sync', label: 'System' },
  { value: 'classic-light', label: getTheme('classic-light').label },
  { value: 'classic-dark', label: getTheme('classic-dark').label },
  { value: 'cyberpunk', label: getTheme('cyberpunk').label },
]

// A radio group of cards, so arrow keys move between themes like any radio
// set; the inputs are visually hidden and the card shows their focus.
export function ThemePicker() {
  const { theme, setTheme } = useTheme()

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Theme</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {OPTIONS.map(({ value, label }) => {
          const selected = theme === value
          return (
            <label
              key={value}
              className={cn(
                'flex cursor-pointer flex-col gap-2 rounded-lg corner-cut border bg-background p-2 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring',
                selected ? 'border-accent' : 'border-border hover:border-accent/50'
              )}
            >
              <input
                type="radio"
                name="theme"
                value={value}
                checked={selected}
                onChange={() => void setTheme(value)}
                className="sr-only"
              />
              {value === 'sync' ? (
                <div className="flex gap-1">
                  <ThemeSwatch theme={getTheme('classic-light')} className="flex-1" />
                  <ThemeSwatch theme={getTheme('classic-dark')} className="flex-1" />
                </div>
              ) : (
                <ThemeSwatch theme={getTheme(value)} />
              )}
              <span className="flex items-center justify-between gap-1 text-xs font-medium">
                {label}
                {selected && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

// A small preview in the theme's own colors, fonts and corner shape: its
// tokens are set as CSS variables on the swatch, so the usual bg-background,
// bg-card, bg-accent, font-sans, font-heading and rounded classes inside it
// read them. The swatch also carries the theme's data-theme, so the theme's
// stylesheet can give the sample its heading style (Cyberpunk: uppercase,
// letter-spaced).
function ThemeSwatch({ theme, className }: { theme: ThemeDefinition; className?: string }) {
  const vars = {
    ...theme.tokens,
    '--theme-font-sans': `var(${theme.fonts.sans})`,
    '--theme-font-heading': `var(${theme.fonts.heading})`,
    '--radius': theme.shape === 'cut' ? '0rem' : '0.5rem',
  } as React.CSSProperties

  return (
    <div
      aria-hidden="true"
      data-slot="theme-swatch"
      data-theme={theme.id}
      style={vars}
      className={cn('flex h-16 flex-col justify-between rounded-md border border-border bg-background p-1.5 font-sans', className)}
    >
      <div className="flex items-center justify-between rounded-sm border border-border bg-card px-1.5 py-1">
        <span data-slot="theme-sample" className="font-heading text-base font-semibold leading-none text-foreground">Aa</span>
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      </div>
      <span className="h-1.5 w-2/3 rounded-full bg-accent" />
    </div>
  )
}

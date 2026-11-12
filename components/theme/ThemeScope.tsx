import { cn } from '@/lib/utils'
import { getTheme, type ThemeId } from '@/lib/themes'

// Renders its children in a given theme, whatever theme the visitor has
// chosen, without touching their stored setting: the theme's tokens, fonts and
// radius as CSS variables on this element, plus the data-theme, data-shape,
// data-texture and data-frames attributes the theme stylesheets key on.
// Server-rendered, so there's no flash. Portals (dialogs, toasts) render
// outside it and keep the visitor's theme.
export function ThemeScope({ theme: id, className, children }: { theme: ThemeId; className?: string; children: React.ReactNode }) {
  const theme = getTheme(id)
  const style = {
    ...theme.tokens,
    '--theme-font-sans': `var(${theme.fonts.sans})`,
    '--theme-font-mono': `var(${theme.fonts.mono})`,
    '--theme-font-heading': `var(${theme.fonts.heading})`,
    // Explicit, so a rounded scope inside a cut page still gets its corners.
    '--radius': theme.shape === 'cut' ? '0rem' : '0.5rem',
    colorScheme: theme.isDark ? 'dark' : 'light',
  } as React.CSSProperties

  return (
    <div
      data-slot="theme-scope"
      data-theme={theme.id}
      data-shape={theme.shape}
      data-texture={theme.texture}
      data-frames={theme.frames ?? 'none'}
      style={style}
      // bg-texture goes after cn(): tailwind-merge reads it as a background
      // color and would drop bg-background in its favor.
      className={`${cn(theme.isDark && 'dark', 'bg-background font-sans text-foreground', className)} bg-texture`}
    >
      {children}
    </div>
  )
}

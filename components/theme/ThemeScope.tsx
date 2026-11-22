import { cn } from '@/lib/utils'
import { DEVICE_THEMES, getTheme, isDeviceTheme, type DeviceThemeId, type ScopeThemeId, type ThemeDefinition } from '@/lib/themes'

// Renders its children in a given theme, whatever theme the visitor has
// chosen, without touching their stored setting: the theme's tokens, fonts and
// radius as CSS variables on this element, plus the data-theme, data-shape,
// data-texture and data-frames attributes the theme stylesheets key on.
// Server-rendered, so there's no flash. Portals (dialogs, toasts) render
// outside it and keep the visitor's theme.
//
// A device theme ("classic", lib/themes.ts DEVICE_THEMES) follows the
// visitor's light or dark setting instead: its two modes share one look, so
// fonts, radius and the data-* attributes are fixed, and the tokens and
// color-scheme come from a stylesheet that switches on prefers-color-scheme.
// The stylesheet also gives the page behind the scope (<html>, seen when
// overscrolling) that mode's background.
export function ThemeScope({
  theme: id,
  className,
  style: extraStyle,
  children,
}: {
  theme: ScopeThemeId
  className?: string
  // More variables for the scope (the Cyberpunk landing's preloaded fonts),
  // after its own.
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  const device = isDeviceTheme(id)
  const theme = getTheme(device ? DEVICE_THEMES[id].light : id)
  const style = {
    ...(device ? {} : theme.tokens),
    '--theme-font-sans': `var(${theme.fonts.sans})`,
    '--theme-font-mono': `var(${theme.fonts.mono})`,
    '--theme-font-heading': `var(${theme.fonts.heading})`,
    // Explicit, so a rounded scope inside a cut page still gets its corners.
    '--radius': theme.radius,
    ...(device ? {} : { colorScheme: theme.isDark ? 'dark' : 'light' }),
  } as React.CSSProperties

  return (
    <div
      data-slot="theme-scope"
      data-theme={device ? id : theme.id}
      data-shape={theme.shape}
      data-texture={theme.texture}
      data-frames={theme.frames ?? 'none'}
      style={extraStyle ? { ...style, ...extraStyle } : style}
      // bg-texture goes after cn(): tailwind-merge reads it as a background
      // color and would drop bg-background in its favor. A device theme's
      // dark mode comes from the dark: variant's media rule (globals.css),
      // not the dark class.
      className={`${cn(!device && theme.isDark && 'dark', 'bg-background font-sans text-foreground', className)} bg-texture`}
    >
      {device && (
        // React hoists this into <head> once per device theme.
        <style href={`bunplot-device-theme-${id}`} precedence="default">
          {deviceThemeCss(id)}
        </style>
      )}
      {children}
    </div>
  )
}

// A device theme's colors: Light's by default, Dark's when the device is
// dark. On the scope, its tokens and color-scheme; on <html> while the page
// holds the scope, the background and color-scheme, so overscrolling and the
// page's scrollbar match.
function deviceThemeCss(id: DeviceThemeId) {
  const scope = `[data-theme="${id}"]`
  const mode = (theme: ThemeDefinition) => {
    const scheme = `color-scheme:${theme.isDark ? 'dark' : 'light'}`
    const tokens = Object.entries(theme.tokens).map(([key, value]) => `${key}:${value}`)
    return `${scope}{${[...tokens, scheme].join(';')}}:root:has(${scope}){background-color:hsl(${theme.tokens['--background']});${scheme}}`
  }
  const { light, dark } = DEVICE_THEMES[id]
  return `${mode(getTheme(light))}@media (prefers-color-scheme: dark){${mode(getTheme(dark))}}`
}

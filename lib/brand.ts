import type { ThemeId } from '@/lib/themes'

// The only place the logo files are named. Each theme maps to its logo's
// file; themes can share one. The Logo component (components/brand/Logo.tsx)
// shows the right one by CSS, from the nearest data-theme. A theme's own logo
// means adding its file under public/brand/ and pointing its entry here.
export const LOGO_SRCS: Record<ThemeId, string> = {
  'classic-light': '/brand/logo.svg',
  'classic-dark': '/brand/logo.svg',
  cyberpunk: '/brand/logo.svg',
  manuscript: '/brand/logo.svg',
}

// The app icons (app/icon.tsx, app/apple-icon.tsx) are one version for every
// theme: the browser asks for them without knowing the visitor's theme.
export const APP_ICON_SRC = '/brand/logo.svg'

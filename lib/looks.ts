import { LEGACY_THEME_MAP } from '@/lib/themes'

// The looks a signed-out page (the landing, login, signup) can be shown in:
// Classic following the device's light or dark setting, Classic in a fixed
// mode, Cyberpunk and Manuscript. The default, for a visitor with no saved
// theme, is Classic following the device.
export const LOOKS = ['classic', 'classic-light', 'classic-dark', 'cyberpunk', 'manuscript'] as const
export type Look = (typeof LOOKS)[number]
export const DEFAULT_LOOK: Look = 'classic'

export const isLook = (value: string): value is Look => (LOOKS as readonly string[]).includes(value)

// Saved theme settings (THEME_COOKIE in lib/themes.ts) and their looks: the
// System setting follows the device, the rest are their own look, and the
// ids of removed themes map like normalizeThemeSetting() maps them. An exact
// list, looked up with Object.hasOwn, so nothing else in the cookie can pick
// a look.
const SETTING_LOOKS: Readonly<Record<string, Look>> = Object.freeze({
  sync: 'classic',
  'classic-light': 'classic-light',
  'classic-dark': 'classic-dark',
  cyberpunk: 'cyberpunk',
  manuscript: 'manuscript',
  ...LEGACY_THEME_MAP,
})

// The look for a theme cookie's value. The value comes from the visitor's
// browser, so it's untrusted: anything that isn't exactly one of the saved
// settings above (missing, unknown, malformed, path-like) gets the default.
export function lookFromCookie(value: string | undefined): Look {
  if (value === undefined || !Object.hasOwn(SETTING_LOOKS, value)) return DEFAULT_LOOK
  return SETTING_LOOKS[value]
}

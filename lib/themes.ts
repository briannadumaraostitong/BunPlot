export type ThemeId = 'classic-light' | 'classic-dark' | 'cyberpunk' | 'manuscript'
export type ThemeSetting = ThemeId | 'sync'

// Corners: 'cut' chamfers buttons, dialogs and card surfaces (globals.css,
// [data-shape="cut"]); 'rounded' uses --radius as before.
export type ThemeShape = 'rounded' | 'cut'
// Page background (globals.css, [data-texture]): 'grid' a faint square grid,
// 'ruled' faint horizontal lines like ruled paper (no theme uses it today).
export type ThemeTexture = 'none' | 'grid' | 'ruled'
export type ThemeFrames = 'nightcity'

// CSS variable names that next/font defines on <html> (app/layout.tsx).
// `heading` is for headings and titles (font-heading); a theme without a
// heading face of its own points it at its sans.
export interface ThemeFonts {
  sans: string
  mono: string
  heading: string
}

export interface ThemeDefinition {
  id: ThemeId
  label: string
  isDark: boolean
  shape: ThemeShape
  texture: ThemeTexture
  fonts: ThemeFonts
  // Decorative frame set for a few feature spots; null falls back to a plain card.
  frames: ThemeFrames | null
  // --radius, the base of the rounded-* scale. The cut shape squares it.
  radius: string
  tokens: Record<string, string>
}

// Classic Light and Dark share one look and differ only in colors: rounded
// corners, a plain background, Figtree with Bricolage Grotesque headings.
const CLASSIC_LOOK = {
  shape: 'rounded',
  texture: 'none',
  fonts: { sans: '--font-figtree', mono: '--font-geist-mono', heading: '--font-bricolage' },
  frames: null,
  radius: '0.625rem',
} satisfies Pick<ThemeDefinition, 'shape' | 'texture' | 'fonts' | 'frames' | 'radius'>

export const THEMES: ThemeDefinition[] = [
  {
    id: 'classic-light',
    label: 'Classic Light',
    isDark: false,
    ...CLASSIC_LOOK,
    tokens: {
      // Colors from design/landing-classic/HANDOFF.md ("milk chocolate and
      // powder blue"), converted from hex. Buttons and the accent are the
      // chocolate; links are slate (--link).
      '--background':         '50 82.9% 93.1%',  // #FCF7DF cream
      '--foreground':         '26 12.7% 21.6%',  // #3E3630 headings, strong text
      '--card':               '50 100% 97.6%',   // #FFFDF3
      '--card-foreground':    '26 12.7% 21.6%',
      '--popover':            '50 100% 97.6%',
      '--popover-foreground': '26 12.7% 21.6%',
      '--primary':            '26 12.7% 21.6%',  // #3E3630 chocolate
      '--primary-foreground': '50 82.9% 93.1%',
      '--secondary':          '38 30.2% 87.6%',  // #E9E2D6 neutral tag
      '--secondary-foreground': '27 12.5% 31.4%', // #5A4F46 body
      '--muted':              '38 30.2% 87.6%',
      '--muted-foreground':   '31 12.8% 38.2%',  // #6E6255
      '--destructive':        '9 59.6% 40.8%',   // #A63D2A
      '--border':              '42 40.5% 83.5%', // #E6DCC4
      '--input':              '31 11.5% 50.4%',  // #8F8172, 3.7:1 field edges
      '--ring':                '206 23.7% 38%',  // #4A6478 slate
      '--accent':              '26 12.7% 21.6%', // the primary: chocolate
      '--accent-foreground':  '50 82.9% 93.1%',
      '--accent-hover':       '26 11.6% 27.1%',  // #4D443D
      '--accent-muted':       '38 30.2% 87.6%',
      '--accent-border':      '36 18.8% 73.9%',  // #C9BFB0
      '--accent-2':           '204 21.7% 82%',   // #C7D3DB powder blue
      '--accent-3':           '33 14.1% 59.8%',  // #A79A8A taupe
      '--link':               '206 23.7% 38%',   // #4A6478 slate
      '--sidebar':            '47 64% 90.2%',    // #F6EFD6
      '--sidebar-foreground': '26 12.7% 21.6%',
      '--sidebar-primary':    '26 12.7% 21.6%',
      '--sidebar-primary-foreground': '50 82.9% 93.1%',
      '--sidebar-accent':     '45 47.7% 87.3%',  // #EEE6CF
      '--sidebar-accent-foreground': '26 12.7% 21.6%',
      '--sidebar-border':     '42 40.5% 83.5%',
      '--sidebar-ring':       '206 23.7% 38%',
      '--chart-1': '206 23.7% 38%',
      '--chart-2': '33 14.1% 59.8%',
      '--chart-3': '204 21.7% 82%',
      '--chart-4': '46 67.5% 47.1%',
      '--chart-5': '9 59.6% 40.8%',
      '--timeline-track-bg':  '46 57.7% 89.8%',  // #F4EDD6
      '--timeline-grid-line': '42 40.5% 83.5%',
    },
  },
  {
    id: 'classic-dark',
    label: 'Classic Dark',
    isDark: true,
    ...CLASSIC_LOOK,
    tokens: {
      // Colors from design/landing-classic/HANDOFF.md, converted from hex.
      // Buttons, the accent and links are all powder blue.
      '--background':         '24 15.2% 12.9%',  // #26201C deep chocolate
      '--foreground':         '50 82.9% 93.1%',  // #FCF7DF
      '--card':               '23 14.6% 17.5%',  // #332B26
      '--card-foreground':    '50 82.9% 93.1%',
      '--popover':            '23 14.6% 17.5%',
      '--popover-foreground': '50 82.9% 93.1%',
      '--primary':            '204 21.7% 82%',   // #C7D3DB powder blue
      '--primary-foreground': '24 15.2% 12.9%',
      // Darker than the handoff's neutral tag (#4A413A, cream text): muted
      // text sits on these in the app, and needs 4.5:1 (4.6 here, 3.6 there).
      '--secondary':          '26 13.7% 20%',    // #3A322C
      '--secondary-foreground': '42 35.1% 84.9%', // #E6DECB body
      '--muted':              '26 13.7% 20%',
      '--muted-foreground':   '33 14.1% 59.8%',  // #A79A8A taupe
      '--destructive':        '12 68.7% 67.5%',  // #E58A73
      '--border':              '26 12.1% 25.9%', // #4A413A
      '--input':              '32 11.3% 48.6%',  // #8A7D6E, 3.5:1 field edges
      '--ring':                '204 21.7% 82%',
      '--accent':              '204 21.7% 82%',  // the primary: powder blue
      '--accent-foreground':  '24 15.2% 12.9%',
      '--accent-hover':       '203 22.8% 88.8%', // #DCE4E9
      '--accent-muted':       '205 13.1% 28.4%', // #3F4A52
      '--accent-border':      '206 13.3% 41.2%', // #5B6B77
      '--accent-2':           '205 13.1% 28.4%', // #3F4A52 blue tag
      '--accent-3':           '33 14.1% 59.8%',  // #A79A8A taupe
      '--link':               '204 21.7% 82%',   // #C7D3DB
      '--sidebar':            '22 14.7% 14.7%',  // #2B2420
      '--sidebar-foreground': '50 82.9% 93.1%',
      '--sidebar-primary':    '204 21.7% 82%',
      '--sidebar-primary-foreground': '24 15.2% 12.9%',
      '--sidebar-accent':     '26 13.7% 20%',    // #3A322C
      '--sidebar-accent-foreground': '50 82.9% 93.1%',
      '--sidebar-border':     '26 12.1% 25.9%',
      '--sidebar-ring':       '204 21.7% 82%',
      '--chart-1': '204 21.7% 82%',
      '--chart-2': '33 14.1% 59.8%',
      '--chart-3': '206 13.3% 41.2%',
      '--chart-4': '41 59.4% 63.3%',
      '--chart-5': '12 68.7% 67.5%',
      '--timeline-track-bg':  '25 15% 15.7%',    // #2E2722
      '--timeline-grid-line': '26 13% 21.2%',    // #3D352F
    },
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    isDark: true,
    shape: 'cut',
    texture: 'grid',
    fonts: { sans: '--font-chakra-petch', mono: '--font-jetbrains-mono', heading: '--font-chakra-petch' },
    frames: 'nightcity',
    radius: '0rem',
    // Colors from design/landing/HANDOFF.md, converted from hex. Every text
    // color passes 4.5:1 on background, card, secondary and sidebar.
    tokens: {
      '--background':         '228 50% 3.9%',
      '--foreground':         '217 70% 93.5%',
      '--card':               '221 57% 10%',
      '--card-foreground':    '217 70% 93.5%',
      '--popover':            '221 57% 10%',
      '--popover-foreground': '217 70% 93.5%',
      '--primary':            '218 100% 97.8%',
      '--primary-foreground': '228 50% 3.9%',
      '--secondary':          '224 55% 12.2%',
      '--secondary-foreground': '218 48% 85.7%',
      '--muted':              '224 55% 12.2%',
      '--muted-foreground':   '217 31% 66.3%',
      '--destructive':        '11 100% 64.5%',
      '--border':              '221 48% 16.7%',
      '--input':              '218 49% 23.1%',
      '--ring':                '189 100% 59.6%',
      '--accent':              '330 100% 59%',
      '--accent-foreground':  '328 71% 4.1%',
      '--accent-hover':       '330 100% 67.6%',
      '--accent-muted':       '303 38% 10.2%',
      '--accent-border':      '326 59% 30%',
      '--accent-2':           '189 100% 59.6%',
      '--link':               '189 100% 59.6%',  // as --accent-2, unused here so far
      '--accent-3':           '249 100% 74.1%',
      '--sidebar':            '227 53% 3.3%',
      '--sidebar-foreground': '217 70% 93.5%',
      '--sidebar-primary':    '330 100% 59%',
      '--sidebar-primary-foreground': '328 71% 4.1%',
      '--sidebar-accent':     '224 55% 12.2%',
      '--sidebar-accent-foreground': '217 70% 93.5%',
      '--sidebar-border':     '221 48% 16.7%',
      '--sidebar-ring':       '189 100% 59.6%',
      '--chart-1': '330 100% 59%',
      '--chart-2': '189 100% 59.6%',
      '--chart-3': '249 100% 74.1%',
      '--chart-4': '36 100% 63.9%',
      '--chart-5': '145 73% 59.4%',
      '--timeline-track-bg':  '224 55% 12.2%',
      '--timeline-grid-line': '221 48% 16.7%',
    },
  },
  {
    id: 'manuscript',
    label: 'Manuscript',
    isDark: false,
    shape: 'rounded',
    texture: 'none',
    fonts: { sans: '--font-literata', mono: '--font-courier-prime', heading: '--font-cormorant' },
    frames: null,
    radius: '0.1875rem',
    // Colors from design/landing-manuscript/HANDOFF.md, converted from hex
    // (in the comments). Every text color passes 4.5:1 on background, card,
    // secondary and sidebar (accent-3, olive, only just on the sidebar: keep
    // it off body-size text there); input passes 3:1 as a field edge.
    // Primary is the oxblood accent: the main button, as in the mockup.
    tokens: {
      '--background':         '41 51% 90.4%',    // #F3EBDA paper
      '--foreground':         '28 32.1% 10.4%',  // #231A12
      '--card':               '42 61.9% 95.9%',  // #FBF7EE
      '--card-foreground':    '28 32.1% 10.4%',
      '--popover':            '42 61.9% 95.9%',
      '--popover-foreground': '28 32.1% 10.4%',
      '--primary':            '5 61.4% 34.5%',   // #8E2B22 oxblood
      '--primary-foreground': '42 61.9% 95.9%',
      '--secondary':          '41 47.7% 87.3%',  // #EEE4CF
      '--secondary-foreground': '32 25.4% 23.1%', // #4A3C2C body
      '--muted':              '41 47.7% 87.3%',
      '--muted-foreground':   '34 21.5% 35.5%',  // #6E5D47
      '--destructive':        '18 83.1% 34.7%',  // #A23B0F rust
      '--border':              '40 37.1% 75.7%', // #D8C9AA
      '--input':              '38 26.1% 43.5%',  // #8C7752
      '--ring':                '212 43.8% 30%',  // #2B4A6E ink blue
      '--accent':              '5 61.4% 34.5%',
      '--accent-foreground':  '42 61.9% 95.9%',
      '--accent-hover':       '5 63.8% 29.2%',   // #7A231B
      '--accent-muted':       '25 42.3% 89.8%',  // oxblood 10% on card
      '--accent-border':      '9 44.2% 69.8%',   // #D49A90
      '--accent-2':           '212 43.8% 30%',
      '--link':               '212 43.8% 30%',   // ink blue, as --accent-2
      '--accent-3':           '94 29.7% 32.4%',  // #4F6B3A olive
      '--sidebar':            '41 44.7% 85.1%',  // #EADFC8
      '--sidebar-foreground': '28 32.1% 10.4%',
      '--sidebar-primary':    '5 61.4% 34.5%',
      '--sidebar-primary-foreground': '42 61.9% 95.9%',
      '--sidebar-accent':     '41 51% 90.4%',    // paper: muted text keeps 4.5:1
      '--sidebar-accent-foreground': '28 32.1% 10.4%',
      '--sidebar-border':     '40 37.1% 75.7%',
      '--sidebar-ring':       '212 43.8% 30%',
      '--chart-1': '5 61.4% 34.5%',
      '--chart-2': '212 43.8% 30%',
      '--chart-3': '94 29.7% 32.4%',
      '--chart-4': '40 70.4% 31.8%',             // #8A6418 ochre
      '--chart-5': '316 29.7% 32.4%',            // #6B3A5E plum
      '--timeline-track-bg':  '41 47.7% 87.3%',
      '--timeline-grid-line': '40 37.1% 75.7%',
    },
  },
]

export const DEFAULT_THEME_SETTING: ThemeSetting = 'sync'

// localStorage keys. The setting is this device's copy of the profile's
// (profiles.theme), which wins when they differ, except while the unsynced
// marker is set: a change whose save to the profile failed, kept on this
// device and retried on the next app load (ThemeProvider).
export const THEME_STORAGE_KEY = 'plottr-theme'
export const THEME_UNSYNCED_KEY = 'plottr-theme-unsynced'

export const THEME_SETTINGS: ThemeSetting[] = ['sync', ...THEMES.map((t) => t.id)]

// Themes that have been removed, mapped to the current theme closest to them
// (Parchment to Manuscript, the rest to the Classic theme of the same
// lightness), so a saved setting (localStorage or profiles.theme) still lands
// on a sensible theme.
export const LEGACY_THEME_MAP: Record<string, ThemeId> = {
  parchment: 'manuscript',
  rose: 'classic-light',
  seafoam: 'classic-light',
  honey: 'classic-light',
  lilac: 'classic-light',
  nightfall: 'classic-dark',
  forest: 'classic-dark',
  ocean: 'classic-dark',
  autumn: 'classic-dark',
  monochrome: 'classic-dark',
  redblack: 'classic-dark',
}

// Use on every setting read from storage: a removed theme maps to its current
// counterpart; anything else unknown (null, empty, garbage) falls back to the
// default. ThemeScript mirrors this inline, since it can't import it.
export function normalizeThemeSetting(value: unknown): ThemeSetting {
  if (typeof value !== 'string') return DEFAULT_THEME_SETTING
  if (Object.hasOwn(LEGACY_THEME_MAP, value)) return LEGACY_THEME_MAP[value]
  return (THEME_SETTINGS as string[]).includes(value) ? (value as ThemeSetting) : DEFAULT_THEME_SETTING
}

// Themes a ThemeScope can show in the device's light or dark setting, picked
// in CSS (prefers-color-scheme), so the server needn't know it and nothing
// flashes or mismatches on hydration: "classic" is Classic Light or Classic
// Dark. For pages whose theme the server sets (the landing, login, signup);
// the visitor's own setting is left alone. Both modes must share one look
// (shape, fonts, radius, frames): only their colors switch.
export const DEVICE_THEMES = {
  classic: { light: 'classic-light', dark: 'classic-dark' },
} as const satisfies Record<string, { light: ThemeId; dark: ThemeId }>
export type DeviceThemeId = keyof typeof DEVICE_THEMES
// What a ThemeScope takes: a fixed theme or one that follows the device.
export type ScopeThemeId = ThemeId | DeviceThemeId

export const isDeviceTheme = (id: ScopeThemeId): id is DeviceThemeId => Object.hasOwn(DEVICE_THEMES, id)

export function getTheme(id: ThemeId): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}

export function resolveThemeId(setting: ThemeSetting, systemPrefersDark: boolean): ThemeId {
  if (setting === 'sync') return systemPrefersDark ? 'classic-dark' : 'classic-light'
  return setting
}

function getSystemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(setting: ThemeSetting): ThemeId {
  const id = resolveThemeId(normalizeThemeSetting(setting), getSystemPrefersDark())
  const theme = getTheme(id)
  const root = document.documentElement

  Object.entries(theme.tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
  root.style.setProperty('--theme-font-sans', `var(${theme.fonts.sans})`)
  root.style.setProperty('--theme-font-mono', `var(${theme.fonts.mono})`)
  root.style.setProperty('--theme-font-heading', `var(${theme.fonts.heading})`)
  root.style.setProperty('--radius', theme.radius)
  root.setAttribute('data-theme', theme.id)
  root.setAttribute('data-shape', theme.shape)
  root.setAttribute('data-texture', theme.texture)
  root.setAttribute('data-frames', theme.frames ?? 'none')
  root.classList.toggle('dark', theme.isDark)

  return id
}

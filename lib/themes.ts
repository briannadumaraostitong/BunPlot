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
  radius: '0.5rem',
} satisfies Pick<ThemeDefinition, 'shape' | 'texture' | 'fonts' | 'frames' | 'radius'>

export const THEMES: ThemeDefinition[] = [
  {
    id: 'classic-light',
    label: 'Classic Light',
    isDark: false,
    ...CLASSIC_LOOK,
    tokens: {
      '--background':         '0 0% 99%',
      '--foreground':         '220 20% 10%',
      '--card':               '0 0% 100%',
      '--card-foreground':    '220 20% 10%',
      '--popover':            '0 0% 100%',
      '--popover-foreground': '220 20% 10%',
      '--primary':            '220 20% 10%',
      '--primary-foreground': '0 0% 99%',
      '--secondary':          '220 14% 96%',
      '--secondary-foreground': '220 20% 20%',
      '--muted':              '220 14% 96%',
      '--muted-foreground':   '220 10% 50%',
      '--destructive':        '0 84% 60%',
      '--border':              '220 13% 91%',
      '--input':              '220 13% 91%',
      '--ring':                '217 91% 60%',
      '--accent':              '217 91% 60%',
      '--accent-foreground':  '0 0% 100%',
      '--accent-hover':       '217 91% 53%',
      '--accent-muted':       '217 91% 95%',
      '--accent-border':      '217 91% 80%',
      '--accent-2':           '262 83% 63%',
      '--accent-3':           '158 64% 46%',
      '--sidebar':            '220 20% 98%',
      '--sidebar-foreground': '220 20% 10%',
      '--sidebar-primary':    '220 20% 10%',
      '--sidebar-primary-foreground': '0 0% 99%',
      '--sidebar-accent':     '220 14% 94%',
      '--sidebar-accent-foreground': '220 20% 10%',
      '--sidebar-border':     '220 13% 91%',
      '--sidebar-ring':       '217 91% 60%',
      '--chart-1': '217 91% 60%',
      '--chart-2': '262 83% 63%',
      '--chart-3': '158 64% 46%',
      '--chart-4': '35 92% 55%',
      '--chart-5': '0 84% 60%',
      '--timeline-track-bg':  '220 14% 96%',
      '--timeline-grid-line': '220 13% 88%',
    },
  },
  {
    id: 'classic-dark',
    label: 'Classic Dark',
    isDark: true,
    ...CLASSIC_LOOK,
    tokens: {
      '--background':         '222 25% 9%',
      '--foreground':         '210 20% 92%',
      '--card':               '222 25% 12%',
      '--card-foreground':    '210 20% 92%',
      '--popover':            '222 25% 12%',
      '--popover-foreground': '210 20% 92%',
      '--primary':            '210 20% 92%',
      '--primary-foreground': '222 25% 9%',
      '--secondary':          '222 20% 16%',
      '--secondary-foreground': '210 20% 80%',
      '--muted':              '222 20% 16%',
      '--muted-foreground':   '210 10% 55%',
      '--destructive':        '0 72% 51%',
      '--border':              '222 20% 20%',
      '--input':              '222 20% 20%',
      '--ring':                '217 91% 65%',
      '--accent':              '217 91% 65%',
      '--accent-foreground':  '0 0% 100%',
      '--accent-hover':       '217 91% 72%',
      '--accent-muted':       '217 40% 15%',
      '--accent-border':      '217 60% 30%',
      '--accent-2':           '262 83% 63%',
      '--accent-3':           '158 64% 46%',
      '--sidebar':            '222 25% 7%',
      '--sidebar-foreground': '210 20% 92%',
      '--sidebar-primary':    '217 91% 65%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent':     '222 20% 14%',
      '--sidebar-accent-foreground': '210 20% 92%',
      '--sidebar-border':     '222 20% 14%',
      '--sidebar-ring':       '217 91% 65%',
      '--chart-1': '217 91% 60%',
      '--chart-2': '262 83% 63%',
      '--chart-3': '158 64% 46%',
      '--chart-4': '35 92% 55%',
      '--chart-5': '0 84% 60%',
      '--timeline-track-bg':  '222 20% 14%',
      '--timeline-grid-line': '222 20% 18%',
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

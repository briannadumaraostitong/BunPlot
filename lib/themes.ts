export type ThemeId = 'classic-light' | 'classic-dark'
export type ThemeSetting = ThemeId | 'sync'

export interface ThemeDefinition {
  id: ThemeId
  label: string
  isDark: boolean
  tokens: Record<string, string>
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'classic-light',
    label: 'Classic Light',
    isDark: false,
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
]

export const DEFAULT_THEME_SETTING: ThemeSetting = 'sync'

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
  const id = resolveThemeId(setting, getSystemPrefersDark())
  const theme = getTheme(id)
  const root = document.documentElement

  Object.entries(theme.tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
  root.setAttribute('data-theme', theme.id)
  root.classList.toggle('dark', theme.isDark)

  return id
}

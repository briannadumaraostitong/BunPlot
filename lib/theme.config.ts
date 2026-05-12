import type { AccentColor, AppTheme } from '@/types/database'

export const ACCENT_COLORS = {
  blue: {
    label: 'Ocean Blue',
    value: 'blue' as AccentColor,
    cssVars: {
      '--accent':              '217 91% 60%',
      '--accent-hover':        '217 91% 53%',
      '--accent-muted':        '217 91% 95%',
      '--accent-border':       '217 91% 80%',
      '--accent-ring':         '217 91% 60%',
      '--accent-dark':         '217 91% 65%',
      '--accent-hover-dark':   '217 91% 72%',
      '--accent-muted-dark':   '217 40% 15%',
      '--accent-border-dark':  '217 60% 30%',
    },
    tailwind: 'blue',
    preview: '#3B82F6',
  },
  purple: {
    label: 'Violet',
    value: 'purple' as AccentColor,
    cssVars: {
      '--accent':              '262 83% 63%',
      '--accent-hover':        '262 83% 56%',
      '--accent-muted':        '262 83% 96%',
      '--accent-border':       '262 83% 80%',
      '--accent-ring':         '262 83% 63%',
      '--accent-dark':         '262 83% 68%',
      '--accent-hover-dark':   '262 83% 75%',
      '--accent-muted-dark':   '262 40% 15%',
      '--accent-border-dark':  '262 60% 30%',
    },
    tailwind: 'violet',
    preview: '#8B5CF6',
  },
  emerald: {
    label: 'Emerald',
    value: 'emerald' as AccentColor,
    cssVars: {
      '--accent':              '158 64% 46%',
      '--accent-hover':        '158 64% 39%',
      '--accent-muted':        '158 64% 95%',
      '--accent-border':       '158 64% 75%',
      '--accent-ring':         '158 64% 46%',
      '--accent-dark':         '158 64% 52%',
      '--accent-hover-dark':   '158 64% 60%',
      '--accent-muted-dark':   '158 40% 12%',
      '--accent-border-dark':  '158 55% 28%',
    },
    tailwind: 'emerald',
    preview: '#10B981',
  },
} as const

export interface AccentColorConfig {
  label: string
  value: AccentColor
  cssVars: Record<string, string>
  tailwind: string
  preview: string
}

export function applyAccentColor(color: AccentColor, isDark: boolean) {
  const config = ACCENT_COLORS[color]
  const root = document.documentElement

  Object.entries(config.cssVars).forEach(([key, value]) => {
    if (isDark && key.endsWith('-dark')) {
      root.style.setProperty(key.replace('-dark', ''), value as string)
    } else if (!isDark && !key.endsWith('-dark')) {
      root.style.setProperty(key, value as string)
    }
  })

  root.setAttribute('data-accent', color)
}

export function applyTheme(theme: AppTheme): boolean {
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
  root.classList.toggle('dark', isDark)
  root.setAttribute('data-theme', isDark ? 'dark' : 'light')
  return isDark
}

export const DEFAULT_ACCENT: AccentColor = 'blue'
export const DEFAULT_THEME: AppTheme = 'system'

export const LAYER_COLORS = [
  '#6366F1',
  '#EC4899',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EF4444',
  '#06B6D4',
  '#84CC16',
  '#F97316',
  '#14B8A6',
  '#A855F7',
] as const
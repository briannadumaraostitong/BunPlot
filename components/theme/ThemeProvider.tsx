'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import type { ThemeSetting } from '@/lib/themes'
import { applyTheme, getTheme, resolveThemeId, DEFAULT_THEME_SETTING } from '@/lib/themes'
import { createClient } from '@/lib/supabase/client'

interface ThemeContextValue {
  theme: ThemeSetting
  isDark: boolean
  setTheme: (theme: ThemeSetting) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}

interface ThemeProviderProps {
  children: React.ReactNode
  initialTheme?: ThemeSetting
}

// Initialize system dark preference synchronously (safe — runs once at module level on client)
function getSystemDark() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Lazy init reads what ThemeScript already painted onto the DOM pre-hydration,
// so React state agrees with localStorage instead of resetting to the default.
function getStoredTheme(fallback: ThemeSetting): ThemeSetting {
  if (typeof window === 'undefined') return fallback
  const stored = localStorage.getItem('plottr-theme') as ThemeSetting | null
  return stored ?? fallback
}

export function ThemeProvider({
  children,
  initialTheme = DEFAULT_THEME_SETTING,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeSetting>(() => getStoredTheme(initialTheme))
  // Initialize directly from window — avoids needing setState in effect
  const [systemDark, setSystemDark] = useState<boolean>(getSystemDark)

  const isDark = useMemo(
    () => getTheme(resolveThemeId(theme, systemDark)).isDark,
    [theme, systemDark]
  )

  // Apply to DOM — pure side effect, no setState
  useEffect(() => {
    applyTheme(theme)
  }, [theme, systemDark])

  // Subscribe to system preference changes — setState only in callback, not in body
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const supabase = createClient()

  const setTheme = useCallback(async (newTheme: ThemeSetting) => {
    setThemeState(newTheme)
    localStorage.setItem('plottr-theme', newTheme)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ theme: newTheme } as never)
        .eq('id', user.id)
    }
  }, [supabase])

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

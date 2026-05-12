'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import type { AccentColor, AppTheme } from '@/types/database'
import { applyAccentColor, applyTheme, DEFAULT_ACCENT, DEFAULT_THEME } from '@/lib/theme.config'
import { createClient } from '@/lib/supabase/client'

interface ThemeContextValue {
  theme: AppTheme
  accent: AccentColor
  isDark: boolean
  setTheme: (theme: AppTheme) => Promise<void>
  setAccent: (accent: AccentColor) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}

interface ThemeProviderProps {
  children: React.ReactNode
  initialTheme?: AppTheme
  initialAccent?: AccentColor
}

// Initialize system dark preference synchronously (safe — runs once at module level on client)
function getSystemDark() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({
  children,
  initialTheme = DEFAULT_THEME,
  initialAccent = DEFAULT_ACCENT,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<AppTheme>(initialTheme)
  const [accent, setAccentState] = useState<AccentColor>(initialAccent)
  // Initialize directly from window — avoids needing setState in effect
  const [systemDark, setSystemDark] = useState<boolean>(getSystemDark)

  const isDark = useMemo(() => {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return systemDark
  }, [theme, systemDark])

  // Apply to DOM — pure side effect, no setState
  useEffect(() => {
    applyTheme(theme)
    applyAccentColor(accent, isDark)
  }, [theme, accent, isDark])

  // Subscribe to system preference changes — setState only in callback, not in body
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const supabase = createClient()

  const setTheme = useCallback(async (newTheme: AppTheme) => {
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

  const setAccent = useCallback(async (newAccent: AccentColor) => {
    setAccentState(newAccent)
    localStorage.setItem('plottr-accent', newAccent)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ accent_color: newAccent } as never)
        .eq('id', user.id)
    }
  }, [supabase])

  return (
    <ThemeContext.Provider value={{ theme, accent, isDark, setTheme, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}
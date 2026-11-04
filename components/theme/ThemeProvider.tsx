'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import type { ThemeSetting } from '@/lib/themes'
import { applyTheme, getTheme, resolveThemeId, normalizeThemeSetting, DEFAULT_THEME_SETTING } from '@/lib/themes'
import { createClient } from '@/lib/supabase/client'
import { isAuthSessionMissingError } from '@supabase/supabase-js'
import { notifyError } from '@/lib/notify'

// Toast only, one id however often the theme is toggled. The theme is
// already applied and kept in localStorage; a failed save only means other
// devices won't pick it up.
const THEME_SAVE_TOAST_ID = 'theme-save'
const THEME_SAVE_MESSAGE = "Couldn't save your theme. It still applies on this device."

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
// Normalized the same way, so a removed theme's id agrees too.
function getStoredTheme(fallback: ThemeSetting): ThemeSetting {
  if (typeof window === 'undefined') return fallback
  const stored = localStorage.getItem('plottr-theme')
  return stored === null ? fallback : normalizeThemeSetting(stored)
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
    // supabase-js returns { error } rather than throwing, so no settle here.
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user) {
      // Signed out (e.g. the login page) has nothing to save to; anything
      // else, such as a network failure, means the save didn't happen.
      if (userError && !isAuthSessionMissingError(userError)) {
        notifyError(THEME_SAVE_MESSAGE, userError, { id: THEME_SAVE_TOAST_ID })
      }
      return
    }
    const { error } = await supabase
      .from('profiles')
      .update({ theme: newTheme } as never)
      .eq('id', user.id)
    if (error) notifyError(THEME_SAVE_MESSAGE, error, { id: THEME_SAVE_TOAST_ID })
  }, [supabase])

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

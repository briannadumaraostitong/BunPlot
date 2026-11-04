'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import type { ThemeSetting } from '@/lib/themes'
import {
  applyTheme,
  getTheme,
  resolveThemeId,
  normalizeThemeSetting,
  DEFAULT_THEME_SETTING,
  THEME_STORAGE_KEY,
  THEME_UNSYNCED_KEY,
} from '@/lib/themes'
import { createClient } from '@/lib/supabase/client'
import { isAuthSessionMissingError } from '@supabase/supabase-js'
import { notifyError } from '@/lib/notify'

// Toast only, one id however often the theme is toggled. The theme is
// already applied and kept in localStorage; a failed save only means other
// devices won't pick it up. The unsynced marker keeps that promise: the
// profile's theme doesn't replace this one until the save goes through.
const THEME_SAVE_TOAST_ID = 'theme-save'
const THEME_SAVE_MESSAGE = "Couldn't save your theme. It still applies on this device."

interface ThemeContextValue {
  theme: ThemeSetting
  isDark: boolean
  setTheme: (theme: ThemeSetting) => Promise<void>
  // Applies the profile's setting (profiles.theme) on this device without
  // saving it back; ignored while a failed save is pending here.
  adoptTheme: (theme: ThemeSetting) => void
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
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
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

  // Saves a setting to the profile. A failed save sets the unsynced marker (a
  // successful one clears it); signed out, there's nothing to save to and the
  // marker is left as it is. `quiet` skips the toast, for the retry on load.
  const saveToProfile = useCallback(async (setting: ThemeSetting, quiet = false) => {
    // supabase-js returns { error } rather than throwing, so no settle here.
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user) {
      // Signed out (e.g. the login page) has nothing to save to; anything
      // else, such as a network failure, means the save didn't happen.
      if (userError && !isAuthSessionMissingError(userError)) {
        localStorage.setItem(THEME_UNSYNCED_KEY, setting)
        if (!quiet) notifyError(THEME_SAVE_MESSAGE, userError, { id: THEME_SAVE_TOAST_ID })
      }
      return
    }
    const { error } = await supabase
      .from('profiles')
      .update({ theme: setting } as never)
      .eq('id', user.id)
    if (error) {
      localStorage.setItem(THEME_UNSYNCED_KEY, setting)
      if (!quiet) notifyError(THEME_SAVE_MESSAGE, error, { id: THEME_SAVE_TOAST_ID })
    } else {
      localStorage.removeItem(THEME_UNSYNCED_KEY)
    }
  }, [supabase])

  const setTheme = useCallback(async (newTheme: ThemeSetting) => {
    setThemeState(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    await saveToProfile(newTheme)
  }, [saveToProfile])

  const adoptTheme = useCallback((next: ThemeSetting) => {
    if (localStorage.getItem(THEME_UNSYNCED_KEY) !== null) return
    localStorage.setItem(THEME_STORAGE_KEY, next)
    setThemeState(next)
  }, [])

  // A save that failed earlier on this device: retry it once per load, quietly
  // (the toast already went out). Until it succeeds, this device's setting
  // wins over the profile's.
  useEffect(() => {
    const pending = localStorage.getItem(THEME_UNSYNCED_KEY)
    if (pending !== null) void saveToProfile(normalizeThemeSetting(pending), true)
  }, [saveToProfile])

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, adoptTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

'use client'

import { createContext, useContext } from 'react'
import type { Look } from '@/lib/looks'

// The look the sign-in and sign-up pages are shown in, set on the server by
// their layout (app/(auth)/look/[look]/layout.tsx, from the visitor's saved
// theme) and read by the client pages to pick their shell and the few
// classes that differ by theme.
export type AuthTheme = Look

const AuthThemeContext = createContext<AuthTheme>('cyberpunk')

export function AuthThemeProvider({ theme, children }: { theme: AuthTheme; children: React.ReactNode }) {
  return <AuthThemeContext value={theme}>{children}</AuthThemeContext>
}

export const useAuthTheme = () => useContext(AuthThemeContext)

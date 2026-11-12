'use client'

import { createContext, useContext } from 'react'

// The theme the sign-in and sign-up pages are shown in, set on the server by
// app/(auth)/layout.tsx (as the landing page sets its own) and read by the
// client pages to pick their shell and the few classes that differ by theme.
export type AuthTheme = 'cyberpunk' | 'manuscript'

const AuthThemeContext = createContext<AuthTheme>('cyberpunk')

export function AuthThemeProvider({ theme, children }: { theme: AuthTheme; children: React.ReactNode }) {
  return <AuthThemeContext value={theme}>{children}</AuthThemeContext>
}

export const useAuthTheme = () => useContext(AuthThemeContext)

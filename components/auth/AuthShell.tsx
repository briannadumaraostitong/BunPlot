'use client'

import { useAuthTheme, type AuthTheme } from './AuthTheme'
import { CyberpunkAuthShell } from './CyberpunkAuthShell'
import { ManuscriptAuthShell } from './ManuscriptAuthShell'

export type AuthShellProps = {
  eyebrow: string
  // Cyberpunk's eyebrow color; other themes have one eyebrow style.
  eyebrowTone?: 'cyan' | 'pink'
  title: string
  // The panel's header, written in capitals as Cyberpunk shows it.
  panelTitle: string
  footer?: React.ReactNode
  children: React.ReactNode
}

// Each theme's frame around the sign-in and sign-up forms, in the look of
// its landing page. The theme comes from the server (app/(auth)/layout.tsx)
// through AuthThemeProvider, as the landing page picks its own.
const SHELLS: Record<AuthTheme, (props: AuthShellProps) => React.ReactNode> = {
  cyberpunk: CyberpunkAuthShell,
  manuscript: ManuscriptAuthShell,
}

export function AuthShell(props: AuthShellProps) {
  const Shell = SHELLS[useAuthTheme()]
  return <Shell {...props} />
}

// Field labels, shared by both forms in every theme (the field-label hook
// gives each theme its label style).
export const AUTH_LABEL = 'text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'

// The classes that differ by theme in the forms themselves: the footer link,
// the buttons' case and the submit button's weight.
const LOOKS: Record<AuthTheme, { link: string; button: string; submit: string }> = {
  cyberpunk: {
    link: 'text-accent-2 uppercase tracking-[1px] transition-colors hover:text-accent',
    button: 'uppercase tracking-[1px]',
    submit: 'font-bold',
  },
  manuscript: {
    link: 'text-accent-2 underline decoration-1 underline-offset-[3px] transition-colors hover:text-accent',
    button: '',
    submit: 'font-semibold',
  },
}

export const useAuthLook = () => LOOKS[useAuthTheme()]

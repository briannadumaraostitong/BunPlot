import { ThemeScope } from '@/components/theme/ThemeScope'

// Sign-in and sign-up look like the landing page: always Cyberpunk, through a
// ThemeScope, so the visitor's own theme setting is left alone.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeScope theme="cyberpunk" className="min-h-dvh">
      {children}
    </ThemeScope>
  )
}

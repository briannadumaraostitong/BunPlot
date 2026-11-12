import { ThemeScope } from '@/components/theme/ThemeScope'
import { AuthThemeProvider, type AuthTheme } from '@/components/auth/AuthTheme'

// The sign-in and sign-up pages' theme, whatever the visitor's own: the
// landing page's (THEME in app/page.tsx), so the two look alike.
const THEME: AuthTheme = 'cyberpunk'

// Sign-in and sign-up look like the landing page: in THEME, through a
// ThemeScope, so the visitor's own theme setting is left alone. The pages
// are client components, so the theme reaches their shell through
// AuthThemeProvider.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeScope theme={THEME} className="min-h-dvh">
      <AuthThemeProvider theme={THEME}>{children}</AuthThemeProvider>
    </ThemeScope>
  )
}

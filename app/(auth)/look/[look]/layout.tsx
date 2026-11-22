import { notFound } from 'next/navigation'
import { ThemeScope } from '@/components/theme/ThemeScope'
import { AuthThemeProvider } from '@/components/auth/AuthTheme'
import { LOOKS, isLook } from '@/lib/looks'

// Login and signup, prebuilt in each look (lib/looks.ts). Visitors never see
// these URLs: proxy.ts rewrites /login and /signup to the look of the
// visitor's saved theme (the theme cookie), Classic following the device
// when there's none, so they match the landing page.
export function generateStaticParams() {
  return LOOKS.map((look) => ({ look }))
}
export const dynamicParams = false

// The look through a ThemeScope, so the visitor's own theme setting is left
// alone. The pages are client components, so the look reaches their shell
// through AuthThemeProvider.
export default async function AuthLayout({ children, params }: LayoutProps<'/look/[look]'>) {
  const { look } = await params
  if (!isLook(look)) notFound()
  return (
    <ThemeScope theme={look} className="min-h-dvh">
      <AuthThemeProvider theme={look}>{children}</AuthThemeProvider>
    </ThemeScope>
  )
}

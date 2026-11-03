import type { Metadata } from 'next'
import { Geist, Geist_Mono, Chakra_Petch, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ThemeScript } from '@/components/theme/ThemeScript'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// Cyberpunk theme fonts. Not preloaded: in the root layout that would fetch
// them on every page whatever the theme; they load once a theme uses them.
const chakraPetch = Chakra_Petch({
  variable: '--font-chakra-petch',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  preload: false,
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  preload: false,
})

export const metadata: Metadata = {
  title: 'BunPlot',
  description: 'The visual story timeline planner for writers.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // The font variables sit on <html>, where the theme's --theme-font-* tokens
    // are set: a variable defined only on <body> can't resolve up there.
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${chakraPetch.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
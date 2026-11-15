import type { Metadata } from 'next'
import { Figtree, Bricolage_Grotesque, Geist_Mono, Chakra_Petch, JetBrains_Mono, Literata, Courier_Prime, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ThemeScript } from '@/components/theme/ThemeScript'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

// Classic theme fonts, preloaded: Classic is the default look. Figtree for
// text and UI, Bricolage Grotesque for headings (both variable fonts: every
// weight from one file; Bricolage with its optical-size axis), Geist Mono in
// the mono role (code, hex values).
const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin'],
})

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  axes: ['opsz'],
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

// Manuscript theme fonts, not preloaded either: Literata for text and UI
// (a variable font: every weight from one file), Courier Prime in the mono
// role (labels, counts), Cormorant Garamond for headings, italics for emphasis.
const literata = Literata({
  variable: '--font-literata',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  preload: false,
})

const courierPrime = Courier_Prime({
  variable: '--font-courier-prime',
  subsets: ['latin'],
  weight: ['400', '700'],
  preload: false,
})

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
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
    <html lang="en" className={`${figtree.variable} ${bricolage.variable} ${geistMono.variable} ${chakraPetch.variable} ${jetbrainsMono.variable} ${literata.variable} ${courierPrime.variable} ${cormorant.variable}`} suppressHydrationWarning>
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
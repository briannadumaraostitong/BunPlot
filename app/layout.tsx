import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ThemeScript } from '@/components/theme/ThemeScript'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { FONT_VARIABLES } from './fonts'

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
    // The font variables (app/fonts) sit on <html>, where the theme's
    // --theme-font-* tokens are set: a variable defined only on <body> can't
    // resolve up there.
    // data-scroll-behavior: the landing scrolls smoothly to its sections
    // (components/landing/motion.css); this tells Next to switch that off
    // while it scrolls for a route change, so a new page never glides.
    <html lang="en" data-scroll-behavior="smooth" style={FONT_VARIABLES} suppressHydrationWarning>
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
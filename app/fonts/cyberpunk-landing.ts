import localFont from 'next/font/local'
import { FONT_STACKS } from '.'

// Cyberpunk's latin fonts, preloaded on the Cyberpunk landing page only:
// imported only by its page file (app/landing/cyberpunk/), and next/font
// preloads a font on the pages that import it. Chakra Petch (text and
// headings, every weight the theme uses) and JetBrains Mono (labels), so the
// hero renders in them from the first paint rather than swapping in. They're
// the same files as Cyberpunk's latin calls in ./index.ts, declared again
// because preloading is per call; next/font emits preloaded files under
// their own names, so on this page the variables point at these copies
// (CYBERPUNK_LANDING_FONT_VARIABLES, set on the landing's ThemeScope) and
// the other copies aren't downloaded. Other subsets load as everywhere else.
const chakraPetchLatinPreloaded = localFont({
  src: [
    { path: './chakra-petch/latin-normal-400.woff2', weight: '400', style: 'normal' },
    { path: './chakra-petch/latin-normal-500.woff2', weight: '500', style: 'normal' },
    { path: './chakra-petch/latin-normal-600.woff2', weight: '600', style: 'normal' },
    { path: './chakra-petch/latin-normal-700.woff2', weight: '700', style: 'normal' },
  ],
  preload: true,
  adjustFontFallback: false,
  fallback: ['BunPlot Chakra Petch Fallback'],
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }],
})
const jetbrainsMonoLatinPreloaded = localFont({
  src: [
    { path: './jetbrains-mono/latin-normal-400-500.woff2', weight: '400', style: 'normal' },
    { path: './jetbrains-mono/latin-normal-400-500.woff2', weight: '500', style: 'normal' },
  ],
  preload: true,
  adjustFontFallback: false,
  fallback: ['BunPlot JetBrains Mono Fallback'],
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }],
})

// A family's stack with its latin family swapped for the preloaded copy.
function withPreloadedLatin(variable: keyof typeof FONT_STACKS, font: ReturnType<typeof localFont>) {
  const [, ...rest] = FONT_STACKS[variable].split(', ')
  return [font.style.fontFamily.split(', ')[0], ...rest].join(', ')
}

export const CYBERPUNK_LANDING_FONT_VARIABLES = {
  '--font-chakra-petch': withPreloadedLatin('--font-chakra-petch', chakraPetchLatinPreloaded),
  '--font-jetbrains-mono': withPreloadedLatin('--font-jetbrains-mono', jetbrainsMonoLatinPreloaded),
} as React.CSSProperties

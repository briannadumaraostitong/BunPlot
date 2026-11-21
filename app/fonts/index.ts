import localFont from 'next/font/local'
import './fallbacks.css'

type LocalFont = ReturnType<typeof localFont>

// The UI fonts, self-hosted so a build never depends on reaching Google
// Fonts. The files are the ones Google serves (OFL; see ASSETS.md and each
// folder's OFL.txt), split as Google splits them: one file per subset
// (latin, latin-ext, Cyrillic, Greek, Vietnamese, Thai, symbols, as each
// family has them), each with its unicode-range, so a browser downloads only
// the subsets the text on screen needs. next/font/local gives every file in
// one call the same unicode-range, so each subset is its own call; stack()
// joins a family's calls into the CSS variable the themes use (lib/themes.ts,
// globals.css), latin first. Where ranges overlap, the first family that
// covers a character wins, as the last-declared face did in Google's CSS.
//
// Classic's latin files are preloaded (Classic is the default look);
// nothing else is, so the other themes' fonts load only once they're used.
// Each family's latin call names its metric-matched fallback (Arial, or
// Times New Roman for the serifs), declared in fallbacks.css with the values
// next/font/google used; it ends the stack.
// Bricolage keeps Google's font-stretch: 100%. Literata has no optical-size
// axis in these files (next/font/google didn't request it either).

const figtreeLatin = localFont({
  src: [
    { path: './figtree/latin-normal-300-900.woff2', weight: '300 900', style: 'normal' },
  ],
  preload: true,
  adjustFontFallback: false,
  fallback: ['BunPlot Figtree Fallback'],
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }],
})
const figtreeLatinExt = localFont({
  src: [
    { path: './figtree/latin-ext-normal-300-900.woff2', weight: '300 900', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF' }],
})

const bricolageLatin = localFont({
  src: [
    { path: './bricolage-grotesque/latin-normal-200-800.woff2', weight: '200 800', style: 'normal' },
  ],
  preload: true,
  adjustFontFallback: false,
  fallback: ['BunPlot Bricolage Grotesque Fallback'],
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }, { prop: 'font-stretch', value: '100%' }],
})
const bricolageLatinExt = localFont({
  src: [
    { path: './bricolage-grotesque/latin-ext-normal-200-800.woff2', weight: '200 800', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF' }, { prop: 'font-stretch', value: '100%' }],
})
const bricolageVietnamese = localFont({
  src: [
    { path: './bricolage-grotesque/vietnamese-normal-200-800.woff2', weight: '200 800', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB' }, { prop: 'font-stretch', value: '100%' }],
})

const geistMonoLatin = localFont({
  src: [
    { path: './geist-mono/latin-normal-100-900.woff2', weight: '100 900', style: 'normal' },
  ],
  preload: true,
  adjustFontFallback: false,
  fallback: ['BunPlot Geist Mono Fallback'],
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }],
})
const geistMonoLatinExt = localFont({
  src: [
    { path: './geist-mono/latin-ext-normal-100-900.woff2', weight: '100 900', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF' }],
})
const geistMonoVietnamese = localFont({
  src: [
    { path: './geist-mono/vietnamese-normal-100-900.woff2', weight: '100 900', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB' }],
})
const geistMonoSymbols2 = localFont({
  src: [
    { path: './geist-mono/symbols2-normal-100-900.woff2', weight: '100 900', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+2000-2001, U+2004-2008, U+200A, U+23B8-23BD, U+2500-259F' }],
})
const geistMonoCyrillic = localFont({
  src: [
    { path: './geist-mono/cyrillic-normal-100-900.woff2', weight: '100 900', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116' }],
})
const geistMonoCyrillicExt = localFont({
  src: [
    { path: './geist-mono/cyrillic-ext-normal-100-900.woff2', weight: '100 900', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F' }],
})

const chakraPetchLatin = localFont({
  src: [
    { path: './chakra-petch/latin-normal-400.woff2', weight: '400', style: 'normal' },
    { path: './chakra-petch/latin-normal-500.woff2', weight: '500', style: 'normal' },
    { path: './chakra-petch/latin-normal-600.woff2', weight: '600', style: 'normal' },
    { path: './chakra-petch/latin-normal-700.woff2', weight: '700', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  fallback: ['BunPlot Chakra Petch Fallback'],
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }],
})
const chakraPetchLatinExt = localFont({
  src: [
    { path: './chakra-petch/latin-ext-normal-400.woff2', weight: '400', style: 'normal' },
    { path: './chakra-petch/latin-ext-normal-500.woff2', weight: '500', style: 'normal' },
    { path: './chakra-petch/latin-ext-normal-600.woff2', weight: '600', style: 'normal' },
    { path: './chakra-petch/latin-ext-normal-700.woff2', weight: '700', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF' }],
})
const chakraPetchVietnamese = localFont({
  src: [
    { path: './chakra-petch/vietnamese-normal-400.woff2', weight: '400', style: 'normal' },
    { path: './chakra-petch/vietnamese-normal-500.woff2', weight: '500', style: 'normal' },
    { path: './chakra-petch/vietnamese-normal-600.woff2', weight: '600', style: 'normal' },
    { path: './chakra-petch/vietnamese-normal-700.woff2', weight: '700', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB' }],
})
const chakraPetchThai = localFont({
  src: [
    { path: './chakra-petch/thai-normal-400.woff2', weight: '400', style: 'normal' },
    { path: './chakra-petch/thai-normal-500.woff2', weight: '500', style: 'normal' },
    { path: './chakra-petch/thai-normal-600.woff2', weight: '600', style: 'normal' },
    { path: './chakra-petch/thai-normal-700.woff2', weight: '700', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+02D7, U+0303, U+0331, U+0E01-0E5B, U+200C-200D, U+25CC' }],
})

const jetbrainsMonoLatin = localFont({
  src: [
    { path: './jetbrains-mono/latin-normal-400-500.woff2', weight: '400', style: 'normal' },
    { path: './jetbrains-mono/latin-normal-400-500.woff2', weight: '500', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  fallback: ['BunPlot JetBrains Mono Fallback'],
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }],
})
const jetbrainsMonoLatinExt = localFont({
  src: [
    { path: './jetbrains-mono/latin-ext-normal-400-500.woff2', weight: '400', style: 'normal' },
    { path: './jetbrains-mono/latin-ext-normal-400-500.woff2', weight: '500', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF' }],
})
const jetbrainsMonoVietnamese = localFont({
  src: [
    { path: './jetbrains-mono/vietnamese-normal-400-500.woff2', weight: '400', style: 'normal' },
    { path: './jetbrains-mono/vietnamese-normal-400-500.woff2', weight: '500', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB' }],
})
const jetbrainsMonoGreek = localFont({
  src: [
    { path: './jetbrains-mono/greek-normal-400-500.woff2', weight: '400', style: 'normal' },
    { path: './jetbrains-mono/greek-normal-400-500.woff2', weight: '500', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0370-0377, U+037A-037F, U+0384-038A, U+038C, U+038E-03A1, U+03A3-03FF' }],
})
const jetbrainsMonoCyrillic = localFont({
  src: [
    { path: './jetbrains-mono/cyrillic-normal-400-500.woff2', weight: '400', style: 'normal' },
    { path: './jetbrains-mono/cyrillic-normal-400-500.woff2', weight: '500', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116' }],
})
const jetbrainsMonoCyrillicExt = localFont({
  src: [
    { path: './jetbrains-mono/cyrillic-ext-normal-400-500.woff2', weight: '400', style: 'normal' },
    { path: './jetbrains-mono/cyrillic-ext-normal-400-500.woff2', weight: '500', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F' }],
})

const literataLatin = localFont({
  src: [
    { path: './literata/latin-italic-200-900.woff2', weight: '200 900', style: 'italic' },
    { path: './literata/latin-normal-200-900.woff2', weight: '200 900', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  fallback: ['BunPlot Literata Fallback'],
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }],
})
const literataLatinExt = localFont({
  src: [
    { path: './literata/latin-ext-italic-200-900.woff2', weight: '200 900', style: 'italic' },
    { path: './literata/latin-ext-normal-200-900.woff2', weight: '200 900', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF' }],
})
const literataVietnamese = localFont({
  src: [
    { path: './literata/vietnamese-italic-200-900.woff2', weight: '200 900', style: 'italic' },
    { path: './literata/vietnamese-normal-200-900.woff2', weight: '200 900', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB' }],
})
const literataGreek = localFont({
  src: [
    { path: './literata/greek-italic-200-900.woff2', weight: '200 900', style: 'italic' },
    { path: './literata/greek-normal-200-900.woff2', weight: '200 900', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0370-0377, U+037A-037F, U+0384-038A, U+038C, U+038E-03A1, U+03A3-03FF' }],
})
const literataGreekExt = localFont({
  src: [
    { path: './literata/greek-ext-italic-200-900.woff2', weight: '200 900', style: 'italic' },
    { path: './literata/greek-ext-normal-200-900.woff2', weight: '200 900', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+1F00-1FFF' }],
})
const literataCyrillic = localFont({
  src: [
    { path: './literata/cyrillic-italic-200-900.woff2', weight: '200 900', style: 'italic' },
    { path: './literata/cyrillic-normal-200-900.woff2', weight: '200 900', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116' }],
})
const literataCyrillicExt = localFont({
  src: [
    { path: './literata/cyrillic-ext-italic-200-900.woff2', weight: '200 900', style: 'italic' },
    { path: './literata/cyrillic-ext-normal-200-900.woff2', weight: '200 900', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F' }],
})

const courierPrimeLatin = localFont({
  src: [
    { path: './courier-prime/latin-normal-400.woff2', weight: '400', style: 'normal' },
    { path: './courier-prime/latin-normal-700.woff2', weight: '700', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  fallback: ['BunPlot Courier Prime Fallback'],
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }],
})
const courierPrimeLatinExt = localFont({
  src: [
    { path: './courier-prime/latin-ext-normal-400.woff2', weight: '400', style: 'normal' },
    { path: './courier-prime/latin-ext-normal-700.woff2', weight: '700', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF' }],
})

const cormorantLatin = localFont({
  src: [
    { path: './cormorant-garamond/latin-italic-500-700.woff2', weight: '500', style: 'italic' },
    { path: './cormorant-garamond/latin-italic-500-700.woff2', weight: '600', style: 'italic' },
    { path: './cormorant-garamond/latin-italic-500-700.woff2', weight: '700', style: 'italic' },
    { path: './cormorant-garamond/latin-normal-500-700.woff2', weight: '500', style: 'normal' },
    { path: './cormorant-garamond/latin-normal-500-700.woff2', weight: '600', style: 'normal' },
    { path: './cormorant-garamond/latin-normal-500-700.woff2', weight: '700', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  fallback: ['BunPlot Cormorant Garamond Fallback'],
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }],
})
const cormorantLatinExt = localFont({
  src: [
    { path: './cormorant-garamond/latin-ext-italic-500-700.woff2', weight: '500', style: 'italic' },
    { path: './cormorant-garamond/latin-ext-italic-500-700.woff2', weight: '600', style: 'italic' },
    { path: './cormorant-garamond/latin-ext-italic-500-700.woff2', weight: '700', style: 'italic' },
    { path: './cormorant-garamond/latin-ext-normal-500-700.woff2', weight: '500', style: 'normal' },
    { path: './cormorant-garamond/latin-ext-normal-500-700.woff2', weight: '600', style: 'normal' },
    { path: './cormorant-garamond/latin-ext-normal-500-700.woff2', weight: '700', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF' }],
})
const cormorantVietnamese = localFont({
  src: [
    { path: './cormorant-garamond/vietnamese-italic-500-700.woff2', weight: '500', style: 'italic' },
    { path: './cormorant-garamond/vietnamese-italic-500-700.woff2', weight: '600', style: 'italic' },
    { path: './cormorant-garamond/vietnamese-italic-500-700.woff2', weight: '700', style: 'italic' },
    { path: './cormorant-garamond/vietnamese-normal-500-700.woff2', weight: '500', style: 'normal' },
    { path: './cormorant-garamond/vietnamese-normal-500-700.woff2', weight: '600', style: 'normal' },
    { path: './cormorant-garamond/vietnamese-normal-500-700.woff2', weight: '700', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB' }],
})
const cormorantCyrillic = localFont({
  src: [
    { path: './cormorant-garamond/cyrillic-italic-500-700.woff2', weight: '500', style: 'italic' },
    { path: './cormorant-garamond/cyrillic-italic-500-700.woff2', weight: '600', style: 'italic' },
    { path: './cormorant-garamond/cyrillic-italic-500-700.woff2', weight: '700', style: 'italic' },
    { path: './cormorant-garamond/cyrillic-normal-500-700.woff2', weight: '500', style: 'normal' },
    { path: './cormorant-garamond/cyrillic-normal-500-700.woff2', weight: '600', style: 'normal' },
    { path: './cormorant-garamond/cyrillic-normal-500-700.woff2', weight: '700', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116' }],
})
const cormorantCyrillicExt = localFont({
  src: [
    { path: './cormorant-garamond/cyrillic-ext-italic-500-700.woff2', weight: '500', style: 'italic' },
    { path: './cormorant-garamond/cyrillic-ext-italic-500-700.woff2', weight: '600', style: 'italic' },
    { path: './cormorant-garamond/cyrillic-ext-italic-500-700.woff2', weight: '700', style: 'italic' },
    { path: './cormorant-garamond/cyrillic-ext-normal-500-700.woff2', weight: '500', style: 'normal' },
    { path: './cormorant-garamond/cyrillic-ext-normal-500-700.woff2', weight: '600', style: 'normal' },
    { path: './cormorant-garamond/cyrillic-ext-normal-500-700.woff2', weight: '700', style: 'normal' },
  ],
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F' }],
})

// A family's subset calls as one font-family list: each call's own family,
// then the latin call's fallback last.
function stack(...fonts: LocalFont[]) {
  const [first, ...rest] = fonts
  const [primary, ...fallback] = first.style.fontFamily.split(', ')
  return [primary, ...rest.map((font) => font.style.fontFamily.split(', ')[0]), ...fallback].join(', ')
}

// Set on <html> (app/layout.tsx), where the themes' --theme-font-* tokens
// read them.
export const FONT_VARIABLES = {
  '--font-figtree': stack(figtreeLatin, figtreeLatinExt),
  '--font-bricolage': stack(bricolageLatin, bricolageLatinExt, bricolageVietnamese),
  '--font-geist-mono': stack(geistMonoLatin, geistMonoLatinExt, geistMonoVietnamese, geistMonoSymbols2, geistMonoCyrillic, geistMonoCyrillicExt),
  '--font-chakra-petch': stack(chakraPetchLatin, chakraPetchLatinExt, chakraPetchVietnamese, chakraPetchThai),
  '--font-jetbrains-mono': stack(jetbrainsMonoLatin, jetbrainsMonoLatinExt, jetbrainsMonoVietnamese, jetbrainsMonoGreek, jetbrainsMonoCyrillic, jetbrainsMonoCyrillicExt),
  '--font-literata': stack(literataLatin, literataLatinExt, literataVietnamese, literataGreek, literataGreekExt, literataCyrillic, literataCyrillicExt),
  '--font-courier-prime': stack(courierPrimeLatin, courierPrimeLatinExt),
  '--font-cormorant': stack(cormorantLatin, cormorantLatinExt, cormorantVietnamese, cormorantCyrillic, cormorantCyrillicExt),
} as React.CSSProperties

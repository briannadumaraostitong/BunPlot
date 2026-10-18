import { Font } from '@react-pdf/renderer'
import { DEFAULT_DOCUMENT_FONT, type DocumentFont } from '../documentFonts'

// Fonts for the PDF exports. The files live in public/fonts/<dir>/ (each with
// its OFL.txt). Browser-safe — no Node imports — because the storyboard PDF
// is built in the browser: the server registers them from disk, the browser
// from /fonts URLs.

// Text uses its font, then Noto Sans for any character that font lacks.
export function pdfFontStack(font: DocumentFont): string[] {
  return [font, 'Noto Sans']
}

// The default, set on each page: text without a chosen font inherits it.
export const PDF_FONT_STACK = pdfFontStack(DEFAULT_DOCUMENT_FONT)

type Face = { file: string; fontWeight: 400 | 700; fontStyle: 'normal' | 'italic' }

function fourFaces(prefix: string): Face[] {
  return [
    { file: `${prefix}-Regular.ttf`, fontWeight: 400, fontStyle: 'normal' },
    { file: `${prefix}-Bold.ttf`, fontWeight: 700, fontStyle: 'normal' },
    { file: `${prefix}-Italic.ttf`, fontWeight: 400, fontStyle: 'italic' },
    { file: `${prefix}-BoldItalic.ttf`, fontWeight: 700, fontStyle: 'italic' },
  ]
}

const FAMILIES: Record<string, { dir: string; faces: Face[] }> = {
  Literata: { dir: 'literata', faces: fourFaces('Literata') },
  'EB Garamond': { dir: 'eb-garamond', faces: fourFaces('EBGaramond') },
  Lora: { dir: 'lora', faces: fourFaces('Lora') },
  Inter: { dir: 'inter', faces: fourFaces('Inter') },
  // Comfortaa has no italic. Its upright files stand in, so italic Comfortaa
  // stays upright, as it does in the editor — react-pdf would otherwise fail
  // to find an italic face at all.
  Comfortaa: {
    dir: 'comfortaa',
    faces: [
      { file: 'Comfortaa-Regular.ttf', fontWeight: 400, fontStyle: 'normal' },
      { file: 'Comfortaa-Bold.ttf', fontWeight: 700, fontStyle: 'normal' },
      { file: 'Comfortaa-Regular.ttf', fontWeight: 400, fontStyle: 'italic' },
      { file: 'Comfortaa-Bold.ttf', fontWeight: 700, fontStyle: 'italic' },
    ],
  },
  'Courier Prime': { dir: 'courier-prime', faces: fourFaces('CourierPrime') },
  'Noto Sans': { dir: 'noto-sans', faces: fourFaces('NotoSans') },
}

let registered = false

// Registers every family with react-pdf, from `fontsDir`: public/fonts as a
// path on disk (server) or as a URL (browser). Only once per process or page,
// since Font.register adds sources rather than replacing them. Files are only
// read when a document uses that face, and a PDF embeds just the characters
// it uses.
export function registerPdfFonts(fontsDir: string) {
  if (registered) return
  registered = true
  for (const [family, { dir, faces }] of Object.entries(FAMILIES)) {
    Font.register({
      family,
      fonts: faces.map(({ file, fontWeight, fontStyle }) => ({
        src: `${fontsDir}/${dir}/${file}`,
        fontWeight,
        fontStyle,
      })),
    })
  }
}

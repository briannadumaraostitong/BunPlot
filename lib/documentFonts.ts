// The fonts outline text can use: the editor's font picker, and the
// manuscript exports. Literata is the default. Text without a font shows in
// it, and picking it removes the font from the text rather than storing it,
// so documents only record the fonts that differ.

export const DOCUMENT_FONTS = [
  { name: 'Literata', fallback: 'ui-serif, Georgia, serif' },
  { name: 'EB Garamond', fallback: 'ui-serif, Georgia, serif' },
  { name: 'Lora', fallback: 'ui-serif, Georgia, serif' },
  { name: 'Inter', fallback: 'ui-sans-serif, system-ui, sans-serif' },
  // No italic face: italic Comfortaa stays upright, in the editor and exports.
  { name: 'Comfortaa', fallback: 'ui-sans-serif, system-ui, sans-serif', noItalic: true },
  { name: 'Courier Prime', fallback: 'ui-monospace, monospace' },
] as const

export type DocumentFont = (typeof DOCUMENT_FONTS)[number]['name']

export const DEFAULT_DOCUMENT_FONT: DocumentFont = 'Literata'

// The listed font a stored or CSS value names, or null for anything else.
// Takes the first family of a CSS list, without quotes, in any letter case,
// so '"EB Garamond", serif' and 'eb garamond' both give 'EB Garamond'.
export function toDocumentFont(value: unknown): DocumentFont | null {
  if (typeof value !== 'string') return null
  const first = value.split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase()
  return DOCUMENT_FONTS.find((f) => f.name.toLowerCase() === first)?.name ?? null
}

// CSS font-family for a listed font, with a system fallback of the same kind.
export function documentFontStack(font: DocumentFont): string {
  const { fallback } = DOCUMENT_FONTS.find((f) => f.name === font)!
  return `"${font}", ${fallback}`
}

export function hasItalic(font: DocumentFont): boolean {
  return !DOCUMENT_FONTS.some((f) => f.name === font && 'noItalic' in f)
}

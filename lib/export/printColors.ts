// Colours for the story bible's swatches, worked out once as plain #RRGGBB so
// the PDF and DOCX print the same ones. The contrast helpers are also used by
// the app's avatars (lib/initialsInk.ts).

// The app's colour for a character, place or event without one.
export const DEFAULT_ACCENT = '#6366F1'

// WCAG AA for normal text: what coloured text is darkened to reach.
const MIN_CONTRAST = 4.5
// What a swatch needs against the white page to show on its own: enough that
// a very pale pick (white, pale yellow) still shows, while every colour in
// the app's palette (the lightest, lime, is about 2:1) is left as it is.
const MIN_SWATCH_CONTRAST = 1.5

export type Rgb = [number, number, number]

const WHITE: Rgb = [255, 255, 255]
const BLACK: Rgb = [0, 0, 0]

// #rgb or #rrggbb, any case; anything else is null.
export function parseHex(value: string): Rgb | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())
  if (!match) return null
  const hex = match[1].length === 3 ? [...match[1]].map((c) => c + c).join('') : match[1]
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb
}

export function toHex(rgb: Rgb): string {
  return '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase()
}

// `amount` of colour over base.
function mix(color: Rgb, base: Rgb, amount: number): Rgb {
  return color.map((c, i) => c * amount + base[i] * (1 - amount)) as Rgb
}

// WCAG relative luminance.
function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// The colour, darkened towards black only as far as it takes to reach ratio
// against background (readable, by default). Checked as the whole numbers
// it's printed as, since rounding can lose the last bit of contrast.
export function readableOn(color: Rgb, background: Rgb, ratio = MIN_CONTRAST): Rgb {
  const bg = background.map(Math.round) as Rgb
  for (let t = 0; t < 1; t += 0.02) {
    const darker = mix(BLACK, color, t).map(Math.round) as Rgb
    if (contrast(darker, bg) >= ratio) return darker
  }
  return BLACK
}

// A stored colour as #RRGGBB, or the app's default when it's missing or not
// a hex colour.
export function accentColor(value: string | null | undefined): string {
  const rgb = value ? parseHex(value) : null
  return rgb ? toHex(rgb) : DEFAULT_ACCENT
}

export interface SwatchColors {
  // The square's fill: the colour as stored (or the app's default).
  fill: string
  // Whether it needs an outline to show on the white page (a very pale
  // colour: white, pale yellow). Every colour in the app's palette is fine.
  outlined: boolean
  // For a format that can't outline it (the DOCX's square is a character):
  // the colour, darkened only as far as it takes to show on its own.
  solid: string
}

// The swatch before a name in the story bible.
export function swatchColors(value: string | null | undefined): SwatchColors {
  const color = parseHex(accentColor(value))!
  return {
    fill: toHex(color),
    outlined: contrast(color, WHITE) < MIN_SWATCH_CONTRAST,
    solid: toHex(readableOn(color, WHITE, MIN_SWATCH_CONTRAST)),
  }
}

// Colours for the story bible's cards and labels, worked out once as plain
// #RRGGBB so the PDF and DOCX print the same ones. Neither can be relied on
// for transparency (DOCX has none), so tints are mixed over white here. The
// contrast helpers are also used by the app's avatars (lib/initialsInk.ts).

// The app's colour for a character, place or event without one.
export const DEFAULT_ACCENT = '#6366F1'

// A card's tint: the colour at the strength the timeline's event cards use
// (`color + '18'`, 0x18 of 0xFF over the page).
const CARD_TINT = 0x18 / 0xff
// A label's background, a little stronger so it reads as a shape on a card.
const LABEL_TINT = 0.16
// WCAG AA for normal text: what coloured text is darkened to reach.
const MIN_CONTRAST = 4.5
// What a card's bar is darkened to reach against the white page: enough
// that a very pale pick (white, pale yellow) still shows, while every
// colour in the app's palette (the lightest, lime, is about 2:1) is left
// as it is.
const MIN_BAR_CONTRAST = 1.5

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

export interface CardColors {
  // The bar down the card's left edge: the colour, unless it's too pale to
  // see on the page (MIN_BAR_CONTRAST).
  accent: string
  // The card's background.
  tint: string
  // The colour, readable as text on the tint (a character's role).
  text: string
}

export function cardColors(value: string | null | undefined): CardColors {
  const color = parseHex(accentColor(value))!
  const tint = mix(color, WHITE, CARD_TINT)
  const accent = readableOn(color, WHITE, MIN_BAR_CONTRAST)
  return { accent: toHex(accent), tint: toHex(tint), text: toHex(readableOn(color, tint)) }
}

export interface SwatchColors {
  // The square's fill: the colour as stored (or the app's default).
  fill: string
  // Whether it needs an outline to show on the white page (a very pale
  // colour: white, pale yellow). Every colour in the app's palette is fine.
  outlined: boolean
}

// The swatch before a name in the story bible.
export function swatchColors(value: string | null | undefined): SwatchColors {
  const color = parseHex(accentColor(value))!
  return { fill: toHex(color), outlined: contrast(color, WHITE) < MIN_BAR_CONTRAST }
}

export interface LabelColors {
  background: string
  text: string
}

// A small coloured label on a card (a status, a layer, a place type).
export interface CardLabel {
  text: string
  color: string | null
}

// A label's colours: a pale tint of the colour, with the colour itself as
// text, darkened until readable.
export function labelColors(value: string | null | undefined): LabelColors {
  const color = parseHex(accentColor(value))!
  const background = mix(color, WHITE, LABEL_TINT)
  return { background: toHex(background), text: toHex(readableOn(color, background)) }
}

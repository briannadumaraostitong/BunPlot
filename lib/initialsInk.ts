import { DEFAULT_ACCENT, contrast, parseHex, readableOn, toHex, type Rgb } from '@/lib/export/printColors'
import { getTheme } from '@/lib/themes'

const WHITE: Rgb = [255, 255, 255]

// The color for a character's initials on its avatar, which is filled with
// the character's color: white where that reaches 4.5:1, else the color
// itself darkened until it does (dark olive on lime, near-black on
// near-white). There's always one: where white fails, even black passes.
// Set as --initials-ink; the themes that use it say so in their stylesheet.
export function initialsInk(color: string | null | undefined): string {
  const rgb = parseHex(color ?? '') ?? parseHex(DEFAULT_ACCENT)!
  if (contrast(WHITE, rgb) >= 4.5) return '#FFFFFF'
  return toHex(readableOn(rgb, rgb))
}

// Manuscript's wax seal (the character panel's portrait) is the character's
// color mixed with ink (color-mix in srgb), under cream initials (--card).
// The share of color, as a percent: 55 (45% ink) where the cream reaches
// 4.5:1 that way, which every default color does, else as much less as it
// takes (yellows, pale limes and near-whites need more ink). Set as
// --seal-share; app/themes/manuscript.css mixes with it.
const SEAL_SHARE = 55
export function sealShare(color: string | null | undefined): number {
  const rgb = parseHex(color ?? '') ?? parseHex(DEFAULT_ACCENT)!
  const { tokens } = getTheme('manuscript')
  const ink = hslToRgb(tokens['--foreground'])
  const cream = hslToRgb(tokens['--card'])
  const round = (c: Rgb) => c.map(Math.round) as Rgb
  for (let share = SEAL_SHARE; share > 0; share--) {
    // Passing both as the browser mixes it (unrounded) and as the screen
    // shows it (whole numbers), so neither loses the last bit of contrast.
    const seal = rgb.map((c, i) => (c * share + ink[i] * (100 - share)) / 100) as Rgb
    if (contrast(cream, seal) >= 4.5 && contrast(round(cream), round(seal)) >= 4.5) return share
  }
  return 0
}

// A token's "h s% l%" as 0–255 RGB, unrounded.
function hslToRgb(token: string): Rgb {
  const [h, s, l] = token.split(/\s+/).map(parseFloat)
  const sat = s / 100
  const light = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sat * Math.min(light, 1 - light)
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
  return [f(0), f(8), f(4)].map((v) => v * 255) as Rgb
}

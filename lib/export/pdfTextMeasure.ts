import { Font } from '@react-pdf/renderer'
import { syllables } from '@react-pdf/hyphenate/en-us'
import { DEFAULT_DOCUMENT_FONT } from '../documentFonts'
import type { InlineRun } from './outlineIR'

// Estimates how many lines a run of text takes at a given width, measured
// with the same font files react-pdf lays it out with (registerPdfFonts must
// have run). react-pdf has no way to measure before layout, so this fills
// lines word by word the way its line breaker can: spaces squeeze, and words
// break at the same syllables (its own hyphenation package, pinned to the
// version react-pdf uses). Its breaker balances lines across the whole
// paragraph rather than filling each one, so expect the odd line of error.

type MeasuredFont = { unitsPerEm: number; layout: (text: string) => { advanceWidth: number } }

// react-pdf's line breaker (@react-pdf/textkit): a space can shrink by a
// third, and a hyphen at a break counts as 5pt whatever the font.
const SPACE_SQUEEZE = 2 / 3
const HYPHEN_WIDTH = 5

async function loadFont(run: InlineRun): Promise<MeasuredFont | null> {
  const source = Font.getFont({
    fontFamily: run.font ?? DEFAULT_DOCUMENT_FONT,
    fontWeight: run.bold ? 700 : 400,
    fontStyle: run.italic ? 'italic' : 'normal',
  })
  await source.load()
  // react-pdf types this as a fontkit Font, but fontkit ships no types (and
  // @types/fontkit isn't installed), so the type is empty here. These are
  // the two members used, which every loaded font has.
  return source.data as unknown as MeasuredFont | null
}

// The runs' width on one line, in points, at `fontSize`.
export async function textWidth(runs: InlineRun[], fontSize: number): Promise<number> {
  let width = 0
  for (const run of runs) {
    const font = await loadFont(run)
    width += font ? (font.layout(run.text).advanceWidth / font.unitsPerEm) * fontSize : run.text.length * fontSize * 0.5
  }
  return width
}

// Lines the runs fill at `width` points and `fontSize`, with the first line
// starting `indent` points in (a line break's next line isn't indented). Text
// with no characters is 0 lines: react-pdf gives an empty paragraph no line
// at all.
export async function countLines(runs: InlineRun[], width: number, fontSize: number, indent = 0): Promise<number> {
  let lines = 0
  let available = width - indent
  // End of the last word on the line, and the squeezed spaces after it.
  let x = 0
  let gap = 0
  const newLine = () => {
    lines++
    available = width
    x = 0
    gap = 0
  }
  for (const run of runs) {
    const font = await loadFont(run)
    const measure = (text: string) =>
      font ? (font.layout(text).advanceWidth / font.unitsPerEm) * fontSize : text.length * fontSize * 0.5
    // Each piece is a word, a space run or a hard break.
    for (const piece of run.text.split(/(\n|[^\S\n]+)/)) {
      if (!piece) continue
      if (lines === 0) lines = 1
      if (piece === '\n') {
        newLine()
        continue
      }
      if (/^\s+$/.test(piece)) {
        if (x > 0) gap += measure(piece) * SPACE_SQUEEZE
        continue
      }
      let word = piece
      while (true) {
        const start = x > 0 ? x + gap : 0
        const w = measure(word)
        if (start + w <= available) {
          x = start + w
          gap = 0
          break
        }
        // Break the word at its last syllable that still fits, with a hyphen.
        const parts = syllables(word)
        let fit = parts.length - 1
        while (fit > 0 && start + measure(parts.slice(0, fit).join('')) + HYPHEN_WIDTH > available) fit--
        if (fit > 0) {
          word = parts.slice(fit).join('')
          newLine()
        } else if (x > 0) {
          newLine()
        } else {
          // Too long for a line, with no break that fits: it overflows.
          x = w
          gap = 0
          break
        }
      }
    }
  }
  return lines
}

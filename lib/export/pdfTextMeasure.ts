import { Font } from '@react-pdf/renderer'
import { DEFAULT_DOCUMENT_FONT } from '../documentFonts'
import type { InlineRun } from './outlineIR'

// Estimates how many lines a run of text takes at a given width, measured
// with the same font files react-pdf lays it out with (registerPdfFonts must
// have run). react-pdf has no way to measure before layout, so this fills
// lines greedily, word by word. Its own line breaker is smarter and
// hyphenates, so expect the result to be off by a line now and then.

type MeasuredFont = { unitsPerEm: number; layout: (text: string) => { advanceWidth: number } }

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

// Lines the runs fill at `width` points and `fontSize`. Text with no
// characters is 0 lines: react-pdf gives an empty paragraph no line at all.
export async function countLines(runs: InlineRun[], width: number, fontSize: number): Promise<number> {
  let lines = 0
  let x = 0
  for (const run of runs) {
    const font = await loadFont(run)
    // Each piece is a word, a space run or a hard break.
    for (const piece of run.text.split(/(\n|[^\S\n]+)/)) {
      if (!piece) continue
      if (piece === '\n') {
        lines = Math.max(lines, 1) + 1
        x = 0
        continue
      }
      const w = font ? (font.layout(piece).advanceWidth / font.unitsPerEm) * fontSize : piece.length * fontSize * 0.5
      if (lines === 0) lines = 1
      if (/^\s+$/.test(piece)) {
        x += w
      } else if (x > 0 && x + w > width) {
        // A word too long for any line wraps across several.
        lines += Math.max(1, Math.ceil(w / width))
        x = w % width
      } else {
        x += w
      }
    }
  }
  return lines
}

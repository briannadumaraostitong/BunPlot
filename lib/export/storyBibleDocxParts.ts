// The story bible DOCX's entries, swatches and labels (storyBibleToDocx), set
// as a printed appendix from printTypography and coloured from printColors,
// as storyBiblePdfParts are in the PDF.

import {
  ImageRun,
  Paragraph,
  TextRun,
  Tab,
  BorderStyle,
  LineRuleType,
  TabStopType,
  type IBorderOptions,
  type IParagraphOptions,
} from 'docx'
import { docxColor, twips } from './outlineToDocx'
import { fetchImageBytes } from './fetchImageBytes'
import { swatchColors } from './printColors'
import { BIBLE_ENTRY, ENTRY_INDENT, FIELD_LABEL, PLACE_ENTRY } from './printTypography'

// The swatch is a black square (■), which Literata doesn't have: set in
// Arial (on Windows and macOS, and Word substitutes elsewhere), at a size
// whose square is about SWATCH.size, raised to sit on the name's capitals.
const SWATCH_FONT = 'Arial'
const SWATCH_RUN_SIZE = 11
const SWATCH_RAISE = 0.5

// The swatch and a tab to the name, which starts ENTRY_INDENT in: the name
// paragraph hangs from there (hangingName), so a long name wraps to line up
// with itself.
export function swatchRuns(color: string | null): TextRun[] {
  return [
    new TextRun({
      text: '■',
      font: SWATCH_FONT,
      size: SWATCH_RUN_SIZE * 2,
      color: docxColor(swatchColors(color).solid),
      position: `${SWATCH_RAISE}pt`,
      bold: false,
    }),
    new TextRun({ children: [new Tab()] }),
  ]
}

// A name paragraph's indent: hanging ENTRY_INDENT, so the swatch sits in the
// margin of the text after it.
export const hangingName = { left: twips(ENTRY_INDENT), hanging: twips(ENTRY_INDENT) }

// What follows a name, indented to line up with it.
export const ENTRY_TEXT_INDENT = { left: twips(ENTRY_INDENT) }

// How much smaller Word draws a small capital than a capital, for the digits
// beside them (which small capitals leave at full size).
const SMALL_CAP_SCALE = 0.8

// Text in small capitals (FIELD_LABEL): Word's small capitals of the text
// lowercased, so every letter is a small capital, and digits set at the small
// capitals' size, so "5 characters" doesn't have a tall 5.
export function smallCapsRuns(text: string): TextRun[] {
  const base = {
    characterSpacing: twips(FIELD_LABEL.tracking),
    color: docxColor(FIELD_LABEL.color),
    bold: false,
  }
  return (text.match(/\d+|\D+/g) ?? []).map((part) =>
    /^\d/.test(part)
      ? new TextRun({ ...base, text: part, size: Math.round(FIELD_LABEL.docxSize * SMALL_CAP_SCALE * 2) })
      : new TextRun({ ...base, text: part.toLowerCase(), smallCaps: true, size: FIELD_LABEL.docxSize * 2 })
  )
}

// A field heading ("NOTES"), indented to the entry's name and kept with the
// paragraph after it.
export function fieldLabel(text: string, indent = true): Paragraph {
  return new Paragraph({
    keepNext: true,
    indent: indent ? ENTRY_TEXT_INDENT : undefined,
    spacing: { before: twips(FIELD_LABEL.before), after: twips(FIELD_LABEL.after) },
    children: smallCapsRuns(text),
  })
}

// The hairline rule above an entry (not the first in its section): an empty
// paragraph a twip tall with the rule as its bottom border, BIBLE_ENTRY.gap
// below the entry before, and kept with the entry after it (which brings its
// own space below the rule). Its own paragraph rather than a border on the
// entry's first one: Word treats neighbouring paragraphs with the same
// borders as one group and draws the rule only above the first, so two
// one-line entries in a row would lose the rule between them.
export function ruleParagraph(): IParagraphOptions {
  const rule: IBorderOptions = {
    style: BorderStyle.SINGLE,
    size: BIBLE_ENTRY.ruleWidth * 8,
    color: docxColor(BIBLE_ENTRY.ruleColor),
    space: 0,
  }
  return {
    keepNext: true,
    spacing: { before: twips(BIBLE_ENTRY.gap), after: 0, line: 1, lineRule: LineRuleType.EXACT },
    border: { bottom: rule },
    children: [new TextRun({ text: '', size: 2 })],
  }
}

// An entry's paragraphs, built from their options so the entry can be kept on
// one page: each kept with the next, and none split. rest: paragraphs already
// built (rich text), which follow and may split.
export function entryParagraphs(options: IParagraphOptions[], keepTogether: boolean, rest: Paragraph[] = []): Paragraph[] {
  return [
    ...options.map(
      (o, i) =>
        new Paragraph({
          ...o,
          keepNext: o.keepNext || (keepTogether && (i < options.length - 1 || rest.length > 0)),
          keepLines: o.keepLines || keepTogether,
        })
    ),
    ...rest,
  ]
}

// A right tab stop at the text's right edge (dates, counts).
export function rightTab(widthTwips: number) {
  return { type: TabStopType.RIGHT, position: widthTwips }
}

// docx sizes images in 96-dpi pixels.
const PX_PER_PT = 96 / 72

// A place's image (prepareImage has already cropped it to 16:9 as PNG or
// JPEG) across the text width, as a paragraph's options, or null when it
// can't be read.
export async function coverOptions(url: string, widthPt: number): Promise<IParagraphOptions | null> {
  const fetched = await fetchImageBytes(url)
  const format = fetched?.info.format
  if (!fetched || (format !== 'png' && format !== 'jpeg')) {
    console.warn('Story bible cover left out (unreadable)')
    return null
  }
  const width = Math.round(widthPt * PX_PER_PT)
  return {
    spacing: { after: twips(PLACE_ENTRY.coverGap) },
    children: [
      new ImageRun({
        type: format === 'png' ? 'png' : 'jpg',
        data: fetched.bytes,
        transformation: { width, height: Math.round(width / PLACE_ENTRY.coverAspect) },
      }),
    ],
  }
}

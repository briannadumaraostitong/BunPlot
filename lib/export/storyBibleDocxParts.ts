// The story bible DOCX's cards and labels (storyBibleToDocx), styled from
// printTypography and coloured from printColors, as storyBiblePdfParts are
// in the PDF. Word has no rounded boxes, so cards are square.

import {
  ImageRun,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  BorderStyle,
  LineRuleType,
  ShadingType,
  TableLayoutType,
  WidthType,
} from 'docx'
import { docxColor, twips } from './outlineToDocx'
import { fetchImageBytes } from './fetchImageBytes'
import { cardColors, labelColors, type CardLabel } from './printColors'
import { CARD, CARD_PADDING_BOTTOM, FIELD_LABEL, LABEL, PLACE_CARD } from './printTypography'

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'auto' }

// A card: a one-cell table, full text width, with the colour's bar down its
// left edge and its tint behind. Followed by a paragraph one card gap tall,
// which both spaces the cards and stops Word joining two cards in a row into
// one table. keepTogether: don't split the card across pages (only for one
// that fits on a page, as in the PDF).
export function card(
  color: string | null,
  children: Paragraph[],
  { textWidthTwips, keepTogether }: { textWidthTwips: number; keepTogether: boolean }
): (Table | Paragraph)[] {
  const { accent, tint } = cardColors(color)
  const table = new Table({
    width: { size: textWidthTwips, type: WidthType.DXA },
    columnWidths: [textWidthTwips],
    layout: TableLayoutType.FIXED,
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: [
      new TableRow({
        cantSplit: keepTogether,
        children: [
          new TableCell({
            width: { size: textWidthTwips, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: docxColor(tint) },
            borders: {
              left: { style: BorderStyle.SINGLE, size: CARD.accentWidth * 8, color: docxColor(accent) },
              top: NO_BORDER,
              bottom: NO_BORDER,
              right: NO_BORDER,
            },
            margins: {
              top: twips(CARD.paddingY),
              bottom: twips(CARD_PADDING_BOTTOM),
              left: twips(CARD.paddingX),
              right: twips(CARD.paddingX),
            },
            children,
          }),
        ],
      }),
    ],
  })
  const gap = new Paragraph({
    spacing: { before: 0, after: 0, line: twips(CARD.gap), lineRule: LineRuleType.EXACT },
    run: { size: 2 },
    children: [],
  })
  return [table, gap]
}

// docx sizes images in 96-dpi pixels.
const PX_PER_PT = 96 / 72

// A place's cover (prepareImage has already cropped it to 16:9 as PNG or
// JPEG) across a card's text width, or null when it can't be read.
export async function coverParagraph(url: string, widthPt: number): Promise<Paragraph | null> {
  const fetched = await fetchImageBytes(url)
  const format = fetched?.info.format
  if (!fetched || (format !== 'png' && format !== 'jpeg')) {
    console.warn('Story bible cover left out (unreadable)')
    return null
  }
  const width = Math.round(widthPt * PX_PER_PT)
  return new Paragraph({
    spacing: { after: twips(PLACE_CARD.coverGap) },
    children: [
      new ImageRun({
        type: format === 'png' ? 'png' : 'jpg',
        data: fetched.bytes,
        transformation: { width, height: Math.round(width / PLACE_CARD.coverAspect) },
      }),
    ],
  })
}

const NBSP = String.fromCharCode(0xa0)

// Labels as runs for a paragraph: each a shaded word (no-break spaces either
// side for padding), a plain space between them.
export function labelRuns(labels: CardLabel[]): TextRun[] {
  return labels.flatMap((label, i) => {
    const { background, text } = labelColors(label.color)
    const run = new TextRun({
      text: `${NBSP}${label.text}${NBSP}`,
      size: LABEL.size * 2,
      color: docxColor(text),
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: docxColor(background) },
    })
    return i === 0 ? [run] : [new TextRun({ text: ' ', size: LABEL.size * 2 }), run]
  })
}

// A card's field heading ("NOTES"), kept with the paragraph after it.
export function fieldLabel(text: string): Paragraph {
  return new Paragraph({
    keepNext: true,
    spacing: { before: twips(FIELD_LABEL.before), after: twips(FIELD_LABEL.after) },
    children: [
      new TextRun({
        text,
        allCaps: true,
        size: FIELD_LABEL.size * 2,
        characterSpacing: twips(FIELD_LABEL.tracking),
        color: docxColor(FIELD_LABEL.color),
      }),
    ],
  })
}

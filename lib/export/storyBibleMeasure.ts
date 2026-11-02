// Estimated heights of story bible cards, so the PDF and DOCX keep the same
// cards together (CARD.keepTogetherShare). Measured with react-pdf's
// registered fonts (pdfTextMeasure; registerPdfFonts must have run), using
// the sizes storyBiblePdfParts and storyBibleToPdf set. Close, not exact:
// Word lays out on its own, and only the share of the page matters.

import { countLines } from './pdfTextMeasure'
import { BIBLE_BODY, CARD, CARD_PADDING_BOTTOM, CHARACTER_CARD, FIELD_LABEL } from './printTypography'
import type { CharacterEntry } from './storyBible'
import type { InlineRun } from './outlineIR'

// The width text has inside a card on a page with this text width.
export function cardTextWidth(textWidth: number): number {
  return textWidth - CARD.accentWidth - 2 * CARD.paddingX
}

// Relationship rows: the name column, and the gap before the relation.
export function relationColumns(cardWidth: number): { name: number; relation: number; gap: number } {
  const gap = 8
  const name = cardWidth * CHARACTER_CARD.rowNameShare
  return { name: name - gap, relation: cardWidth - name, gap }
}

export const FIELD_LABEL_HEIGHT = FIELD_LABEL.before + FIELD_LABEL.size * FIELD_LABEL.lineHeight + FIELD_LABEL.after

const run = (text: string, bold = false): InlineRun[] => [{ text, bold: bold || undefined }]

async function textHeight(text: string, width: number, size: number, lineHeight: number, bold = false) {
  return (await countLines(run(text, bold), width, size)) * size * lineHeight
}

async function paragraphsHeight(paragraphs: string[], width: number) {
  let height = 0
  for (const p of paragraphs) {
    height += (await textHeight(p, width, BIBLE_BODY.fontSize, BIBLE_BODY.lineHeight)) + BIBLE_BODY.paragraphGap
  }
  return height
}

// A character card with details (a slim card is one line, always kept
// together), as storyBibleToPdf lays it out.
export async function characterCardHeight(c: CharacterEntry, pageTextWidth: number): Promise<number> {
  const width = cardTextWidth(pageTextWidth)
  const { nameSize, nameLineHeight, nameGap, roleSize, roleLineHeight, rowSize, rowLineHeight, rowGap } = CHARACTER_CARD
  let height = CARD.paddingY + CARD_PADDING_BOTTOM
  height += (await textHeight(c.name, width, nameSize, nameLineHeight, true)) + (c.role ? nameGap : BIBLE_BODY.paragraphGap)
  if (c.role) height += (await textHeight(c.role, width, roleSize, roleLineHeight)) + BIBLE_BODY.paragraphGap
  height += await paragraphsHeight(c.description, width)
  if (c.notes.length > 0) height += FIELD_LABEL_HEIGHT + (await paragraphsHeight(c.notes, width))
  if (c.relationships.length > 0) {
    const columns = relationColumns(width)
    height += FIELD_LABEL_HEIGHT + BIBLE_BODY.paragraphGap - rowGap
    for (const r of c.relationships) {
      const lines = Math.max(
        await countLines(run(r.name), columns.name, rowSize),
        await countLines(run(r.relation), columns.relation, rowSize)
      )
      height += lines * rowSize * rowLineHeight + rowGap
    }
  }
  return height
}

// Whether a card this tall stays in one piece on a page this tall.
export function keepCardTogether(height: number, pageTextHeight: number): boolean {
  return height <= pageTextHeight * CARD.keepTogetherShare
}

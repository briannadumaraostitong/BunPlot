// Estimated heights of story bible cards, so the PDF and DOCX keep the same
// cards together (CARD.keepTogetherShare). Measured with react-pdf's
// registered fonts (pdfTextMeasure; registerPdfFonts must have run), using
// the sizes storyBiblePdfParts and storyBibleToPdf set. Close, not exact:
// Word lays out on its own, and only the share of the page matters.

import { countLines, textWidth } from './pdfTextMeasure'
import {
  BIBLE_BODY,
  BIBLE_ENTRY,
  CARD,
  CARD_PADDING_BOTTOM,
  CHARACTER_CARD,
  ENTRY_INDENT,
  ENTRY_NAME,
  EVENT_CARD,
  EVENT_ENTRY,
  FIELD_LABEL,
  HEADINGS,
  LABEL,
  PLACE_CARD,
  PLACE_ENTRY,
  RELATIONS,
  SWATCH,
} from './printTypography'
import { eventMeta, eventWithAt, type CharacterEntry, type EventEntry, type PlaceEntry } from './storyBible'
import type { CardLabel } from './printColors'
import type { BlockNode, InlineRun } from './outlineIR'

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

// A row of labels: a pill (storyBiblePdfParts' Labels) and the gap below it.
export const LABEL_ROW_HEIGHT = LABEL.size * 1.2 + 2 * LABEL.paddingY + LABEL.gap

// Literata's own line height, for text that doesn't set one (headings).
const NATURAL_LINE_HEIGHT = 1.485
// outlineToPdf's list marker column, row gap and quote indent.
const LIST_MARKER_WIDTH = 18
const LIST_ROW_GAP = 4
const QUOTE_INDENT = 24

const run = (text: string, bold = false): InlineRun[] => [{ text, bold: bold || undefined }]

async function textHeightOf(runs: InlineRun[], width: number, size: number, lineHeight: number) {
  return (await countLines(runs, width, size)) * size * lineHeight
}

async function textHeight(text: string, width: number, size: number, lineHeight: number, bold = false) {
  return textHeightOf(run(text, bold), width, size, lineHeight)
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

// Rich text's paragraph style: the story bible's body, or a place's smaller
// caption text.
interface BodyStyle {
  fontSize: number
  lineHeight: number
  paragraphGap: number
}

// Rich text as renderBlocks lays it out at body's size, or null when it has
// an image (its height isn't known before it's fetched).
async function blocksHeight(blocks: BlockNode[], width: number, body: BodyStyle = BIBLE_BODY): Promise<number | null> {
  let height = 0
  for (const block of blocks) {
    let h: number | null
    switch (block.type) {
      case 'paragraph':
        h = (await textHeightOf(block.runs, width, body.fontSize, body.lineHeight)) + body.paragraphGap
        break
      case 'heading': {
        // Levels past 3 look like level 3.
        const style = HEADINGS[Math.min(3, Math.max(1, block.level)) as 1 | 2 | 3]
        const runs = block.runs.map((r) => ({ ...r, bold: true }))
        h = style.before + (await textHeightOf(runs, width, style.size, NATURAL_LINE_HEIGHT)) + style.after
        break
      }
      case 'blockquote': {
        const inner = await blocksHeight(block.children, width - QUOTE_INDENT, body)
        h = inner === null ? null : inner + body.paragraphGap
        break
      }
      case 'bulletList':
      case 'orderedList':
        h = 0
        for (const item of block.items) {
          const inner = await blocksHeight(item, width - LIST_MARKER_WIDTH, body)
          if (inner === null) return null
          h += inner + LIST_ROW_GAP
        }
        break
      case 'image':
        return null
    }
    if (h === null) return null
    height += h
  }
  return height
}

// A place card with details (a slim card is one line, always kept
// together), as storyBibleToPdf lays it out. Infinite when its rich text has
// an image, so the card is allowed to split.
export async function placeCardHeight(p: PlaceEntry, pageTextWidth: number): Promise<number> {
  const width = cardTextWidth(pageTextWidth)
  const { nameSize, nameLineHeight } = CHARACTER_CARD
  let height = CARD.paddingY + CARD_PADDING_BOTTOM
  if (p.cover) height += width / PLACE_CARD.coverAspect + PLACE_CARD.coverGap
  height += (await textHeight(p.name, width, nameSize, nameLineHeight, true)) + LABEL.gap
  height += LABEL_ROW_HEIGHT + BIBLE_BODY.paragraphGap - LABEL.gap
  for (const blocks of [p.description, p.notes]) {
    if (blocks.length === 0) continue
    const rich = await blocksHeight(blocks, width)
    if (rich === null) return Infinity
    height += FIELD_LABEL_HEIGHT + rich
  }
  return height
}

// An event's dates column: the dates' width on one line, plus a point so
// rounding can't wrap them (storyBibleToPdf gives the column this width).
export async function datesWidth(dates: string): Promise<number> {
  return (await textWidth(run(dates), EVENT_CARD.datesSize)) + 1
}

// Labels as storyBiblePdfParts' Labels lays them out: pills in rows,
// wrapping when the next one doesn't fit.
async function labelsHeight(labels: CardLabel[], width: number): Promise<number> {
  if (labels.length === 0) return 0
  let rows = 1
  let x = 0
  for (const label of labels) {
    const w = (await textWidth(run(label.text), LABEL.size)) + 2 * LABEL.paddingX + LABEL.gap
    if (x > 0 && x + w > width) {
      rows++
      x = 0
    }
    x += w
  }
  return rows * LABEL_ROW_HEIGHT
}

// An event card, as storyBibleToPdf lays it out.
export async function eventCardHeight(e: EventEntry, pageTextWidth: number): Promise<number> {
  const width = cardTextWidth(pageTextWidth)
  const { titleSize, titleLineHeight, titleGap, datesGap, metaSize, metaLineHeight } = EVENT_CARD
  let height = CARD.paddingY + CARD_PADDING_BOTTOM
  const titleWidth = e.dates ? width - (await datesWidth(e.dates)) - datesGap : width
  height += (await textHeight(e.title, titleWidth, titleSize, titleLineHeight, true)) + titleGap
  if (e.labels.length > 0) height += (await labelsHeight(e.labels, width)) + BIBLE_BODY.paragraphGap - LABEL.gap
  const withAt = eventWithAt(e)
  if (withAt) height += (await textHeight(withAt, width, metaSize, metaLineHeight)) + BIBLE_BODY.paragraphGap
  height += await paragraphsHeight(e.description, width)
  if (e.notes.length > 0) height += FIELD_LABEL_HEIGHT + (await paragraphsHeight(e.notes, width))
  return height
}

// Whether a card this tall stays in one piece on a page this tall.
export function keepCardTogether(height: number, pageTextHeight: number): boolean {
  return height <= pageTextHeight * CARD.keepTogetherShare
}

// The story bible's entries as an appendix (no cards): heights as
// storyBibleToPdf lays them out, at the page's full text width.

// A place's caption text (PLACE_ENTRY), as rich text's paragraph style.
export const PLACE_TEXT: BodyStyle = {
  fontSize: PLACE_ENTRY.textSize,
  lineHeight: PLACE_ENTRY.textLineHeight,
  paragraphGap: BIBLE_BODY.paragraphGap - 1,
}

// Relationship rows' columns at this text width.
export function relationColumnsAt(width: number): { name: number; relation: number; gap: number } {
  const name = width * RELATIONS.nameShare
  return { name: name - RELATIONS.columnGap, relation: width - name, gap: RELATIONS.columnGap }
}

// The name line: the swatch, then the name (the role or type after it in
// small capitals, which only matters when the name nearly fills the line).
async function nameLineHeight(name: string, detail: string | null, width: number) {
  const text = detail ? `${name}   ${detail.toUpperCase()}` : name
  return textHeight(text, width - SWATCH.size - SWATCH.gap, ENTRY_NAME.size, ENTRY_NAME.lineHeight, true)
}

// A character with details (one with none is a single line, always kept
// together). Everything after the name is indented to it.
export async function characterEntryHeight(c: CharacterEntry, width: number): Promise<number> {
  const inner = width - ENTRY_INDENT
  let height = (await nameLineHeight(c.name, c.role, width)) + ENTRY_NAME.gap
  height += await paragraphsHeight(c.description, inner)
  if (c.notes.length > 0) height += FIELD_LABEL_HEIGHT + (await paragraphsHeight(c.notes, inner))
  if (c.relationships.length > 0) {
    const columns = relationColumnsAt(inner)
    height += FIELD_LABEL_HEIGHT
    for (const r of c.relationships) {
      const lines = Math.max(
        await countLines(run(r.name), columns.name, RELATIONS.size),
        await countLines(run(r.relation), columns.relation, RELATIONS.size)
      )
      height += lines * RELATIONS.size * RELATIONS.lineHeight + RELATIONS.rowGap
    }
  }
  return height
}

// A place with details: its image across the full width, then the name, and
// the text indented to the name. Infinite when its rich text has an image,
// so the entry is allowed to split.
export async function placeEntryHeight(p: PlaceEntry, width: number): Promise<number> {
  let height = p.cover ? PLACE_ENTRY.coverSpaceAbove + width / PLACE_ENTRY.coverAspect + PLACE_ENTRY.coverGap : 0
  height += (await nameLineHeight(p.name, p.type, width)) + ENTRY_NAME.gap
  for (const [i, blocks] of [p.description, p.notes].entries()) {
    if (blocks.length === 0) continue
    const rich = await blocksHeight(blocks, width - ENTRY_INDENT, PLACE_TEXT)
    if (rich === null) return Infinity
    // Notes have a label; the description follows the caption directly.
    height += (i === 1 ? FIELD_LABEL_HEIGHT : 0) + rich
  }
  return height
}

// An event's dates column: the dates' width on one line, plus a point so
// rounding can't wrap them.
export async function eventDatesWidth(dates: string): Promise<number> {
  return (await textWidth(run(dates), EVENT_ENTRY.datesSize)) + 1
}

// An event: the title line, the plain line under it, then the description
// and notes, all indented to the title's start.
export async function eventEntryHeight(e: EventEntry, width: number): Promise<number> {
  const inner = width - ENTRY_INDENT
  const titleWidth = e.dates ? inner - (await eventDatesWidth(e.dates)) - EVENT_ENTRY.datesGap : inner
  let height = await textHeight(e.title, titleWidth, EVENT_ENTRY.titleSize, EVENT_ENTRY.titleLineHeight, true)
  const meta = eventMeta(e)
  if (meta) height += EVENT_ENTRY.metaGap + (await textHeight(meta, inner, EVENT_ENTRY.metaSize, EVENT_ENTRY.metaLineHeight))
  height += BIBLE_BODY.paragraphGap
  height += await paragraphsHeight(e.description, inner)
  if (e.notes.length > 0) height += FIELD_LABEL_HEIGHT + (await paragraphsHeight(e.notes, inner))
  return height
}

// Whether an entry this tall stays in one piece on a page this tall.
export function keepEntryTogether(height: number, pageTextHeight: number): boolean {
  return height <= pageTextHeight * BIBLE_ENTRY.keepTogetherShare
}

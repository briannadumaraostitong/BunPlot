// Layout rules the manuscript PDF and DOCX share: page sizes, wrapped image
// sizing, and how the Book style turns documents into chapters and treats
// empty paragraphs and indents. Plain data and functions, no renderer.

import type { ManuscriptPageSize, ManuscriptStyle } from './manuscriptOptions'
import type { BlockNode, InlineRun } from './outlineIR'
import type { OutlineSection } from './outlineToDocx'

// Page sizes in points, with their margins. A4 keeps the margins the
// manuscript PDF has always had; 6×9 in is a trade paperback.
export const MANUSCRIPT_PAGES: Record<ManuscriptPageSize, { width: number; height: number; marginX: number; marginY: number }> = {
  a4: { width: 595.28, height: 841.89, marginX: 64, marginY: 56 },
  '6x9': { width: 432, height: 648, marginX: 54, marginY: 54 },
}

// Book style body text: justified, set a little tighter, no gap between
// paragraphs; a paragraph that follows another paragraph is indented instead.
export const BOOK_BODY = { fontSize: 11, lineHeight: 1.4, indent: 18 }

// Wrapped (left/right) images: the editor caps them at half the text width,
// with 24px (18pt) between image and text.
export const WRAP_GAP_PT = 18
// Narrower than this, text beside an image reads badly (and justified text
// gets gappy), so the image is scaled down to leave this much, but to no less
// than WRAP_MIN_SCALE of its width; past that it goes on its own line.
const WRAP_MIN_COLUMN_PT = 160
const WRAP_MIN_SCALE = 0.6

// A wrapped image's width beside text, in the units given: capped at half
// the text width, then scaled down if needed to leave the text column its
// minimum. Null when that would shrink it too much (own line instead).
export function wrapImageWidth(width: number, textWidth: number, ptPerUnit = 1): number | null {
  const full = Math.min(width, textWidth / 2)
  const fitted = Math.min(full, textWidth - (WRAP_GAP_PT + WRAP_MIN_COLUMN_PT) / ptPerUnit)
  return fitted < full * WRAP_MIN_SCALE ? null : fitted
}

export function plainText(runs: InlineRun[]): string {
  return runs.map((r) => r.text).join('').replace(/\s+/g, ' ').trim()
}

export function isBlank(block: BlockNode | undefined): boolean {
  return block?.type === 'paragraph' && plainText(block.runs) === ''
}

// Book style: an empty paragraph is a scene break (one blank line), except
// the one the editor keeps after every image, and any that follow another
// empty paragraph, so a run of them is a single break.
export function isDroppedBlank(block: BlockNode, prev: BlockNode | undefined): boolean {
  return isBlank(block) && (prev?.type === 'image' || isBlank(prev))
}

// Book style: a paragraph gets a first-line indent when it follows a
// paragraph with text, unless it's centred or right-aligned.
export function hasBookIndent(block: BlockNode, prev: BlockNode | undefined): boolean {
  return (
    block.type === 'paragraph' &&
    block.align !== 'center' &&
    block.align !== 'right' &&
    prev?.type === 'paragraph' &&
    !isBlank(prev)
  )
}

// Book style front matter, from the export action.
export interface BookDetails {
  projectTitle: string
  author: string | null
  // Signed URL of the project's cover, when there is one and it's wanted.
  coverUrl: string | null
}

export interface RenderOutlinesOptions {
  style: ManuscriptStyle
  pageSize: ManuscriptPageSize
  // Required for the Book style.
  book?: BookDetails
}

export interface BookChapter {
  title: InlineRun[]
  blocks: BlockNode[]
}

// A chapter's blocks without empty paragraphs at either end, which would only
// add a blank line under the chapter title or at its close.
function trimBlanks(blocks: BlockNode[]): BlockNode[] {
  let start = 0
  let end = blocks.length
  while (start < end && isBlank(blocks[start])) start++
  while (end > start && isBlank(blocks[end - 1])) end--
  return blocks.slice(start, end)
}

// Book chapters: each selected document starts one, titled with its name, and
// each Heading 1 starts another, titled with the heading. A document that
// opens with a Heading 1 lets the heading title its first chapter instead.
export function bookChapters(sections: OutlineSection[]): BookChapter[] {
  const chapters: BookChapter[] = []
  for (const section of sections) {
    let current: BookChapter = { title: [{ text: section.title }], blocks: [] }
    for (const block of section.blocks) {
      if (block.type === 'heading' && block.level === 1) {
        const blocks = trimBlanks(current.blocks)
        if (blocks.length > 0) chapters.push({ ...current, blocks })
        current = { title: block.runs, blocks: [] }
      } else {
        current.blocks.push(block)
      }
    }
    chapters.push({ ...current, blocks: trimBlanks(current.blocks) })
  }
  return chapters
}

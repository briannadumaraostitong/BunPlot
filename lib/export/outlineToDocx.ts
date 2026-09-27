import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } from 'docx'
import { fetchImageBytes } from './fetchImageBytes'
import type { Align, BlockNode, InlineRun } from './outlineIR'

export interface OutlineSection {
  title: string
  blocks: BlockNode[]
}

const HEADING_LEVEL_MAP: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
}

const ALIGN_MAP: Record<Align, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
}

// docx's ImageRun only accepts these four raster types — no webp. Images in
// an unsupported format are skipped (logged, not thrown) rather than failing
// the whole export.
const DOCX_IMAGE_TYPE: Partial<Record<'png' | 'jpeg' | 'gif' | 'webp', 'jpg' | 'png' | 'gif' | 'bmp'>> = {
  jpeg: 'jpg',
  png: 'png',
  gif: 'gif',
}

const MAX_IMAGE_WIDTH_PX = 500

function textRuns(runs: InlineRun[]): TextRun[] {
  return runs.map(
    (r) =>
      new TextRun({
        text: r.text,
        bold: r.bold,
        italics: r.italic,
        underline: r.underline ? {} : undefined,
        strike: r.strike,
      })
  )
}

interface DocxContext {
  indentLevel: number
  listType?: 'bullet' | 'ordered'
  orderedIndex?: number
}

async function blockToParagraphs(block: BlockNode, ctx: DocxContext): Promise<Paragraph[]> {
  const indent = ctx.indentLevel > 0 ? { left: 360 * ctx.indentLevel } : undefined

  switch (block.type) {
    case 'heading':
      return [
        new Paragraph({
          heading: HEADING_LEVEL_MAP[block.level] ?? HeadingLevel.HEADING_1,
          alignment: block.align ? ALIGN_MAP[block.align] : undefined,
          indent,
          children: textRuns(block.runs),
        }),
      ]

    case 'paragraph':
      return [
        new Paragraph({
          alignment: block.align ? ALIGN_MAP[block.align] : undefined,
          indent,
          bullet: ctx.listType === 'bullet' ? { level: Math.max(0, ctx.indentLevel - 1) } : undefined,
          children:
            ctx.listType === 'ordered'
              ? [new TextRun({ text: `${ctx.orderedIndex}. ` }), ...textRuns(block.runs)]
              : textRuns(block.runs),
        }),
      ]

    case 'blockquote': {
      const out: Paragraph[] = []
      for (const child of block.children) {
        out.push(...(await blockToParagraphs(child, { indentLevel: ctx.indentLevel + 1 })))
      }
      return out
    }

    case 'bulletList': {
      const out: Paragraph[] = []
      for (const item of block.items) {
        for (const child of item) {
          out.push(
            ...(await blockToParagraphs(child, { indentLevel: ctx.indentLevel + 1, listType: 'bullet' }))
          )
        }
      }
      return out
    }

    case 'orderedList': {
      const out: Paragraph[] = []
      for (let i = 0; i < block.items.length; i++) {
        for (const child of block.items[i]) {
          out.push(
            ...(await blockToParagraphs(child, {
              indentLevel: ctx.indentLevel + 1,
              listType: 'ordered',
              orderedIndex: i + 1,
            }))
          )
        }
      }
      return out
    }

    case 'image': {
      const fetched = await fetchImageBytes(block.src)
      if (!fetched || !fetched.info.format || !fetched.info.width || !fetched.info.height) {
        console.warn('Skipping export image (unreadable):', block.src)
        return []
      }
      const docxType = DOCX_IMAGE_TYPE[fetched.info.format]
      if (!docxType) {
        console.warn(`Skipping export image (unsupported format "${fetched.info.format}" for DOCX):`, block.src)
        return []
      }
      const width = Math.min(MAX_IMAGE_WIDTH_PX, block.width ?? MAX_IMAGE_WIDTH_PX)
      const height = Math.round(width * (fetched.info.height / fetched.info.width))
      return [
        new Paragraph({
          alignment: block.align ? ALIGN_MAP[block.align] : AlignmentType.CENTER,
          children: [
            new ImageRun({
              type: docxType,
              data: fetched.bytes,
              transformation: { width, height },
            }),
          ],
        }),
      ]
    }
  }
}

async function blocksToParagraphs(blocks: BlockNode[]): Promise<Paragraph[]> {
  const out: Paragraph[] = []
  for (const block of blocks) {
    out.push(...(await blockToParagraphs(block, { indentLevel: 0 })))
  }
  return out
}

export async function renderOutlinesToDocx(sections: OutlineSection[]): Promise<Buffer> {
  const children: Paragraph[] = []

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]
    children.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        pageBreakBefore: i > 0,
        children: [new TextRun({ text: section.title })],
      })
    )
    children.push(...(await blocksToParagraphs(section.blocks)))
  }

  const doc = new Document({
    sections: [{ children }],
  })

  return Packer.toBuffer(doc)
}

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ImageRun,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom,
  TextWrappingType,
  TextWrappingSide,
} from 'docx'
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

// Text width of docx's default page (A4, 1" margins): 11906 − 2×1440 twips,
// in the 96-dpi px ImageRun sizes use. Every image (wrapped or in line) keeps
// the width set in the editor, clamped to it.
const TEXT_WIDTH_PX = Math.floor(((11906 - 2 * 1440) / 1440) * 96)
const EMU_PER_PX = 9525
// Gap between a wrapped image and the text beside/below it — the editor's
// mr-6/ml-6 (24px) and mb-4 (16px).
const WRAP_GAP_SIDE = 24 * EMU_PER_PX
const WRAP_GAP_BOTTOM = 16 * EMU_PER_PX

type ImageBlock = Extract<BlockNode, { type: 'image' }>

// Left/right = wrap, matching the editor (ResizableImage).
function isWrappedImage(block: BlockNode): block is ImageBlock {
  return block.type === 'image' && (block.align === 'left' || block.align === 'right')
}

// Fetches an image and checks DOCX can embed it; logs and returns null if not.
async function fetchDocxImage(src: string) {
  const fetched = await fetchImageBytes(src)
  if (!fetched || !fetched.info.format || !fetched.info.width || !fetched.info.height) {
    console.warn('Skipping export image (unreadable):', src)
    return null
  }
  const type = DOCX_IMAGE_TYPE[fetched.info.format]
  if (!type) {
    console.warn(`Skipping export image (unsupported format "${fetched.info.format}" for DOCX):`, src)
    return null
  }
  return { type, data: fetched.bytes, width: fetched.info.width, height: fetched.info.height }
}

// A floating image with square wrapping on the side away from it, anchored
// to the paragraph it's placed in. Its own width (or natural width if never
// resized), clamped to the text width.
async function wrappedImageRun(block: ImageBlock): Promise<ImageRun | null> {
  const image = await fetchDocxImage(block.src)
  if (!image) return null
  const width = Math.min(TEXT_WIDTH_PX, block.width ?? image.width)
  const height = Math.round(width * (image.height / image.width))
  const left = block.align === 'left'
  return new ImageRun({
    type: image.type,
    data: image.data,
    transformation: { width, height },
    floating: {
      horizontalPosition: {
        relative: HorizontalPositionRelativeFrom.COLUMN,
        align: left ? HorizontalPositionAlign.LEFT : HorizontalPositionAlign.RIGHT,
      },
      verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: 0 },
      wrap: { type: TextWrappingType.SQUARE, side: left ? TextWrappingSide.RIGHT : TextWrappingSide.LEFT },
      margins: left
        ? { right: WRAP_GAP_SIDE, bottom: WRAP_GAP_BOTTOM }
        : { left: WRAP_GAP_SIDE, bottom: WRAP_GAP_BOTTOM },
    },
  })
}

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
  // A floating image anchored into this paragraph (see blocksToParagraphs).
  leadingImage?: ImageRun
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
              : [...(ctx.leadingImage ? [ctx.leadingImage] : []), ...textRuns(block.runs)],
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
      const image = await fetchDocxImage(block.src)
      if (!image) return []
      const width = Math.min(TEXT_WIDTH_PX, block.width ?? image.width)
      const height = Math.round(width * (image.height / image.width))
      return [
        new Paragraph({
          alignment: block.align ? ALIGN_MAP[block.align] : AlignmentType.CENTER,
          children: [
            new ImageRun({
              type: image.type,
              data: image.data,
              transformation: { width, height },
            }),
          ],
        }),
      ]
    }
  }
}

// Top level only — images nested in lists or quotes go through
// blockToParagraphs and stay in line, matching the editor. A wrapped image is
// anchored into the next paragraph when there is one (so no blank anchor line
// sits above the wrapped text), otherwise into its own empty paragraph.
export async function blocksToParagraphs(blocks: BlockNode[]): Promise<Paragraph[]> {
  const out: Paragraph[] = []
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    if (isWrappedImage(block)) {
      const run = await wrappedImageRun(block)
      if (!run) continue
      const next = blocks[i + 1]
      if (next?.type === 'paragraph') {
        out.push(...(await blockToParagraphs(next, { indentLevel: 0, leadingImage: run })))
        i++
      } else {
        out.push(new Paragraph({ children: [run] }))
      }
      continue
    }
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

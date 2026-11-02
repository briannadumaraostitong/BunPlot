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
  Header,
  Footer,
  PageNumber,
  LineRuleType,
  type ISectionOptions,
  type IStylesOptions,
} from 'docx'
import { fetchImageBytes } from './fetchImageBytes'
import { DEFAULT_DOCUMENT_FONT, hasItalic } from '../documentFonts'
import { DEFAULT_MANUSCRIPT_OPTIONS, type ManuscriptPageSize, type ManuscriptStyle } from './manuscriptOptions'
import {
  BOOK_BODY,
  MANUSCRIPT_PAGES,
  bookChapters,
  hasBookIndent,
  isBlank,
  isDroppedBlank,
  plainText,
  wrapImageWidth,
  type BookDetails,
  type RenderOutlinesOptions,
} from './manuscriptLayout'
import { HEADINGS, PAGE_NUMBER, RUNNING_HEADER, TITLE_PAGE, marginLineOffset } from './printTypography'
import type { Align, BlockNode, InlineRun } from './outlineIR'

// Document styles for the Standard manuscript DOCX: Literata for everything
// without a chosen font, titles and headings included (docx's heading styles
// set only size and colour).
const DOCX_STYLES = { default: { document: { run: { font: DEFAULT_DOCUMENT_FONT } } } }

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

const TWIPS_PER_PT = 20
export const twips = (pt: number) => Math.round(pt * TWIPS_PER_PT)
// docx takes colours without the '#'.
export const docxColor = (hex: string) => hex.slice(1)
const PT_PER_PX = 0.75
const EMU_PER_PX = 9525
// Gap between a wrapped image and the text beside/below it — the editor's
// mr-6/ml-6 (24px) and mb-4 (16px).
const WRAP_GAP_SIDE = 24 * EMU_PER_PX
const WRAP_GAP_BOTTOM = 16 * EMU_PER_PX

// A page's size and margins in twips, its text width in twips (tables) and
// in the 96-dpi px ImageRun sizes use, and its text height in points. Every
// image (wrapped or in line) keeps the width set in the editor, clamped to the
// text width.
export interface DocxPage {
  size: { width: number; height: number }
  margin: { top: number; right: number; bottom: number; left: number }
  textWidthTwips: number
  textWidthPx: number
  textHeightPt: number
}

function docxPage(width: number, height: number, marginX: number, marginY: number): DocxPage {
  return {
    size: { width: twips(width), height: twips(height) },
    margin: { top: twips(marginY), right: twips(marginX), bottom: twips(marginY), left: twips(marginX) },
    textWidthTwips: twips(width) - 2 * twips(marginX),
    textWidthPx: Math.floor(((twips(width) - 2 * twips(marginX)) / 1440) * 96),
    textHeightPt: height - 2 * marginY,
  }
}

// The PDF's page at this size (MANUSCRIPT_PAGES), as in the Book style and
// the story bible.
export function printPage(pageSize: ManuscriptPageSize): DocxPage {
  const page = MANUSCRIPT_PAGES[pageSize]
  return docxPage(page.width, page.height, page.marginX, page.marginY)
}

// Standard A4 keeps docx's default page (1" margins), as the DOCX has always
// had; everything else uses the PDF's pages.
function pageFor(style: ManuscriptStyle, pageSize: ManuscriptPageSize): DocxPage {
  if (style === 'standard' && pageSize === 'a4') {
    const page = MANUSCRIPT_PAGES.a4
    return docxPage(page.width, page.height, 72, 72)
  }
  return printPage(pageSize)
}

// Where the blocks are laid out: the page's text width (px), and whether the
// Book style's body text applies.
export interface DocxLayout {
  textWidth: number
  book: boolean
}

// The story bible (and anything else not choosing) lays out Standard A4.
const DEFAULT_LAYOUT: DocxLayout = { textWidth: pageFor('standard', 'a4').textWidthPx, book: false }

// Book body text: lines at least BOOK_BODY's height, so tall glyphs and
// substituted fonts aren't clipped (Literata's own line, 1.485, is taller, so
// Word sets it at that), and the first-line indent.
const BOOK_SPACING = {
  line: Math.round(BOOK_BODY.fontSize * BOOK_BODY.lineHeight * TWIPS_PER_PT),
  lineRule: LineRuleType.AT_LEAST,
}
const BOOK_INDENT = BOOK_BODY.indent * TWIPS_PER_PT

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
// resized), clamped to the text width; the Book style then sizes it as the
// PDF does (wrapImageWidth), and gives 'ownLine' when that leaves too little
// room for text beside it.
async function wrappedImageRun(block: ImageBlock, layout: DocxLayout): Promise<ImageRun | 'ownLine' | null> {
  const image = await fetchDocxImage(block.src)
  if (!image) return null
  const clamped = Math.min(layout.textWidth, block.width ?? image.width)
  const fitted = layout.book ? wrapImageWidth(clamped, layout.textWidth, PT_PER_PX) : clamped
  if (fitted === null) return 'ownLine'
  const width = Math.round(fitted)
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

// A run's chosen font is named, not embedded: Word substitutes one that isn't
// installed (Google Docs has all of them). Runs without one use the
// document's default (renderOutlinesToDocx). A font with no italic
// (Comfortaa) drops the flag, so Word doesn't slant it — italic Comfortaa
// stays upright, as in the editor and PDF.
function textRuns(runs: InlineRun[]): TextRun[] {
  return runs.map(
    (r) =>
      new TextRun({
        text: r.text,
        font: r.font,
        bold: r.bold,
        italics: r.italic && (!r.font || hasItalic(r.font)) ? true : undefined,
        underline: r.underline ? {} : undefined,
        strike: r.strike,
      })
  )
}

interface DocxContext {
  layout: DocxLayout
  indentLevel: number
  listType?: 'bullet' | 'ordered'
  orderedIndex?: number
  // A floating image anchored into this paragraph (see blocksToParagraphs).
  leadingImage?: ImageRun
  // The block before this one, for the Book style's indents.
  prev?: BlockNode
}

// Blocks nested in a quote or list item, each knowing the one before it. The
// Book style leaves out the empty paragraphs it drops (isDroppedBlank).
async function nestedParagraphs(blocks: BlockNode[], ctx: Omit<DocxContext, 'prev'>): Promise<Paragraph[]> {
  const out: Paragraph[] = []
  for (let i = 0; i < blocks.length; i++) {
    const prev = blocks[i - 1]
    if (ctx.layout.book && isDroppedBlank(blocks[i], prev)) continue
    out.push(...(await blockToParagraphs(blocks[i], { ...ctx, prev })))
  }
  return out
}

// Book style paragraphs are justified unless centred or right-aligned (those
// keep their alignment).
function paragraphAlignment(block: Extract<BlockNode, { type: 'paragraph' }>, book: boolean) {
  if (book && block.align !== 'center' && block.align !== 'right') return AlignmentType.JUSTIFIED
  return block.align ? ALIGN_MAP[block.align] : undefined
}

async function blockToParagraphs(block: BlockNode, ctx: DocxContext): Promise<Paragraph[]> {
  const { layout } = ctx
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

    case 'paragraph': {
      // Book style: no gap between paragraphs (an empty one is a blank line,
      // without an indent), and an indent from hasBookIndent.
      const firstLine = layout.book && !isBlank(block) && hasBookIndent(block, ctx.prev) ? BOOK_INDENT : undefined
      return [
        new Paragraph({
          alignment: paragraphAlignment(block, layout.book),
          indent: firstLine ? { ...indent, firstLine } : indent,
          spacing: layout.book ? BOOK_SPACING : undefined,
          bullet: ctx.listType === 'bullet' ? { level: Math.max(0, ctx.indentLevel - 1) } : undefined,
          children:
            ctx.listType === 'ordered'
              ? [new TextRun({ text: `${ctx.orderedIndex}. ` }), ...textRuns(block.runs)]
              : [...(ctx.leadingImage ? [ctx.leadingImage] : []), ...textRuns(block.runs)],
        }),
      ]
    }

    case 'blockquote':
      return nestedParagraphs(block.children, { layout, indentLevel: ctx.indentLevel + 1 })

    case 'bulletList': {
      const out: Paragraph[] = []
      for (const item of block.items) {
        out.push(...(await nestedParagraphs(item, { layout, indentLevel: ctx.indentLevel + 1, listType: 'bullet' })))
      }
      return out
    }

    case 'orderedList': {
      const out: Paragraph[] = []
      for (let i = 0; i < block.items.length; i++) {
        out.push(
          ...(await nestedParagraphs(block.items[i], {
            layout,
            indentLevel: ctx.indentLevel + 1,
            listType: 'ordered',
            orderedIndex: i + 1,
          }))
        )
      }
      return out
    }

    case 'image': {
      const image = await fetchDocxImage(block.src)
      if (!image) return []
      const width = Math.min(layout.textWidth, block.width ?? image.width)
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
// sits above the wrapped text), otherwise into its own empty paragraph. In
// the Book style that's the next paragraph drawn, past any empty ones it
// drops (isDroppedBlank).
// layout: the page's text width and style; Standard A4 unless given.
export async function blocksToParagraphs(blocks: BlockNode[], layout: DocxLayout = DEFAULT_LAYOUT): Promise<Paragraph[]> {
  const out: Paragraph[] = []
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const prev = blocks[i - 1]
    if (layout.book && isDroppedBlank(block, prev)) continue
    if (isWrappedImage(block)) {
      const run = await wrappedImageRun(block, layout)
      if (!run) continue
      if (run === 'ownLine') {
        out.push(...(await blockToParagraphs(block, { layout, indentLevel: 0 })))
        continue
      }
      let j = i + 1
      while (layout.book && j < blocks.length && isDroppedBlank(blocks[j], blocks[j - 1])) j++
      const next = blocks[j]
      if (next?.type === 'paragraph') {
        out.push(...(await blockToParagraphs(next, { layout, indentLevel: 0, leadingImage: run, prev: blocks[j - 1] })))
        i = j
      } else {
        out.push(new Paragraph({ children: [run] }))
      }
      continue
    }
    out.push(...(await blockToParagraphs(block, { layout, indentLevel: 0, prev })))
  }
  return out
}

// Heading 2–6 set as in the PDF (HEADINGS), in black rather than docx's blue.
// The Book style and story bible each add their own Heading 1.
export function printHeadingStyles() {
  const heading = ({ size, before, after }: (typeof HEADINGS)[keyof typeof HEADINGS]) => ({
    run: { size: size * 2, bold: true, color: '000000' },
    paragraph: { spacing: { before: twips(before), after: twips(after) }, keepNext: true },
  })
  return {
    heading2: heading(HEADINGS[2]),
    heading3: heading(HEADINGS[3]),
    heading4: heading(HEADINGS[3]),
    heading5: heading(HEADINGS[3]),
    heading6: heading(HEADINGS[3]),
  }
}

// Book style: Literata 11pt, chapter titles (Heading 1) large and centred a
// quarter of the way down the page, and the shared headings.
function bookStyles(page: DocxPage): IStylesOptions {
  return {
    default: {
      document: { run: { font: DEFAULT_DOCUMENT_FONT, size: BOOK_BODY.fontSize * 2 } },
      heading1: {
        run: { size: 48, color: '000000' },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { before: twips(page.textHeightPt * 0.25), after: twips(36) } },
      },
      ...printHeadingStyles(),
    },
  }
}

// A title page's paragraphs: the title centred TITLE_PAGE.top of the way down
// the text area, then the subtitle and byline when there are any.
export function titlePageParagraphs(
  title: string,
  subtitle: string | null,
  textHeightPt: number,
  byline: string | null = null
): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: twips(textHeightPt * TITLE_PAGE.top) },
      children: [new TextRun({ text: title, size: TITLE_PAGE.titleSize * 2 })],
    }),
    ...(subtitle
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: twips(TITLE_PAGE.subtitleGap) },
            children: [
              new TextRun({ text: subtitle, size: TITLE_PAGE.subtitleSize * 2, color: docxColor(TITLE_PAGE.subtitleColor) }),
            ],
          }),
        ]
      : []),
    ...(byline
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: twips(TITLE_PAGE.bylineGap) },
            children: [new TextRun({ text: byline, size: TITLE_PAGE.bylineSize * 2, color: docxColor(TITLE_PAGE.bylineColor) })],
          }),
        ]
      : []),
  ]
}

// The header and footer distance (twips) that centres a running header or
// page number in a margin marginY (pt) tall, as in the PDF.
export function marginLineTwips(marginY: number): number {
  return twips(marginLineOffset(marginY))
}

// A centred header or footer line; empty for a page that shows none (Word
// wants a paragraph in every header and footer).
function marginLine(children: TextRun[], size: number, color: string) {
  return new Paragraph({ alignment: AlignmentType.CENTER, run: { size, color }, children })
}

// A running header with this text, or an empty one.
export function runningHeader(text: string | null): Header {
  const size = RUNNING_HEADER.size * 2
  const color = docxColor(RUNNING_HEADER.color)
  return new Header({ children: [marginLine(text ? [new TextRun({ text, size, color })] : [], size, color)] })
}

// A footer with the page number, or an empty one.
export function pageNumberFooter(numbered: boolean): Footer {
  const size = PAGE_NUMBER.size * 2
  const color = docxColor(PAGE_NUMBER.color)
  return new Footer({
    children: [marginLine(numbered ? [new TextRun({ children: [PageNumber.CURRENT], size, color })] : [], size, color)],
  })
}

// The cover fills its page, cropped like the PDF's (objectFit cover): a
// floating image behind the text, scaled to cover the page and centred, so
// any overflow falls off the page's edges.
async function coverParagraph(src: string, page: DocxPage): Promise<Paragraph | null> {
  const image = await fetchDocxImage(src)
  if (!image) return null
  const pageWidth = (page.size.width / 1440) * 96
  const pageHeight = (page.size.height / 1440) * 96
  const scale = Math.max(pageWidth / image.width, pageHeight / image.height)
  const width = Math.ceil(image.width * scale)
  const height = Math.ceil(image.height * scale)
  return new Paragraph({
    children: [
      new ImageRun({
        type: image.type,
        data: image.data,
        transformation: { width, height },
        floating: {
          horizontalPosition: {
            relative: HorizontalPositionRelativeFrom.PAGE,
            offset: Math.round(((pageWidth - width) / 2) * EMU_PER_PX),
          },
          verticalPosition: {
            relative: VerticalPositionRelativeFrom.PAGE,
            offset: Math.round(((pageHeight - height) / 2) * EMU_PER_PX),
          },
          behindDocument: true,
          allowOverlap: true,
        },
      }),
    ],
  })
}

async function renderBookDocx(sections: OutlineSection[], pageSize: ManuscriptPageSize, details: BookDetails) {
  const page = pageFor('book', pageSize)
  const layout: DocxLayout = { textWidth: page.textWidthPx, book: true }
  // Header and page number sit centred in the top and bottom margins, as in
  // the PDF.
  const edge = marginLineTwips(MANUSCRIPT_PAGES[pageSize].marginY)
  const pageProps = { size: page.size, margin: { ...page.margin, header: edge, footer: edge } }
  const docSections: ISectionOptions[] = []

  const cover = details.coverUrl ? await coverParagraph(details.coverUrl, page) : null
  if (cover) {
    docSections.push({
      properties: { page: { size: page.size, margin: { top: 0, right: 0, bottom: 0, left: 0, header: 0, footer: 0 } } },
      children: [cover],
    })
  }

  docSections.push({
    properties: { page: pageProps },
    children: titlePageParagraphs(details.projectTitle, details.author, page.textHeightPt),
  })

  // Each chapter is a section whose first page (the opening) has no header or
  // number; elsewhere the book's title heads even pages and the chapter's odd
  // ones. Numbers start at 1 on the first chapter and run on from there.
  const chapters = bookChapters(sections)
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i]
    docSections.push({
      properties: { titlePage: true, page: { ...pageProps, ...(i === 0 ? { pageNumbers: { start: 1 } } : {}) } },
      headers: {
        default: runningHeader(plainText(chapter.title)),
        even: runningHeader(details.projectTitle),
        first: runningHeader(null),
      },
      footers: { default: pageNumberFooter(true), even: pageNumberFooter(true), first: pageNumberFooter(false) },
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: textRuns(chapter.title) }),
        ...(await blocksToParagraphs(chapter.blocks, layout)),
      ],
    })
  }

  const doc = new Document({
    title: details.projectTitle,
    creator: details.author ?? undefined,
    styles: bookStyles(page),
    evenAndOddHeaderAndFooters: true,
    sections: docSections,
  })
  return Packer.toBuffer(doc)
}

export async function renderOutlinesToDocx(
  sections: OutlineSection[],
  { style, pageSize, book: details }: RenderOutlinesOptions = DEFAULT_MANUSCRIPT_OPTIONS
): Promise<Buffer> {
  if (style === 'book' && details) return renderBookDocx(sections, pageSize, details)

  const page = pageFor('standard', pageSize)
  const layout: DocxLayout = { textWidth: page.textWidthPx, book: false }
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
    children.push(...(await blocksToParagraphs(section.blocks, layout)))
  }

  const doc = new Document({
    styles: DOCX_STYLES,
    sections: [{ properties: { page: { size: page.size, margin: page.margin } }, children }],
  })

  return Packer.toBuffer(doc)
}

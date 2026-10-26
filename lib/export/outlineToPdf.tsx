import path from 'path'
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { fetchImageBytes } from './fetchImageBytes'
import { PDF_FONT_STACK, pdfFontStack, registerPdfFonts } from './pdfFonts'
import { countLines } from './pdfTextMeasure'
import { DEFAULT_MANUSCRIPT_OPTIONS, type ManuscriptPageSize, type ManuscriptStyle } from './manuscriptOptions'
import {
  BOOK_BODY,
  MANUSCRIPT_PAGES,
  WRAP_GAP_PT,
  bookChapters,
  hasBookIndent,
  isDroppedBlank,
  plainText,
  wrapImageWidth,
  type BookDetails,
  type RenderOutlinesOptions,
} from './manuscriptLayout'
import { HEADINGS, PAGE_NUMBER, RUNNING_HEADER, TITLE_PAGE, marginLineOffset } from './printTypography'
import type { Align, BlockNode, InlineRun } from './outlineIR'
import type { OutlineSection } from './outlineToDocx'

// public/fonts on disk; next.config traces it into the project page's server
// function, where the export actions run.
export const SERVER_FONTS_DIR = path.join(process.cwd(), 'public', 'fonts')

export const styles = StyleSheet.create({
  // Every Text on the page inherits the font stack.
  page: { paddingTop: 56, paddingBottom: 56, paddingHorizontal: 64, fontSize: 11, fontFamily: PDF_FONT_STACK },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 20 },
  heading1: { fontSize: HEADINGS[1].size, fontWeight: 700, marginTop: HEADINGS[1].before, marginBottom: HEADINGS[1].after },
  heading2: { fontSize: HEADINGS[2].size, fontWeight: 700, marginTop: HEADINGS[2].before, marginBottom: HEADINGS[2].after },
  heading3: { fontSize: HEADINGS[3].size, fontWeight: 700, marginTop: HEADINGS[3].before, marginBottom: HEADINGS[3].after },
  // fontSize repeats the page's 11: react-pdf turns a unitless lineHeight into
  // points using the style's own fontSize (18 if unset) before the page's is
  // inherited, so without it 1.5 means 27pt rather than 16.5pt.
  paragraph: { fontSize: 11, marginBottom: 8, lineHeight: 1.5 },
  blockquote: { marginLeft: 24, marginBottom: 8, fontSize: 11, lineHeight: 1.5, color: '#555555' },
  listRow: { flexDirection: 'row', marginBottom: 4 },
  listMarker: { width: 18 },
  listContent: { flex: 1 },
  image: { marginVertical: 8 },
  // A wrapped image and the text beside it (see renderWrappedImage).
  wrapRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  wrapColumn: { flex: 1 },
})

const book = StyleSheet.create({
  paragraph: { fontSize: BOOK_BODY.fontSize, lineHeight: BOOK_BODY.lineHeight, textAlign: 'justify' },
  // An empty paragraph keeps one blank line (a scene break).
  blankLine: { height: BOOK_BODY.fontSize * BOOK_BODY.lineHeight },
  chapterTitle: { fontSize: 24, textAlign: 'center', marginBottom: 36 },
})

// The title page and page furniture the Book style and story bible share
// (printTypography).
export const printStyles = StyleSheet.create({
  title: { fontSize: TITLE_PAGE.titleSize, textAlign: 'center' },
  subtitle: { fontSize: TITLE_PAGE.subtitleSize, textAlign: 'center', marginTop: TITLE_PAGE.subtitleGap, color: TITLE_PAGE.subtitleColor },
  runningHeader: { position: 'absolute', left: 0, right: 0, fontSize: RUNNING_HEADER.size, color: RUNNING_HEADER.color, textAlign: 'center' },
  pageNumber: { position: 'absolute', left: 0, right: 0, fontSize: PAGE_NUMBER.size, color: PAGE_NUMBER.color, textAlign: 'center' },
})

// A title page's content: the title centred TITLE_PAGE.top of the way down
// the text area, and the line below it when there is one.
export function TitlePageContent({ title, subtitle, textHeight }: { title: string; subtitle: string | null; textHeight: number }) {
  return (
    <View style={{ marginTop: textHeight * TITLE_PAGE.top }}>
      <Text style={printStyles.title}>{title}</Text>
      {subtitle && <Text style={printStyles.subtitle}>{subtitle}</Text>}
    </View>
  )
}

const ALIGN_STYLE: Record<Align, 'left' | 'center' | 'right' | 'justify'> = {
  left: 'left',
  center: 'center',
  right: 'right',
  justify: 'justify',
}

// react-pdf's Image only accepts png/jpg — no gif, no webp. Unsupported
// images are skipped (logged, not thrown) rather than failing the export.
const PDF_IMAGE_FORMAT: Partial<Record<'png' | 'jpeg' | 'gif' | 'webp', 'png' | 'jpg'>> = {
  png: 'png',
  jpeg: 'jpg',
}

// MANUSCRIPT_PAGES with react-pdf's page size for each.
const PAGE_SIZES: Record<ManuscriptPageSize, (typeof MANUSCRIPT_PAGES)[ManuscriptPageSize] & { size: 'A4' | [number, number] }> = {
  a4: { size: 'A4', ...MANUSCRIPT_PAGES.a4 },
  '6x9': { size: [432, 648], ...MANUSCRIPT_PAGES['6x9'] },
}

// Where the blocks are laid out: the text area of the page, and whether the
// Book style's body text applies.
export interface PdfLayout {
  textWidth: number
  textHeight: number
  book: boolean
}

function layoutFor(style: ManuscriptStyle, pageSize: ManuscriptPageSize): PdfLayout {
  const page = PAGE_SIZES[pageSize]
  return { textWidth: page.width - 2 * page.marginX, textHeight: page.height - 2 * page.marginY, book: style === 'book' }
}

// The story bible (and anything else not choosing) lays out Standard A4.
const DEFAULT_LAYOUT = layoutFor('standard', 'a4')

// Every image renders at its own width (or natural width if never resized),
// clamped to the text width. react-pdf can't wrap text around an image, so
// left/right ("wrap") images get the text after them beside them instead, at
// the document's top level (renderWrappedImage), and otherwise sit on their
// own line. The editor's width is CSS px, so convert to pt.
const PT_PER_PX = 0.75

// Wrapped (left/right) images: 16px (12pt) below them, as in the editor
// (the side gap and width are wrapImageWidth's).
const WRAP_BOTTOM_GAP_PT = 12
// An image and its side text move to the next page together if they don't
// fit, so a group taller than this share of the text height would leave too
// large a gap; the image goes on its own line instead.
const WRAP_MAX_ROW_SHARE = 2 / 3

// indent: a first-line indent. react-pdf reads it from the paragraph's first
// run, and a nested Text doesn't inherit textIndent from its parent.
function Runs({ runs, indent }: { runs: InlineRun[]; indent?: number }) {
  return (
    <>
      {runs.map((r, i) => (
        <Text
          key={i}
          style={{
            textIndent: i === 0 ? indent : undefined,
            // A chosen font; otherwise the page's default. Italic Comfortaa
            // gets its upright face (see pdfFonts).
            fontFamily: r.font ? pdfFontStack(r.font) : undefined,
            fontWeight: r.bold ? 700 : undefined,
            fontStyle: r.italic ? 'italic' : undefined,
            textDecoration: r.underline && r.strike ? 'underline line-through' : r.underline ? 'underline' : r.strike ? 'line-through' : undefined,
          }}
        >
          {r.text}
        </Text>
      ))}
    </>
  )
}

interface PdfImage {
  data: Buffer
  format: 'png' | 'jpg'
  // At its editor width (or natural width), clamped to the text width.
  width: number
  height: number
}

async function loadImage(src: string, width: number | null, layout: PdfLayout): Promise<PdfImage | null> {
  const fetched = await fetchImageBytes(src)
  if (!fetched || !fetched.info.format || !fetched.info.width || !fetched.info.height) {
    console.warn('Skipping export image (unreadable):', src)
    return null
  }
  const pdfFormat = PDF_IMAGE_FORMAT[fetched.info.format]
  if (!pdfFormat) {
    console.warn(`Skipping export image (unsupported format "${fetched.info.format}" for PDF):`, src)
    return null
  }
  const renderWidth = Math.min(layout.textWidth, (width ?? fetched.info.width) * PT_PER_PX)
  const renderHeight = renderWidth * (fetched.info.height / fetched.info.width)
  return { data: Buffer.from(fetched.bytes), format: pdfFormat, width: renderWidth, height: renderHeight }
}

function imageElement(image: PdfImage, style: React.ComponentProps<typeof Image>['style']) {
  return (
    // This is @react-pdf/renderer's Image (a PDF layout primitive), not an
    // HTML <img> — its props have no `alt` field at all, so one can't be added.
    // eslint-disable-next-line jsx-a11y/alt-text
    <Image style={style} src={{ data: image.data, format: image.format }} />
  )
}

function ownLineImage(image: PdfImage, align: Align | null) {
  return imageElement(image, [
    styles.image,
    { width: image.width, height: image.height, alignSelf: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center' },
  ])
}

// Blocks that can sit beside a wrapped image. Headings can't (the editor
// clears them below it), nor can another image.
type SideBlock = Extract<BlockNode, { type: 'paragraph' | 'bulletList' | 'orderedList' | 'blockquote' }>

function isSideBlock(block: BlockNode): block is SideBlock {
  return block.type === 'paragraph' || block.type === 'bulletList' || block.type === 'orderedList' || block.type === 'blockquote'
}

// Estimated height of a block at `width`, following the styles above.
// Headings and images never sit beside an image, so they aren't estimated.
// indented: a Book paragraph with a first-line indent (hasBookIndent).
export async function estimateHeight(
  block: SideBlock,
  width: number,
  layout: PdfLayout = DEFAULT_LAYOUT,
  indented = false
): Promise<number> {
  const fontSize = styles.page.fontSize
  switch (block.type) {
    case 'paragraph': {
      const lines = await countLines(block.runs, width, fontSize, indented ? BOOK_BODY.indent : 0)
      if (layout.book) return Math.max(lines, 1) * BOOK_BODY.fontSize * BOOK_BODY.lineHeight
      return lines * fontSize * styles.paragraph.lineHeight + styles.paragraph.marginBottom
    }
    case 'blockquote': {
      let height = styles.blockquote.marginBottom
      for (const child of block.children) {
        if (isSideBlock(child)) height += await estimateHeight(child, width - styles.blockquote.marginLeft)
      }
      return height
    }
    case 'bulletList':
    case 'orderedList': {
      let height = 0
      for (const item of block.items) {
        let itemHeight = 0
        for (const child of item) {
          if (isSideBlock(child)) itemHeight += await estimateHeight(child, width - styles.listMarker.width)
        }
        height += itemHeight + styles.listRow.marginBottom
      }
      return height
    }
  }
}

// A left/right ("wrap") image at blocks[index], with the text after it beside
// it: as many following paragraphs, lists and quotes as it takes for their
// estimated height to reach the image's, whole blocks only. The rest
// continues at full width. Falls back to the image on its own line when it
// would have to shrink too much to leave the text room, nothing can go
// beside it, or the pair would be too tall to keep on one page. Returns how
// many following blocks it used.
async function renderWrappedImage(
  block: Extract<BlockNode, { type: 'image' }>,
  blocks: BlockNode[],
  index: number,
  layout: PdfLayout
): Promise<{ node: React.ReactNode; used: number }> {
  const image = await loadImage(block.src, block.width, layout)
  if (!image) return { node: null, used: 0 }

  const ownLine = { node: <View key={index}>{ownLineImage(image, block.align)}</View>, used: 0 }
  const width = wrapImageWidth(image.width, layout.textWidth)
  if (width === null) return ownLine
  const height = image.height * (width / image.width)
  const columnWidth = layout.textWidth - width - WRAP_GAP_PT

  const side: SideBlock[] = []
  let columnHeight = 0
  for (let j = index + 1; j < blocks.length && columnHeight < height; j++) {
    const next = blocks[j]
    if (!isSideBlock(next)) break
    side.push(next)
    // A Book style blank that won't be drawn takes no space.
    const prev = blocks[j - 1]
    if (!(layout.book && isDroppedBlank(next, prev))) {
      columnHeight += await estimateHeight(next, columnWidth, layout, layout.book && hasBookIndent(next, prev))
    }
  }
  if (side.length === 0) return ownLine
  if (Math.max(height + WRAP_BOTTOM_GAP_PT, columnHeight) > layout.textHeight * WRAP_MAX_ROW_SHARE) return ownLine

  const left = block.align === 'left'
  const img = imageElement(image, {
    width,
    height,
    marginBottom: WRAP_BOTTOM_GAP_PT,
    ...(left ? { marginRight: WRAP_GAP_PT } : { marginLeft: WRAP_GAP_PT }),
  })
  return {
    node: (
      // Kept on one page: the image can't split, and splitting the text
      // beside it would leave it next to the wrong lines.
      <View key={index} style={styles.wrapRow} wrap={false}>
        {left && img}
        <View style={styles.wrapColumn}>{await renderBlocks(side, { layout, previous: block })}</View>
        {!left && img}
      </View>
    ),
    used: side.length,
  }
}

// Book style paragraph: justified unless centred or right-aligned (those keep
// their alignment); indent from hasBookIndent.
function bookParagraph(block: Extract<BlockNode, { type: 'paragraph' }>, key: number, indent: boolean) {
  if (plainText(block.runs) === '') return <View key={key} style={book.blankLine} />
  const keepsAlign = block.align === 'center' || block.align === 'right'
  return (
    <Text key={key} style={[book.paragraph, keepsAlign ? { textAlign: ALIGN_STYLE[block.align!] } : undefined]}>
      <Runs runs={block.runs} indent={indent ? BOOK_BODY.indent : undefined} />
    </Text>
  )
}

async function renderBlock(block: BlockNode, key: number, layout: PdfLayout, indent: boolean): Promise<React.ReactNode> {
  switch (block.type) {
    case 'heading': {
      const style = block.level <= 3 ? styles[`heading${block.level}` as 'heading1' | 'heading2' | 'heading3'] : styles.heading3
      return (
        <Text key={key} style={[style, block.align ? { textAlign: ALIGN_STYLE[block.align] } : undefined]}>
          <Runs runs={block.runs} />
        </Text>
      )
    }

    case 'paragraph':
      if (layout.book) return bookParagraph(block, key, indent)
      return (
        <Text key={key} style={[styles.paragraph, block.align ? { textAlign: ALIGN_STYLE[block.align] } : undefined]}>
          <Runs runs={block.runs} />
        </Text>
      )

    case 'blockquote':
      return (
        <View key={key} style={styles.blockquote}>
          {await renderBlocks(block.children, { layout })}
        </View>
      )

    case 'bulletList':
      return (
        <View key={key}>
          {await Promise.all(
            block.items.map(async (item, i) => (
              <View key={i} style={styles.listRow}>
                <Text style={styles.listMarker}>{'•'}</Text>
                <View style={styles.listContent}>{await renderBlocks(item, { layout })}</View>
              </View>
            ))
          )}
        </View>
      )

    case 'orderedList':
      return (
        <View key={key}>
          {await Promise.all(
            block.items.map(async (item, i) => (
              <View key={i} style={styles.listRow}>
                <Text style={styles.listMarker}>{`${i + 1}.`}</Text>
                <View style={styles.listContent}>{await renderBlocks(item, { layout })}</View>
              </View>
            ))
          )}
        </View>
      )

    case 'image': {
      const image = await loadImage(block.src, block.width, layout)
      return image ? <View key={key}>{ownLineImage(image, block.align)}</View> : null
    }
  }
}

// wrapImages: put text beside left/right images (renderWrappedImage). Only
// for a document's top level, which has the full text width to divide.
// layout: the page's text area and style; Standard A4 unless given.
// previous: the block before these, when they continue a sequence (a wrapped
// image's side column follows its image).
export async function renderBlocks(
  blocks: BlockNode[],
  {
    wrapImages = false,
    layout = DEFAULT_LAYOUT,
    previous,
  }: { wrapImages?: boolean; layout?: PdfLayout; previous?: BlockNode } = {}
): Promise<React.ReactNode[]> {
  const nodes: React.ReactNode[] = []
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    if (wrapImages && block.type === 'image' && (block.align === 'left' || block.align === 'right')) {
      const { node, used } = await renderWrappedImage(block, blocks, i, layout)
      nodes.push(node)
      i += used
      continue
    }
    const prev = i === 0 ? previous : blocks[i - 1]
    if (layout.book && isDroppedBlank(block, prev)) continue
    nodes.push(await renderBlock(block, i, layout, hasBookIndent(block, prev)))
  }
  return nodes
}

async function renderBook(sections: OutlineSection[], pageSize: ManuscriptPageSize, details: BookDetails) {
  const page = PAGE_SIZES[pageSize]
  const layout = layoutFor('book', pageSize)
  const pageStyle = [styles.page, { paddingTop: page.marginY, paddingBottom: page.marginY, paddingHorizontal: page.marginX }]
  const cover = details.coverUrl ? await loadImage(details.coverUrl, null, { ...layout, textWidth: page.width }) : null
  // Pages before the first chapter, so chapter pages number from 1.
  const frontPages = (cover ? 1 : 0) + 1
  // Header and page number sit centred in the top and bottom margins. Absolute
  // positions on a page count from its edge, not from inside the margins.
  const headerTop = { top: marginLineOffset(page.marginY) }
  const numberBottom = { bottom: marginLineOffset(page.marginY) }

  const chapterPages = await Promise.all(
    bookChapters(sections).map(async (chapter, i) => {
      const title = plainText(chapter.title)
      return (
        <Page key={`chapter-${i}`} size={page.size} style={pageStyle} wrap>
          {/* Hidden on a chapter's opening page; elsewhere the book's title on
              even pages and the chapter's on odd ones. */}
          <Text
            fixed
            style={[printStyles.runningHeader, headerTop]}
            render={({ pageNumber, subPageNumber }) =>
              subPageNumber === 1 ? '' : (pageNumber - frontPages) % 2 === 0 ? details.projectTitle : title
            }
          />
          <Text style={[book.chapterTitle, { marginTop: layout.textHeight * 0.25 }]}>
            <Runs runs={chapter.title} />
          </Text>
          {await renderBlocks(chapter.blocks, { wrapImages: true, layout })}
          <Text
            fixed
            style={[printStyles.pageNumber, numberBottom]}
            render={({ pageNumber, subPageNumber }) => (subPageNumber === 1 ? '' : String(pageNumber - frontPages))}
          />
        </Page>
      )
    })
  )

  return (
    <Document title={details.projectTitle} author={details.author ?? undefined}>
      {cover && (
        // No page breaking: the image fills the page exactly, which react-pdf
        // would otherwise flag as overflowing (A4's height isn't a whole
        // number of points).
        <Page size={page.size} style={{ padding: 0 }} wrap={false}>
          {imageElement(cover, { width: page.width, height: page.height, objectFit: 'cover' })}
        </Page>
      )}
      <Page size={page.size} style={pageStyle}>
        <TitlePageContent title={details.projectTitle} subtitle={details.author} textHeight={layout.textHeight} />
      </Page>
      {chapterPages}
    </Document>
  )
}

export async function renderOutlinesToPdf(
  sections: OutlineSection[],
  { style, pageSize, book: details }: RenderOutlinesOptions = DEFAULT_MANUSCRIPT_OPTIONS
): Promise<Buffer> {
  registerPdfFonts(SERVER_FONTS_DIR)
  if (style === 'book' && details) return renderToBuffer(await renderBook(sections, pageSize, details))

  const page = PAGE_SIZES[pageSize]
  const layout = layoutFor('standard', pageSize)
  const pageStyle = [styles.page, { paddingTop: page.marginY, paddingBottom: page.marginY, paddingHorizontal: page.marginX }]
  const pages = await Promise.all(
    sections.map(async (section, i) => (
      <Page key={i} size={page.size} style={pageStyle} wrap>
        <Text style={styles.title}>{section.title}</Text>
        {await renderBlocks(section.blocks, { wrapImages: true, layout })}
      </Page>
    ))
  )

  return renderToBuffer(<Document>{pages}</Document>)
}

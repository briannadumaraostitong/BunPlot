import path from 'path'
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { fetchImageBytes } from './fetchImageBytes'
import { PDF_FONT_STACK, pdfFontStack, registerPdfFonts } from './pdfFonts'
import { countLines } from './pdfTextMeasure'
import type { Align, BlockNode, InlineRun } from './outlineIR'
import type { OutlineSection } from './outlineToDocx'

// public/fonts on disk; next.config traces it into the project page's server
// function, where the export actions run.
export const SERVER_FONTS_DIR = path.join(process.cwd(), 'public', 'fonts')

export const styles = StyleSheet.create({
  // Every Text on the page inherits the font stack.
  page: { paddingTop: 56, paddingBottom: 56, paddingHorizontal: 64, fontSize: 11, fontFamily: PDF_FONT_STACK },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 20 },
  heading1: { fontSize: 18, fontWeight: 700, marginTop: 16, marginBottom: 8 },
  heading2: { fontSize: 15, fontWeight: 700, marginTop: 14, marginBottom: 6 },
  heading3: { fontSize: 13, fontWeight: 700, marginTop: 12, marginBottom: 6 },
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

// Text width of the A4 page above (595.28pt minus 64pt padding each side).
// Every image renders at its own width (or natural width if never resized),
// clamped to this. react-pdf can't wrap text around an image, so left/right
// ("wrap") images get the text after them beside them instead, at the
// document's top level (renderWrappedImage), and otherwise sit on their own
// line. The editor's width is CSS px, so convert to pt.
const TEXT_WIDTH_PT = 595.28 - 2 * 64
const PT_PER_PX = 0.75
// Text height of the same page (841.89pt minus 56pt top and bottom).
const TEXT_HEIGHT_PT = 841.89 - 2 * 56

// Wrapped (left/right) images: the editor caps them at half the text width,
// with 24px (18pt) between image and text and 16px (12pt) below.
const WRAP_MAX_WIDTH_PT = TEXT_WIDTH_PT / 2
const WRAP_GAP_PT = 18
const WRAP_BOTTOM_GAP_PT = 12
// Narrower than this, text beside an image reads badly (and justified text
// gets gappy), so the image goes on its own line instead.
const WRAP_MIN_COLUMN_PT = 160
// An image and its side text move to the next page together if they don't
// fit, so a group taller than this would leave too large a gap; the image
// goes on its own line instead.
const WRAP_MAX_ROW_PT = (TEXT_HEIGHT_PT * 2) / 3

function Runs({ runs }: { runs: InlineRun[] }) {
  return (
    <>
      {runs.map((r, i) => (
        <Text
          key={i}
          style={{
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

async function loadImage(src: string, width: number | null): Promise<PdfImage | null> {
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
  const renderWidth = Math.min(TEXT_WIDTH_PT, (width ?? fetched.info.width) * PT_PER_PX)
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

async function renderImageBlock(src: string, width: number | null, align: Align | null) {
  const image = await loadImage(src, width)
  return image ? ownLineImage(image, align) : null
}

// Blocks that can sit beside a wrapped image. Headings can't (the editor
// clears them below it), nor can another image.
type SideBlock = Extract<BlockNode, { type: 'paragraph' | 'bulletList' | 'orderedList' | 'blockquote' }>

function isSideBlock(block: BlockNode): block is SideBlock {
  return block.type === 'paragraph' || block.type === 'bulletList' || block.type === 'orderedList' || block.type === 'blockquote'
}

// Estimated height of a block at `width`, following the styles above.
// Headings and images never sit beside an image, so they aren't estimated.
export async function estimateHeight(block: SideBlock, width: number): Promise<number> {
  const fontSize = styles.page.fontSize
  switch (block.type) {
    case 'paragraph': {
      const lines = await countLines(block.runs, width, fontSize)
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
// continues at full width. Falls back to the image on its own line when the
// text column would be too narrow, nothing can go beside it, or the pair
// would be too tall to keep on one page. Returns how many following blocks
// it used.
async function renderWrappedImage(
  block: Extract<BlockNode, { type: 'image' }>,
  blocks: BlockNode[],
  index: number
): Promise<{ node: React.ReactNode; used: number }> {
  const image = await loadImage(block.src, block.width)
  if (!image) return { node: null, used: 0 }

  const width = Math.min(image.width, WRAP_MAX_WIDTH_PT)
  const height = image.height * (width / image.width)
  const columnWidth = TEXT_WIDTH_PT - width - WRAP_GAP_PT
  const ownLine = { node: <View key={index}>{ownLineImage(image, block.align)}</View>, used: 0 }
  if (columnWidth < WRAP_MIN_COLUMN_PT) return ownLine

  const side: SideBlock[] = []
  let columnHeight = 0
  for (let j = index + 1; j < blocks.length && columnHeight < height; j++) {
    const next = blocks[j]
    if (!isSideBlock(next)) break
    side.push(next)
    columnHeight += await estimateHeight(next, columnWidth)
  }
  if (side.length === 0) return ownLine
  if (Math.max(height + WRAP_BOTTOM_GAP_PT, columnHeight) > WRAP_MAX_ROW_PT) return ownLine

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
        <View style={styles.wrapColumn}>{await renderBlocks(side)}</View>
        {!left && img}
      </View>
    ),
    used: side.length,
  }
}

async function renderBlock(block: BlockNode, key: number): Promise<React.ReactNode> {
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
      return (
        <Text key={key} style={[styles.paragraph, block.align ? { textAlign: ALIGN_STYLE[block.align] } : undefined]}>
          <Runs runs={block.runs} />
        </Text>
      )

    case 'blockquote':
      return (
        <View key={key} style={styles.blockquote}>
          {await renderBlocks(block.children)}
        </View>
      )

    case 'bulletList':
      return (
        <View key={key}>
          {await Promise.all(
            block.items.map(async (item, i) => (
              <View key={i} style={styles.listRow}>
                <Text style={styles.listMarker}>{'•'}</Text>
                <View style={styles.listContent}>{await renderBlocks(item)}</View>
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
                <View style={styles.listContent}>{await renderBlocks(item)}</View>
              </View>
            ))
          )}
        </View>
      )

    case 'image':
      return renderImageBlock(block.src, block.width, block.align)
  }
}

// wrapImages: put text beside left/right images (renderWrappedImage). Only
// for a document's top level, which has the full text width to divide.
export async function renderBlocks(blocks: BlockNode[], { wrapImages = false } = {}): Promise<React.ReactNode[]> {
  const nodes: React.ReactNode[] = []
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    if (wrapImages && block.type === 'image' && (block.align === 'left' || block.align === 'right')) {
      const { node, used } = await renderWrappedImage(block, blocks, i)
      nodes.push(node)
      i += used
      continue
    }
    nodes.push(await renderBlock(block, i))
  }
  return nodes
}

export async function renderOutlinesToPdf(sections: OutlineSection[]): Promise<Buffer> {
  registerPdfFonts(SERVER_FONTS_DIR)
  const pages = await Promise.all(
    sections.map(async (section, i) => (
      <Page key={i} size="A4" style={styles.page} wrap>
        <Text style={styles.title}>{section.title}</Text>
        {await renderBlocks(section.blocks, { wrapImages: true })}
      </Page>
    ))
  )

  return renderToBuffer(<Document>{pages}</Document>)
}

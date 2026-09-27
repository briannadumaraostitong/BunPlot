import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { fetchImageBytes } from './fetchImageBytes'
import type { Align, BlockNode, InlineRun } from './outlineIR'
import type { OutlineSection } from './outlineToDocx'

const styles = StyleSheet.create({
  page: { paddingTop: 56, paddingBottom: 56, paddingHorizontal: 64, fontSize: 11 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 20 },
  heading1: { fontSize: 18, fontWeight: 700, marginTop: 16, marginBottom: 8 },
  heading2: { fontSize: 15, fontWeight: 700, marginTop: 14, marginBottom: 6 },
  heading3: { fontSize: 13, fontWeight: 700, marginTop: 12, marginBottom: 6 },
  paragraph: { marginBottom: 8, lineHeight: 1.5 },
  blockquote: { marginLeft: 24, marginBottom: 8, lineHeight: 1.5, color: '#555555' },
  listRow: { flexDirection: 'row', marginBottom: 4 },
  listMarker: { width: 18 },
  listContent: { flex: 1 },
  image: { marginVertical: 8 },
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

const MAX_IMAGE_WIDTH_PT = 400

function Runs({ runs }: { runs: InlineRun[] }) {
  return (
    <>
      {runs.map((r, i) => (
        <Text
          key={i}
          style={{
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

async function renderImageBlock(src: string, width: number | null, align: Align | null) {
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
  const renderWidth = Math.min(MAX_IMAGE_WIDTH_PT, width ?? MAX_IMAGE_WIDTH_PT)
  const renderHeight = renderWidth * (fetched.info.height / fetched.info.width)
  return (
    // This is @react-pdf/renderer's Image (a PDF layout primitive), not an
    // HTML <img> — its props have no `alt` field at all, so one can't be added.
    // eslint-disable-next-line jsx-a11y/alt-text
    <Image
      style={[styles.image, { width: renderWidth, height: renderHeight, alignSelf: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center' }]}
      src={{ data: Buffer.from(fetched.bytes), format: pdfFormat }}
    />
  )
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

async function renderBlocks(blocks: BlockNode[]): Promise<React.ReactNode[]> {
  const nodes: React.ReactNode[] = []
  for (let i = 0; i < blocks.length; i++) {
    nodes.push(await renderBlock(blocks[i], i))
  }
  return nodes
}

export async function renderOutlinesToPdf(sections: OutlineSection[]): Promise<Buffer> {
  const pages = await Promise.all(
    sections.map(async (section, i) => (
      <Page key={i} size="A4" style={styles.page} wrap>
        <Text style={styles.title}>{section.title}</Text>
        {await renderBlocks(section.blocks)}
      </Page>
    ))
  )

  return renderToBuffer(<Document>{pages}</Document>)
}

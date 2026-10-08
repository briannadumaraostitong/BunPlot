import { Document, Page, View, Text, Image, StyleSheet, pdf } from '@react-pdf/renderer'
import type { StoryboardChapter, StoryboardPanel } from '@/actions/export'
import type { PanelImageState } from './storyboardImages'

// Browser-only: rendered with pdf().toBlob() and loaded via dynamic import
// from ExportStoryboardDialog, so react-pdf stays out of the Panels tab
// bundle. Deliberately imports nothing from outlineToPdf or fetchImageBytes —
// those are server-side (Buffer, renderToBuffer). Images arrive here already
// canvas-encoded as PNG/JPEG Blobs (see storyboardImages.ts).

// A4 portrait in points, 3×2 panels per page. Pagination is explicit — each
// group of six panels is its own <Page wrap={false}> — so the grid never
// depends on react-pdf's automatic page wrapping.
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 36
const COLUMNS = 3
const ROWS = 2
const PANELS_PER_PAGE = COLUMNS * ROWS
const GAP = 12
const HEADER_HEIGHT = 32
const LABEL_HEIGHT = 64 // panel number + up to 4 caption lines
const CELL_WIDTH = Math.floor((PAGE_WIDTH - 2 * MARGIN - (COLUMNS - 1) * GAP) / COLUMNS)
const CELL_HEIGHT = Math.floor((PAGE_HEIGHT - 2 * MARGIN - HEADER_HEIGHT - (ROWS - 1) * GAP) / ROWS)
const IMAGE_BOX_HEIGHT = CELL_HEIGHT - LABEL_HEIGHT

// Font sizes follow outlineToPdf/storyBibleToPdf so the exports read as one
// family; copied rather than imported to keep this module browser-safe.
const styles = StyleSheet.create({
  page: { padding: MARGIN, fontSize: 9 },
  coverTitle: { fontSize: 32, fontWeight: 700, marginTop: 200, textAlign: 'center' },
  coverSubtitle: { fontSize: 14, marginTop: 12, textAlign: 'center', color: '#555555' },
  header: { height: HEADER_HEIGHT },
  heading: { fontSize: 15, fontWeight: 700, maxLines: 1, textOverflow: 'ellipsis' },
  continued: { fontSize: 9, color: '#777777', maxLines: 1, textOverflow: 'ellipsis' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL_WIDTH, height: CELL_HEIGHT },
  imageBox: { width: CELL_WIDTH, height: IMAGE_BOX_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: CELL_WIDTH,
    height: IMAGE_BOX_HEIGHT,
    borderWidth: 0.75,
    borderColor: '#cccccc',
    borderStyle: 'solid',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameText: { fontSize: 8, color: '#888888' },
  number: { fontSize: 8, fontWeight: 700, marginTop: 6, marginBottom: 2 },
  caption: { fontSize: 8.5, lineHeight: 1.3, color: '#333333', maxLines: 4, textOverflow: 'ellipsis' },
  empty: { fontStyle: 'italic', color: '#555555' },
})

const FRAME_TEXT: Record<Exclude<PanelImageState['kind'], 'image'>, string> = {
  missing: 'No image',
  failed: "Image couldn't be downloaded",
  unsupported: 'Image format not supported',
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

// Scales to fit the image box without stretching (aspect ratio kept).
function fit(width: number, height: number) {
  const scale = Math.min(CELL_WIDTH / width, IMAGE_BOX_HEIGHT / height)
  return { width: width * scale, height: height * scale }
}

function PanelCell({ panel, state, index }: { panel: StoryboardPanel; state: PanelImageState; index: number }) {
  const caption = panel.caption?.trim()
  return (
    <View
      style={[
        styles.cell,
        { marginRight: index % COLUMNS === COLUMNS - 1 ? 0 : GAP, marginBottom: index < COLUMNS ? GAP : 0 },
      ]}
    >
      {state.kind === 'image' ? (
        <View style={styles.imageBox}>
          {/* This is @react-pdf/renderer's Image (a PDF layout primitive), not an
              HTML <img> — its props have no `alt` field at all, so one can't be added. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={state.image.blob} style={fit(state.image.width, state.image.height)} />
        </View>
      ) : (
        <View style={styles.frame}>
          <Text style={styles.frameText}>{FRAME_TEXT[state.kind]}</Text>
        </View>
      )}
      <Text style={styles.number}>Panel {panel.number}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  )
}

function chapterPages(chapter: StoryboardChapter, images: Map<string, PanelImageState>) {
  if (chapter.panels.length === 0) {
    return [
      <Page key={chapter.id} size="A4" style={styles.page} wrap={false}>
        <View style={styles.header}>
          <Text style={styles.heading}>{chapter.title}</Text>
        </View>
        <Text style={styles.empty}>No panels in this chapter.</Text>
      </Page>,
    ]
  }

  const groups: StoryboardPanel[][] = []
  for (let i = 0; i < chapter.panels.length; i += PANELS_PER_PAGE) {
    groups.push(chapter.panels.slice(i, i + PANELS_PER_PAGE))
  }

  return groups.map((group, gi) => (
    <Page key={`${chapter.id}-${gi}`} size="A4" style={styles.page} wrap={false}>
      <View style={styles.header}>
        {gi === 0 ? (
          <Text style={styles.heading}>{chapter.title}</Text>
        ) : (
          <Text style={styles.continued}>{chapter.title} (continued)</Text>
        )}
      </View>
      <View style={styles.grid}>
        {group.map((panel, i) => (
          <PanelCell key={panel.id} panel={panel} state={images.get(panel.id) ?? { kind: 'missing' }} index={i} />
        ))}
      </View>
    </Page>
  ))
}

export interface StoryboardPdfInput {
  projectTitle: string
  chapters: StoryboardChapter[]
  images: Map<string, PanelImageState>
}

function StoryboardDocument({ projectTitle, chapters, images }: StoryboardPdfInput) {
  const panelCount = chapters.reduce((sum, ch) => sum + ch.panels.length, 0)
  return (
    <Document title={`${projectTitle} storyboard`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.coverTitle}>{projectTitle}</Text>
        <Text style={styles.coverSubtitle}>
          Storyboard · {plural(chapters.length, 'chapter')} · {plural(panelCount, 'panel')}
        </Text>
      </Page>
      {chapters.flatMap((chapter) => chapterPages(chapter, images))}
    </Document>
  )
}

export async function renderStoryboardPdf(input: StoryboardPdfInput): Promise<Blob> {
  return pdf(<StoryboardDocument {...input} />).toBlob()
}

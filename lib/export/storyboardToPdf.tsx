import { Document, Page, View, Text, Image, StyleSheet, pdf } from '@react-pdf/renderer'
import type { StoryboardChapter, StoryboardPanel } from '@/actions/export'
import { PDF_FONT_STACK, registerPdfFonts } from './pdfFonts'
import { BIBLE_COVER, EVENT_GROUP, FIELD_LABEL } from './printTypography'
import type { PanelImageState } from './storyboardImages'

// Browser-only: rendered with pdf().toBlob() and loaded via dynamic import
// from ExportStoryboardDialog, so react-pdf stays out of the Panels tab
// bundle. Deliberately imports nothing from outlineToPdf or fetchImageBytes —
// those are server-side (Buffer, renderToBuffer). Images arrive here already
// canvas-encoded as PNG/JPEG Blobs (see storyboardImages.ts). Fonts come from
// the shared, browser-safe pdfFonts, fetched from /fonts. Its cover, chapter
// headings and labels follow the story bible's (printTypography, plain
// constants, browser-safe), so the exports read as one family.

// A4 portrait in points, 3×2 panels per page. Pagination is explicit — each
// group of six panels is its own <Page>, sized to fit — so the grid never
// depends on react-pdf's automatic page wrapping. Pages keep react-pdf's
// default wrap: wrap={false} on a Page makes it as tall as its content
// instead of A4.
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

// The text height, for the cover's placement (BIBLE_COVER.top).
const TEXT_HEIGHT = PAGE_HEIGHT - 2 * MARGIN

// Small capitals as the story bible sets them (FIELD_LABEL): react-pdf has no
// small-caps feature, so capitals at the label size, letter-spaced.
const SMALL_CAPS = {
  fontSize: FIELD_LABEL.size,
  letterSpacing: FIELD_LABEL.tracking,
  textTransform: 'uppercase' as const,
  color: FIELD_LABEL.color,
}

const styles = StyleSheet.create({
  // Every Text on the page inherits the font stack.
  page: { padding: MARGIN, fontSize: 9, fontFamily: PDF_FONT_STACK },
  // The cover, as the story bible's (BIBLE_COVER): the title between two
  // short rules, STORYBOARD, the project's description and the author, the
  // counts at the foot.
  coverBlock: { alignItems: 'center', marginTop: TEXT_HEIGHT * BIBLE_COVER.top },
  coverRule: { width: BIBLE_COVER.ruleLength, borderTopWidth: BIBLE_COVER.ruleWidth, borderTopColor: BIBLE_COVER.ruleColor },
  coverTitle: {
    fontSize: BIBLE_COVER.titleSize,
    lineHeight: BIBLE_COVER.titleLineHeight,
    textAlign: 'center',
    marginVertical: BIBLE_COVER.ruleGap,
  },
  coverLabel: {
    fontSize: BIBLE_COVER.labelSize,
    letterSpacing: BIBLE_COVER.labelTracking,
    textTransform: 'uppercase',
    color: BIBLE_COVER.labelColor,
    marginTop: BIBLE_COVER.ruleGap,
  },
  coverDescription: {
    fontSize: BIBLE_COVER.descriptionSize,
    lineHeight: BIBLE_COVER.descriptionLineHeight,
    fontStyle: 'italic',
    textAlign: 'center',
    color: BIBLE_COVER.descriptionColor,
    width: (PAGE_WIDTH - 2 * MARGIN) * BIBLE_COVER.descriptionWidthShare,
    marginTop: BIBLE_COVER.descriptionGap,
  },
  coverAuthor: { fontSize: BIBLE_COVER.authorSize, color: BIBLE_COVER.authorColor, marginTop: BIBLE_COVER.authorGap },
  coverCounts: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: MARGIN + BIBLE_COVER.countsBottom,
    textAlign: 'center',
    fontSize: BIBLE_COVER.countsSize,
    letterSpacing: BIBLE_COVER.countsTracking,
    textTransform: 'uppercase',
    color: BIBLE_COVER.countsColor,
  },
  // A chapter's heading, as the story bible's timeline chapters (EVENT_GROUP):
  // the title over a hairline rule, the panel count at the right.
  header: { height: HEADER_HEIGHT },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: EVENT_GROUP.ruleGap,
    borderBottomWidth: EVENT_GROUP.ruleWidth,
    borderBottomColor: EVENT_GROUP.ruleColor,
  },
  heading: { flex: 1, fontSize: EVENT_GROUP.size, fontWeight: 700, maxLines: 1, textOverflow: 'ellipsis' },
  headingNote: { ...SMALL_CAPS, marginLeft: 8, marginBottom: 1.5 },
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
  number: { ...SMALL_CAPS, marginTop: 6, marginBottom: 2 },
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
      <Text style={styles.number}>{`Panel ${panel.number}`}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  )
}

// A chapter's heading over its rule, with a note at the right in small
// capitals (its panel count, or "continued" on its later pages).
function ChapterHeading({ title, note }: { title: string; note: string | null }) {
  return (
    <View style={styles.header}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>{title}</Text>
        {note && <Text style={styles.headingNote}>{note}</Text>}
      </View>
    </View>
  )
}

function chapterPages(chapter: StoryboardChapter, images: Map<string, PanelImageState>) {
  if (chapter.panels.length === 0) {
    return [
      <Page key={chapter.id} size="A4" style={styles.page}>
        <ChapterHeading title={chapter.title} note={null} />
        <Text style={styles.empty}>No panels in this chapter.</Text>
      </Page>,
    ]
  }

  const groups: StoryboardPanel[][] = []
  for (let i = 0; i < chapter.panels.length; i += PANELS_PER_PAGE) {
    groups.push(chapter.panels.slice(i, i + PANELS_PER_PAGE))
  }

  return groups.map((group, gi) => (
    <Page key={`${chapter.id}-${gi}`} size="A4" style={styles.page}>
      <ChapterHeading title={chapter.title} note={gi === 0 ? plural(chapter.panels.length, 'panel') : 'continued'} />
      <View style={styles.grid}>
        {group.map((panel, i) => (
          <PanelCell key={panel.id} panel={panel} state={images.get(panel.id) ?? { kind: 'missing' }} index={i} />
        ))}
      </View>
    </Page>
  ))
}

// projectDescription and author: for the cover, when there are any.
export interface StoryboardPdfInput {
  projectTitle: string
  projectDescription: string | null
  author: string | null
  chapters: StoryboardChapter[]
  images: Map<string, PanelImageState>
}

function StoryboardDocument({ projectTitle, projectDescription, author, chapters, images }: StoryboardPdfInput) {
  const panelCount = chapters.reduce((sum, ch) => sum + ch.panels.length, 0)
  return (
    <Document title={`${projectTitle} storyboard`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.coverBlock}>
          <View style={styles.coverRule} />
          <Text style={styles.coverTitle}>{projectTitle}</Text>
          <View style={styles.coverRule} />
          <Text style={styles.coverLabel}>Storyboard</Text>
          {projectDescription && <Text style={styles.coverDescription}>{projectDescription}</Text>}
          {author && <Text style={styles.coverAuthor}>{author}</Text>}
        </View>
        <Text style={styles.coverCounts}>{`${plural(chapters.length, 'chapter')} · ${plural(panelCount, 'panel')}`}</Text>
      </Page>
      {chapters.flatMap((chapter) => chapterPages(chapter, images))}
    </Document>
  )
}

export async function renderStoryboardPdf(input: StoryboardPdfInput): Promise<Blob> {
  registerPdfFonts(`${window.location.origin}/fonts`)
  return pdf(<StoryboardDocument {...input} />).toBlob()
}

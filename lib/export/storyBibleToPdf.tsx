import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import {
  layoutFor,
  printStyles,
  renderBlocks,
  SERVER_FONTS_DIR,
  styles as outlineStyles,
  TitlePageContent,
  type PdfLayout,
} from './outlineToPdf'
import { registerPdfFonts } from './pdfFonts'
import { MANUSCRIPT_PAGES } from './manuscriptLayout'
import { BIBLE_BODY, META_TEXT, MUTED_COLOR, SECTION_TITLE, marginLineOffset } from './printTypography'
import type { BlockNode } from './outlineIR'
import {
  SECTION_EMPTY_TEXT,
  SECTION_TITLES,
  sectionSummary,
  type StoryBible,
  type StoryBibleSection,
} from './storyBible'

// Heading scheme mirrors storyBibleToDocx: a centred title page, then each
// section on its own pages, opening with its title and count line; entries
// use heading2, subsections heading3. Rich-text headings were already
// shifted by buildStoryBible (level 4+ in places), but the outline renderer
// styles every level past 3 as heading3 — so in PDF, place headings match
// the "Description" / "Notes" subheading size rather than sitting visibly
// below it.

// Body text at the story bible's size (BIBLE_BODY), for its own paragraphs
// and the rich text it lays out with renderBlocks.
const BODY = { fontSize: BIBLE_BODY.fontSize, lineHeight: BIBLE_BODY.lineHeight, marginBottom: BIBLE_BODY.paragraphGap }
const LAYOUT: PdfLayout = { ...layoutFor('standard', 'a4'), body: BODY }

const PAGE = MANUSCRIPT_PAGES.a4
// Header and page number sit centred in the top and bottom margins, as in
// the Book style.
const HEADER_TOP = { top: marginLineOffset(PAGE.marginY) }
const NUMBER_BOTTOM = { bottom: marginLineOffset(PAGE.marginY) }
// Pages before the first section (the title page), so sections number from 1.
const FRONT_PAGES = 1

const styles = StyleSheet.create({
  // Text without a size of its own inherits the body size.
  page: { fontSize: BIBLE_BODY.fontSize },
  body: BODY,
  // A line of body text with no gap after it (list items).
  bodyLine: { fontSize: BIBLE_BODY.fontSize, lineHeight: BIBLE_BODY.lineHeight },
  sectionOpening: { marginBottom: SECTION_TITLE.after },
  sectionTitle: {
    fontSize: SECTION_TITLE.size,
    fontWeight: 700,
    paddingBottom: SECTION_TITLE.ruleGap,
    borderBottomWidth: SECTION_TITLE.ruleWidth,
    borderBottomColor: SECTION_TITLE.ruleColor,
  },
  sectionCount: { fontSize: SECTION_TITLE.countSize, marginTop: SECTION_TITLE.countGap, color: MUTED_COLOR },
  meta: { fontSize: META_TEXT.size, marginBottom: 4, color: META_TEXT.color },
  metaLabel: { fontWeight: 700 },
  empty: { fontStyle: 'italic', color: MUTED_COLOR },
  entry: { marginBottom: 10 },
})

const pageStyle = [outlineStyles.page, styles.page]

// A heading kept with what follows it: moved to the next page when less than
// two body lines would fit under it (as Word's keep with next does).
const KEEP_WITH_NEXT = 2 * BIBLE_BODY.fontSize * BIBLE_BODY.lineHeight

function Heading({ level, children }: { level: 2 | 3; children: React.ReactNode }) {
  return (
    <Text style={level === 2 ? outlineStyles.heading2 : outlineStyles.heading3} minPresenceAhead={KEEP_WITH_NEXT}>
      {children}
    </Text>
  )
}

function Meta({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <Text style={styles.meta}>
      <Text style={styles.metaLabel}>{`${label}: `}</Text>
      {value}
    </Text>
  )
}

function Paragraphs({ items }: { items: string[] }) {
  return (
    <>
      {items.map((text, i) => (
        <Text key={i} style={styles.body}>
          {text}
        </Text>
      ))}
    </>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <>
      {items.map((text, i) => (
        <View key={i} style={outlineStyles.listRow}>
          <Text style={[outlineStyles.listMarker, styles.bodyLine]}>{'•'}</Text>
          <Text style={[outlineStyles.listContent, styles.bodyLine]}>{text}</Text>
        </View>
      ))}
    </>
  )
}

// A section's pages: its title over a rule and its count line, or the empty
// note when the project has nothing for it. The running header (project ·
// section) is hidden on the opening page; every page is numbered.
function Section({ bible, section, children }: { bible: StoryBible; section: StoryBibleSection; children: React.ReactNode }) {
  const title = SECTION_TITLES[section]
  const summary = sectionSummary(bible, section)
  return (
    <Page size="A4" style={pageStyle} wrap>
      <Text
        fixed
        style={[printStyles.runningHeader, HEADER_TOP]}
        render={({ subPageNumber }) => (subPageNumber === 1 ? '' : `${bible.title} · ${title}`)}
      />
      <View style={styles.sectionOpening}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {summary && <Text style={styles.sectionCount}>{summary}</Text>}
      </View>
      {summary === null ? <Text style={[styles.body, styles.empty]}>{SECTION_EMPTY_TEXT[section]}</Text> : children}
      <Text
        fixed
        style={[printStyles.pageNumber, NUMBER_BOTTOM]}
        render={({ pageNumber }) => String(pageNumber - FRONT_PAGES)}
      />
    </Page>
  )
}

async function richSubsection(title: string, blocks: BlockNode[]) {
  if (blocks.length === 0) return null
  return (
    <View>
      <Heading level={3}>{title}</Heading>
      {await renderBlocks(blocks, { layout: LAYOUT })}
    </View>
  )
}

export async function renderStoryBibleToPdf(bible: StoryBible): Promise<Buffer> {
  // Pages use the outline export's page style, which carries the font stack.
  registerPdfFonts(SERVER_FONTS_DIR)
  const pages: React.ReactNode[] = [
    <Page key="title" size="A4" style={pageStyle}>
      <TitlePageContent title={bible.title} subtitle="Story Bible" byline={bible.author} textHeight={LAYOUT.textHeight} />
    </Page>,
  ]

  if (bible.characters) {
    const { entries, familyTrees } = bible.characters
    pages.push(
      <Section key="characters" bible={bible} section="characters">
        {entries.map((c, i) => (
          <View key={i} style={styles.entry}>
            <Heading level={2}>{c.name}</Heading>
            <Meta label="Role" value={c.role} />
            <Paragraphs items={c.description ? c.description.split('\n').filter((l) => l.trim()) : []} />
            {c.relationships.length > 0 && (
              <>
                <Heading level={3}>Relationships</Heading>
                <Bullets items={c.relationships} />
              </>
            )}
          </View>
        ))}
        {/* A group heading goes inside its first entry, so it stays with it
            (minPresenceAhead only holds for the Text that follows it). */}
        {familyTrees.length > 0 && (
          <View>
            {familyTrees.map((tree, i) => (
              <View key={i} style={styles.entry}>
                {i === 0 && <Heading level={2}>Family Trees</Heading>}
                <Heading level={3}>{tree.name}</Heading>
                <Meta label="Members" value={tree.members.length > 0 ? tree.members.join(', ') : 'None'} />
                <Bullets items={tree.relationships} />
              </View>
            ))}
          </View>
        )}
      </Section>
    )
  }

  if (bible.places) {
    const entries = await Promise.all(
      bible.places.map(async (p, i) => (
        <View key={i} style={styles.entry}>
          <Heading level={2}>{p.name}</Heading>
          <Meta label="Type" value={p.type} />
          {await richSubsection('Description', p.description)}
          {await richSubsection('Notes', p.notes)}
        </View>
      ))
    )
    pages.push(
      <Section key="places" bible={bible} section="places">
        {entries}
      </Section>
    )
  }

  if (bible.timeline) {
    pages.push(
      <Section key="timeline" bible={bible} section="timeline">
        {bible.timeline.map((group, gi) => (
          <View key={gi}>
            {group.events.map((e, ei) => (
              <View key={ei} style={styles.entry}>
                {ei === 0 && <Heading level={2}>{group.heading}</Heading>}
                <Heading level={3}>{e.title}</Heading>
                <Meta label="Layer" value={e.layer} />
                <Meta label="Status" value={e.status} />
                <Meta label="Dates" value={e.dates} />
                <Meta label="Characters" value={e.characters.join(', ') || null} />
                <Meta label="Places" value={e.places.join(', ') || null} />
                <Paragraphs items={e.description} />
                {e.notes.length > 0 && (
                  <>
                    <Text style={[styles.body, styles.metaLabel]}>Notes</Text>
                    <Paragraphs items={e.notes} />
                  </>
                )}
              </View>
            ))}
          </View>
        ))}
      </Section>
    )
  }

  return renderToBuffer(
    <Document title={`${bible.title} – Story Bible`} author={bible.author ?? undefined}>
      {pages}
    </Document>
  )
}

import { Document, Page, View, Text, Link, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
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
import {
  BIBLE_BODY,
  CHARACTER_CARD,
  CONTENTS,
  META_TEXT,
  MUTED_COLOR,
  SECTION_TITLE,
  marginLineOffset,
} from './printTypography'
import { cardColors } from './printColors'
import { Card, FieldLabel } from './storyBiblePdfParts'
import { cardTextWidth, characterCardHeight, keepCardTogether, relationColumns } from './storyBibleMeasure'
import type { BlockNode } from './outlineIR'
import {
  CONTENTS_TITLE,
  FAMILY_TREES_ANCHOR,
  FAMILY_TREES_TITLE,
  SECTION_EMPTY_TEXT,
  SECTION_TITLES,
  contentsEntries,
  hasDetails,
  sectionAnchor,
  sectionSummary,
  timelineGroupAnchor,
  type CharacterEntry,
  type StoryBible,
  type StoryBibleSection,
} from './storyBible'

// Heading scheme mirrors storyBibleToDocx: a centred title page, the
// contents, then each section on its own pages, opening with its title and
// count line; entries use heading2, subsections heading3. Rich-text headings
// were already shifted by buildStoryBible (level 4+ in places), but the
// outline renderer styles every level past 3 as heading3 — so in PDF, place
// headings match the "Description" / "Notes" subheading size rather than
// sitting visibly below it.

// Body text at the story bible's size (BIBLE_BODY), for its own paragraphs
// and the rich text it lays out with renderBlocks.
const BODY = { fontSize: BIBLE_BODY.fontSize, lineHeight: BIBLE_BODY.lineHeight, marginBottom: BIBLE_BODY.paragraphGap }
const LAYOUT: PdfLayout = { ...layoutFor('standard', 'a4'), body: BODY }

const PAGE = MANUSCRIPT_PAGES.a4
// Header and page number sit centred in the top and bottom margins, as in
// the Book style.
const HEADER_TOP = { top: marginLineOffset(PAGE.marginY) }
const NUMBER_BOTTOM = { bottom: marginLineOffset(PAGE.marginY) }
// Pages before the contents (the title page), so the contents is page 1.
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
  // Contents rows are links, which react-pdf would otherwise colour and
  // underline.
  contentsLink: { color: '#000000', textDecoration: 'none' },
  contentsRow: { flexDirection: 'row', fontSize: CONTENTS.size, marginTop: CONTENTS.gap },
  contentsSubRow: {
    flexDirection: 'row',
    fontSize: CONTENTS.subSize,
    marginTop: CONTENTS.subGap,
    paddingLeft: CONTENTS.subIndent,
    color: CONTENTS.subColor,
  },
  contentsTitle: { flex: 1 },
  contentsNumber: { width: CONTENTS.numberWidth, textAlign: 'right' },
  // Character cards (CHARACTER_CARD).
  characterName: { fontSize: CHARACTER_CARD.nameSize, lineHeight: CHARACTER_CARD.nameLineHeight, fontWeight: 700 },
  characterRole: {
    fontSize: CHARACTER_CARD.roleSize,
    lineHeight: CHARACTER_CARD.roleLineHeight,
    marginBottom: BIBLE_BODY.paragraphGap,
  },
  slimName: {
    fontSize: CHARACTER_CARD.slimNameSize,
    lineHeight: CHARACTER_CARD.roleLineHeight,
    fontWeight: 700,
    marginBottom: BIBLE_BODY.paragraphGap,
  },
  slimRole: { fontSize: CHARACTER_CARD.roleSize, fontWeight: 400 },
  // The rows' last gap, plus this, makes a paragraph's gap.
  relations: { marginBottom: BIBLE_BODY.paragraphGap - CHARACTER_CARD.rowGap },
  relationRow: { flexDirection: 'row', marginBottom: CHARACTER_CARD.rowGap },
  relationText: { fontSize: CHARACTER_CARD.rowSize, lineHeight: CHARACTER_CARD.rowLineHeight },
  relation: { flex: 1, color: CHARACTER_CARD.relationColor },
})

// Relationship rows' name column, inside a card on this page.
const RELATION_COLUMNS = relationColumns(cardTextWidth(LAYOUT.textWidth))

const pageStyle = [outlineStyles.page, styles.page]

// A heading kept with what follows it: moved to the next page when less than
// two body lines would fit under it (as Word's keep with next does).
const KEEP_WITH_NEXT = 2 * BIBLE_BODY.fontSize * BIBLE_BODY.lineHeight

// Where each contents entry's anchor landed, as printed page numbers, from
// the last time the document was laid out (see renderStoryBibleToPdf).
type PageNumbers = Map<string, number>

// Records the page it lands on under anchor. react-pdf calls render more than
// once per layout (before and after splitting pages), and the last call is
// the final page. Goes after the heading it marks, so it moves with it.
function PageMarker({ anchor, pages }: { anchor: string; pages: PageNumbers }) {
  return (
    <Text
      render={({ pageNumber }) => {
        pages.set(anchor, pageNumber - FRONT_PAGES)
        return ''
      }}
    />
  )
}

function Heading({ level, anchor, children }: { level: 2 | 3; anchor?: string; children: React.ReactNode }) {
  return (
    <Text
      id={anchor}
      style={level === 2 ? outlineStyles.heading2 : outlineStyles.heading3}
      minPresenceAhead={KEEP_WITH_NEXT}
    >
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

// A page run with the story bible's furniture: the running header (project ·
// header), hidden on the opening page, and a page number on every page.
function BiblePage({ bible, header, bookmark, children }: {
  bible: StoryBible
  header: string
  bookmark: string
  children: React.ReactNode
}) {
  return (
    <Page size="A4" style={pageStyle} wrap bookmark={bookmark}>
      <Text
        fixed
        style={[printStyles.runningHeader, HEADER_TOP]}
        render={({ subPageNumber }) => (subPageNumber === 1 ? '' : `${bible.title} · ${header}`)}
      />
      {children}
      <Text
        fixed
        style={[printStyles.pageNumber, NUMBER_BOTTOM]}
        render={({ pageNumber }) => String(pageNumber - FRONT_PAGES)}
      />
    </Page>
  )
}

// The contents: each entry links to its anchor, with the page it's on from
// the previous layout (blank on the first; the number column has a fixed
// width, so filling it in doesn't move anything).
function ContentsPage({ bible, pages }: { bible: StoryBible; pages: PageNumbers }) {
  return (
    <BiblePage bible={bible} header={CONTENTS_TITLE} bookmark={CONTENTS_TITLE}>
      <View style={styles.sectionOpening}>
        <Text style={styles.sectionTitle}>{CONTENTS_TITLE}</Text>
      </View>
      {contentsEntries(bible).map((entry) => (
        <Link key={entry.anchor} src={`#${entry.anchor}`} style={styles.contentsLink}>
          <View style={entry.level === 1 ? styles.contentsRow : styles.contentsSubRow} wrap={false}>
            <Text style={styles.contentsTitle}>{entry.title}</Text>
            <Text style={styles.contentsNumber} render={() => String(pages.get(entry.anchor) ?? '')} />
          </View>
        </Link>
      ))}
    </BiblePage>
  )
}

// A section's pages: its title over a rule and its count line, or the empty
// note when the project has nothing for it.
function Section({ bible, section, pages, children }: {
  bible: StoryBible
  section: StoryBibleSection
  pages: PageNumbers
  children: React.ReactNode
}) {
  const title = SECTION_TITLES[section]
  const summary = sectionSummary(bible, section)
  return (
    <BiblePage bible={bible} header={title} bookmark={title}>
      <View style={styles.sectionOpening}>
        <Text id={sectionAnchor(section)} style={styles.sectionTitle}>
          {title}
        </Text>
        <PageMarker anchor={sectionAnchor(section)} pages={pages} />
        {summary && <Text style={styles.sectionCount}>{summary}</Text>}
      </View>
      {summary === null ? <Text style={[styles.body, styles.empty]}>{SECTION_EMPTY_TEXT[section]}</Text> : children}
    </BiblePage>
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

// A character's card: their colour's accent, name and role (in the colour),
// then the description, notes and relationships. A character with none of
// those gets a slim one-line card: the name, and the role beside it.
function CharacterCard({ c, keepTogether }: { c: CharacterEntry; keepTogether: boolean }) {
  const { text } = cardColors(c.color)
  if (!hasDetails(c)) {
    return (
      <Card color={c.color} keepTogether>
        <Text style={styles.slimName}>
          {c.name}
          {c.role && <Text style={[styles.slimRole, { color: text }]}>{`  ·  ${c.role}`}</Text>}
        </Text>
      </Card>
    )
  }
  return (
    <Card color={c.color} keepTogether={keepTogether}>
      <Text style={[styles.characterName, { marginBottom: c.role ? CHARACTER_CARD.nameGap : BIBLE_BODY.paragraphGap }]}>
        {c.name}
      </Text>
      {c.role && <Text style={[styles.characterRole, { color: text }]}>{c.role}</Text>}
      <Paragraphs items={c.description} />
      {c.notes.length > 0 && (
        <>
          <FieldLabel>Notes</FieldLabel>
          <Paragraphs items={c.notes} />
        </>
      )}
      {c.relationships.length > 0 && (
        <View style={styles.relations}>
          <FieldLabel>Relationships</FieldLabel>
          {c.relationships.map((r, i) => (
            <View key={i} style={styles.relationRow} wrap={false}>
              <Text style={[styles.relationText, { width: RELATION_COLUMNS.name, marginRight: RELATION_COLUMNS.gap }]}>
                {r.name}
              </Text>
              <Text style={[styles.relationText, styles.relation]}>{r.relation}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  )
}

// At most this many layouts. The second one normally agrees with the first,
// since contents numbers sit in a fixed-width column and can't move anything;
// the third is only a safety net.
const MAX_LAYOUTS = 3

export async function renderStoryBibleToPdf(bible: StoryBible): Promise<Buffer> {
  // Pages use the outline export's page style, which carries the font stack.
  registerPdfFonts(SERVER_FONTS_DIR)
  const pageNumbers: PageNumbers = new Map()
  const pages: React.ReactNode[] = [
    <Page key="title" size="A4" style={pageStyle}>
      <TitlePageContent title={bible.title} subtitle="Story Bible" byline={bible.author} textHeight={LAYOUT.textHeight} />
    </Page>,
    <ContentsPage key="contents" bible={bible} pages={pageNumbers} />,
  ]

  if (bible.characters) {
    const { entries, familyTrees } = bible.characters
    // A card that fits in CARD.keepTogetherShare of a page stays in one piece.
    const keep = await Promise.all(
      entries.map(async (c) =>
        hasDetails(c) ? keepCardTogether(await characterCardHeight(c, LAYOUT.textWidth), LAYOUT.textHeight) : true
      )
    )
    pages.push(
      <Section key="characters" bible={bible} section="characters" pages={pageNumbers}>
        {entries.map((c, i) => (
          <CharacterCard key={i} c={c} keepTogether={keep[i]} />
        ))}
        {/* A group heading goes inside its first entry, so it stays with it
            (minPresenceAhead only holds for the Text that follows it). */}
        {familyTrees.length > 0 && (
          <View>
            {familyTrees.map((tree, i) => (
              <View key={i} style={styles.entry}>
                {i === 0 && (
                  <>
                    <Heading level={2} anchor={FAMILY_TREES_ANCHOR}>
                      {FAMILY_TREES_TITLE}
                    </Heading>
                    <PageMarker anchor={FAMILY_TREES_ANCHOR} pages={pageNumbers} />
                  </>
                )}
                <Heading level={3}>{tree.name}</Heading>
                <FieldLabel>Members</FieldLabel>
                <Text style={styles.body}>{tree.members.length > 0 ? tree.members.join(', ') : 'None'}</Text>
                {tree.relationships.length > 0 && (
                  <>
                    <FieldLabel>Relationships</FieldLabel>
                    <Bullets items={tree.relationships} />
                  </>
                )}
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
      <Section key="places" bible={bible} section="places" pages={pageNumbers}>
        {entries}
      </Section>
    )
  }

  if (bible.timeline) {
    pages.push(
      <Section key="timeline" bible={bible} section="timeline" pages={pageNumbers}>
        {bible.timeline.map((group, gi) => (
          <View key={gi}>
            {group.events.map((e, ei) => (
              <View key={ei} style={styles.entry}>
                {ei === 0 && (
                  <>
                    <Heading level={2} anchor={timelineGroupAnchor(gi)}>
                      {group.heading}
                    </Heading>
                    <PageMarker anchor={timelineGroupAnchor(gi)} pages={pageNumbers} />
                  </>
                )}
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

  const document = (
    <Document title={`${bible.title} – Story Bible`} author={bible.author ?? undefined}>
      {pages}
    </Document>
  )

  // The contents prints each anchor's page from the layout before, so lay
  // out until the pages it printed are the pages the anchors landed on.
  let buffer = await renderToBuffer(document)
  for (let i = 1; i < MAX_LAYOUTS; i++) {
    const printed = new Map(pageNumbers)
    buffer = await renderToBuffer(document)
    if ([...pageNumbers].every(([anchor, page]) => printed.get(anchor) === page)) break
  }
  return buffer
}

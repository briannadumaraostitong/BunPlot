import { Document, Page, View, Text, Link, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
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
  LABEL,
  META_TEXT,
  MUTED_COLOR,
  PLACE_CARD,
  SECTION_TITLE,
  marginLineOffset,
} from './printTypography'
import { cardColors } from './printColors'
import { Card, FieldLabel, Labels } from './storyBiblePdfParts'
import {
  cardTextWidth,
  characterCardHeight,
  keepCardTogether,
  placeCardHeight,
  relationColumns,
} from './storyBibleMeasure'
import {
  CONTENTS_TITLE,
  FAMILY_TREES_ANCHOR,
  FAMILY_TREES_TITLE,
  SECTION_EMPTY_TEXT,
  SECTION_TITLES,
  contentsEntries,
  hasDetails,
  placeHasDetails,
  sectionAnchor,
  sectionSummary,
  timelineGroupAnchor,
  type CharacterEntry,
  type PlaceEntry,
  type StoryBible,
  type StoryBibleSection,
} from './storyBible'

// Heading scheme mirrors storyBibleToDocx: a centred title page, the
// contents, then each section on its own pages, opening with its title and
// count line; character and place cards, then group headings (family trees,
// timeline chapters) at heading2 and their entries at heading3. Rich-text
// headings were already shifted by buildStoryBible (level 3+ in places), and
// the outline renderer styles every level past 3 as heading3.

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
  // Character and place cards (CHARACTER_CARD, PLACE_CARD).
  cardName: { fontSize: CHARACTER_CARD.nameSize, lineHeight: CHARACTER_CARD.nameLineHeight, fontWeight: 700 },
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
  slimDetail: { fontSize: CHARACTER_CARD.roleSize, fontWeight: 400 },
  // The rows' last gap, plus this, makes a paragraph's gap.
  relations: { marginBottom: BIBLE_BODY.paragraphGap - CHARACTER_CARD.rowGap },
  relationRow: { flexDirection: 'row', marginBottom: CHARACTER_CARD.rowGap },
  relationText: { fontSize: CHARACTER_CARD.rowSize, lineHeight: CHARACTER_CARD.rowLineHeight },
  relation: { flex: 1, color: CHARACTER_CARD.relationColor },
  // The labels' last gap, plus this, makes a paragraph's gap.
  cardLabels: { marginBottom: BIBLE_BODY.paragraphGap - LABEL.gap },
})

// The text width inside a card, and rich text laid out at it.
const CARD_WIDTH = cardTextWidth(LAYOUT.textWidth)
const CARD_LAYOUT: PdfLayout = { ...LAYOUT, textWidth: CARD_WIDTH }
// Relationship rows' name column, inside a card on this page.
const RELATION_COLUMNS = relationColumns(CARD_WIDTH)
// A place's cover, across the card.
const COVER = { width: CARD_WIDTH, height: CARD_WIDTH / PLACE_CARD.coverAspect, marginBottom: PLACE_CARD.coverGap }

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

// A slim one-line card, for an entry with no details: the name, and beside
// it a detail (a character's role, a place's type) in the colour.
function SlimCard({ color, name, detail }: { color: string | null; name: string; detail: string | null }) {
  const { text } = cardColors(color)
  return (
    <Card color={color} keepTogether>
      <Text style={styles.slimName}>
        {name}
        {detail && <Text style={[styles.slimDetail, { color: text }]}>{`  ·  ${detail}`}</Text>}
      </Text>
    </Card>
  )
}

// A character's card: their colour's accent, name and role (in the colour),
// then the description, notes and relationships. A character with none of
// those gets a slim card.
function CharacterCard({ c, keepTogether }: { c: CharacterEntry; keepTogether: boolean }) {
  if (!hasDetails(c)) return <SlimCard color={c.color} name={c.name} detail={c.role} />
  const { text } = cardColors(c.color)
  return (
    <Card color={c.color} keepTogether={keepTogether}>
      <Text style={[styles.cardName, { marginBottom: c.role ? CHARACTER_CARD.nameGap : BIBLE_BODY.paragraphGap }]}>
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

// A place's card: the cover, the name, the type as a label in the place's
// colour, then the description and notes. A place with none of those gets a
// slim card.
async function placeCard(p: PlaceEntry, keepTogether: boolean, key: number) {
  if (!placeHasDetails(p)) return <SlimCard key={key} color={p.color} name={p.name} detail={p.type} />
  const rich = async (label: string, blocks: PlaceEntry['description']) =>
    blocks.length > 0 && (
      <>
        <FieldLabel>{label}</FieldLabel>
        {await renderBlocks(blocks, { layout: CARD_LAYOUT })}
      </>
    )
  return (
    <Card key={key} color={p.color} keepTogether={keepTogether}>
      {/* react-pdf's Image (a PDF primitive), which has no alt. */}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      {p.cover && <Image src={p.cover} style={COVER} />}
      <Text style={[styles.cardName, { marginBottom: LABEL.gap }]}>{p.name}</Text>
      <View style={styles.cardLabels}>
        <Labels labels={[{ text: p.type, color: p.color }]} />
      </View>
      {await rich('Description', p.description)}
      {await rich('Notes', p.notes)}
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
    // Kept in one piece as character cards are.
    const entries = await Promise.all(
      bible.places.map(async (p, i) =>
        placeCard(
          p,
          placeHasDetails(p) && keepCardTogether(await placeCardHeight(p, LAYOUT.textWidth), LAYOUT.textHeight),
          i
        )
      )
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

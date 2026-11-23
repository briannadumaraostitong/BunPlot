import { Document, Page, View, Text, Link, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import {
  layoutFor,
  printStyles,
  renderBlocks,
  SERVER_FONTS_DIR,
  styles as outlineStyles,
  type PdfLayout,
} from './outlineToPdf'
import { registerPdfFonts } from './pdfFonts'
import { MANUSCRIPT_PAGES } from './manuscriptLayout'
import {
  BIBLE_BODY,
  BIBLE_COVER,
  CONTENTS,
  ENTRY_INDENT,
  ENTRY_NAME,
  EVENT_ENTRY,
  EVENT_GROUP,
  MUTED_COLOR,
  PLACE_ENTRY,
  RELATIONS,
  SECTION_TITLE,
  marginLineOffset,
} from './printTypography'
import { Entry, FieldLabel, NameLine, SMALL_CAPS, Swatch } from './storyBiblePdfParts'
import {
  PLACE_TEXT,
  characterEntryHeight,
  eventDatesWidth,
  eventEntryHeight,
  keepEntryTogether,
  placeEntryHeight,
  relationColumnsAt,
} from './storyBibleMeasure'
import {
  CONTENTS_TITLE,
  FAMILY_TREES_ANCHOR,
  FAMILY_TREES_TITLE,
  SECTION_EMPTY_TEXT,
  SECTION_TITLES,
  contentsEntries,
  coverSummary,
  eventCount,
  eventMeta,
  hasDetails,
  placeHasDetails,
  sectionAnchor,
  sectionSummary,
  timelineGroupAnchor,
  type CharacterEntry,
  type EventEntry,
  type PlaceEntry,
  type StoryBible,
  type StoryBibleSection,
} from './storyBible'

// Set as a printed book's appendix: a cover, the contents, then each section
// on its own pages, opening with its title over a hairline rule and its count
// line. Entries have no boxes: a small square swatch of their colour before
// the name, labels in small capitals, characters and places divided by
// hairline rules, timeline events as lines under each chapter. The family
// trees' heading is at heading2 and each tree's at heading3. Rich-text
// headings were already shifted by buildStoryBible (level 3+ in places), and
// the outline renderer styles every level past 3 as heading3.

// Body text at the story bible's size (BIBLE_BODY), for its own paragraphs
// and the rich text it lays out with renderBlocks.
const BODY = { fontSize: BIBLE_BODY.fontSize, lineHeight: BIBLE_BODY.lineHeight, marginBottom: BIBLE_BODY.paragraphGap }
const LAYOUT: PdfLayout = { ...layoutFor('standard', 'a4'), body: BODY }
// The width of what follows an entry's name, indented past its swatch.
const INNER_WIDTH = LAYOUT.textWidth - ENTRY_INDENT
// A place's description and notes: caption text, a little smaller, indented.
const PLACE_LAYOUT: PdfLayout = {
  ...LAYOUT,
  textWidth: INNER_WIDTH,
  body: { fontSize: PLACE_TEXT.fontSize, lineHeight: PLACE_TEXT.lineHeight, marginBottom: PLACE_TEXT.paragraphGap },
}

const PAGE = MANUSCRIPT_PAGES.a4
// Header and page number sit centred in the top and bottom margins, as in
// the Book style.
const HEADER_TOP = { top: marginLineOffset(PAGE.marginY) }
const NUMBER_BOTTOM = { bottom: marginLineOffset(PAGE.marginY) }
// Pages before the contents (the cover), so the contents is page 1.
const FRONT_PAGES = 1

// Relationship rows' columns, at the indented width, and a place's image,
// across the full text width.
const RELATION_COLUMNS = relationColumnsAt(INNER_WIDTH)
const COVER_IMAGE = {
  width: LAYOUT.textWidth,
  height: LAYOUT.textWidth / PLACE_ENTRY.coverAspect,
  marginBottom: PLACE_ENTRY.coverGap,
}

// Text with a unitless lineHeight also sets its fontSize: react-pdf turns
// the lineHeight into points with the style's own size, before inheriting.
const styles = StyleSheet.create({
  // Text without a size of its own inherits the body size.
  page: { fontSize: BIBLE_BODY.fontSize },
  body: BODY,
  // A line of body text with no gap after it (family tree relationships).
  bodyLine: { fontSize: BIBLE_BODY.fontSize, lineHeight: BIBLE_BODY.lineHeight },
  sectionOpening: { marginBottom: SECTION_TITLE.after },
  sectionTitle: {
    fontSize: SECTION_TITLE.size,
    fontWeight: 700,
    paddingBottom: SECTION_TITLE.ruleGap,
    borderBottomWidth: SECTION_TITLE.ruleWidth,
    borderBottomColor: SECTION_TITLE.ruleColor,
  },
  sectionCount: { ...SMALL_CAPS, marginTop: SECTION_TITLE.countGap },
  empty: { fontStyle: 'italic', color: MUTED_COLOR },
  familyTree: { marginBottom: 10 },
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
  // The cover (BIBLE_COVER).
  coverBlock: { alignItems: 'center' },
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
    width: LAYOUT.textWidth * BIBLE_COVER.descriptionWidthShare,
    marginTop: BIBLE_COVER.descriptionGap,
  },
  coverAuthor: { fontSize: BIBLE_COVER.authorSize, color: BIBLE_COVER.authorColor, marginTop: BIBLE_COVER.authorGap },
  coverCounts: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: PAGE.marginY + BIBLE_COVER.countsBottom,
    textAlign: 'center',
    fontSize: BIBLE_COVER.countsSize,
    letterSpacing: BIBLE_COVER.countsTracking,
    textTransform: 'uppercase',
    color: BIBLE_COVER.countsColor,
  },
  // A character's relationships (RELATIONS).
  relationRow: { flexDirection: 'row', marginBottom: RELATIONS.rowGap },
  relationName: {
    fontSize: RELATIONS.size,
    lineHeight: RELATIONS.lineHeight,
    width: RELATION_COLUMNS.name,
    marginRight: RELATION_COLUMNS.gap,
  },
  relation: {
    flex: 1,
    fontSize: RELATIONS.size,
    lineHeight: RELATIONS.lineHeight,
    fontStyle: 'italic',
    color: RELATIONS.relationColor,
  },
  // What follows a character's or place's name, indented to the name.
  entryBody: { paddingLeft: ENTRY_INDENT },
  // A place's description and notes, as caption text (PLACE_ENTRY).
  placeText: { paddingLeft: ENTRY_INDENT, color: PLACE_ENTRY.textColor },
  // An image after the rule above it gets more room than other entries.
  coverSpaced: { marginTop: PLACE_ENTRY.coverSpaceAbove },
  // Timeline chapter headings (EVENT_GROUP) and events (EVENT_ENTRY).
  groupHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: EVENT_GROUP.ruleGap,
    borderBottomWidth: EVENT_GROUP.ruleWidth,
    borderBottomColor: EVENT_GROUP.ruleColor,
    marginBottom: EVENT_GROUP.after,
  },
  groupTitle: { flex: 1, fontSize: EVENT_GROUP.size, fontWeight: 700 },
  groupCount: { ...SMALL_CAPS, marginLeft: EVENT_ENTRY.datesGap, marginBottom: 1.5 },
  event: { marginBottom: EVENT_ENTRY.gap },
  eventTitleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  eventTitle: { flex: 1, fontSize: EVENT_ENTRY.titleSize, lineHeight: EVENT_ENTRY.titleLineHeight, fontWeight: 700 },
  // On the title's line height, so the two sit on one line.
  eventDates: {
    fontSize: EVENT_ENTRY.datesSize,
    lineHeight: (EVENT_ENTRY.titleSize * EVENT_ENTRY.titleLineHeight) / EVENT_ENTRY.datesSize,
    marginLeft: EVENT_ENTRY.datesGap,
    textAlign: 'right',
    color: EVENT_ENTRY.metaColor,
  },
  // Everything under an event's title, indented to the title's start.
  eventBody: { paddingLeft: ENTRY_INDENT },
  eventMeta: {
    fontSize: EVENT_ENTRY.metaSize,
    lineHeight: EVENT_ENTRY.metaLineHeight,
    marginTop: EVENT_ENTRY.metaGap,
    color: EVENT_ENTRY.metaColor,
  },
  eventText: { marginTop: BIBLE_BODY.paragraphGap },
})

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

// The cover: STORY BIBLE, the title between two short rules, the project's
// description in italic and the author, with the counts at the foot.
function CoverPage({ bible }: { bible: StoryBible }) {
  const counts = coverSummary(bible)
  return (
    <Page size="A4" style={pageStyle}>
      <View style={[styles.coverBlock, { marginTop: LAYOUT.textHeight * BIBLE_COVER.top }]}>
        <View style={styles.coverRule} />
        <Text style={styles.coverTitle}>{bible.title}</Text>
        <View style={styles.coverRule} />
        <Text style={styles.coverLabel}>Story Bible</Text>
        {bible.description && <Text style={styles.coverDescription}>{bible.description}</Text>}
        {bible.author && <Text style={styles.coverAuthor}>{bible.author}</Text>}
      </View>
      {counts && <Text style={styles.coverCounts}>{counts}</Text>}
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

// A character: the swatch, name and role, then, indented to the name, the
// description, notes and relationships (two columns: who, and what they
// are). One with none of those is a single, smaller line.
function CharacterEntryView({ c, first, keepTogether }: { c: CharacterEntry; first: boolean; keepTogether: boolean }) {
  if (!hasDetails(c)) {
    return (
      <Entry first={first} keepTogether>
        <NameLine color={c.color} name={c.name} detail={c.role} slim />
      </Entry>
    )
  }
  return (
    <Entry first={first} keepTogether={keepTogether}>
      <NameLine color={c.color} name={c.name} detail={c.role} marginBottom={ENTRY_NAME.gap} />
      <View style={styles.entryBody}>
        <Paragraphs items={c.description} />
        {c.notes.length > 0 && (
          <>
            <FieldLabel>Notes</FieldLabel>
            <Paragraphs items={c.notes} />
          </>
        )}
        {c.relationships.length > 0 && (
          <View>
            <FieldLabel>Relationships</FieldLabel>
            {c.relationships.map((r, i) => (
              <View key={i} style={styles.relationRow} wrap={false}>
                <Text style={styles.relationName}>{r.name}</Text>
                <Text style={styles.relation}>{r.relation}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Entry>
  )
}

// A place: its image across the page (with more room above it than other
// entries get, after a rule), then as a caption the swatch, name and type,
// and the description and notes as caption text, indented to the name. One
// with none of those is a single, smaller line.
async function placeEntry(p: PlaceEntry, first: boolean, keepTogether: boolean, key: number) {
  if (!placeHasDetails(p)) {
    return (
      <Entry key={key} first={first} keepTogether>
        <NameLine color={p.color} name={p.name} detail={p.type} slim />
      </Entry>
    )
  }
  return (
    <Entry key={key} first={first} keepTogether={keepTogether}>
      {/* react-pdf's Image (a PDF primitive), which has no alt. */}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      {p.cover && <Image src={p.cover} style={first ? COVER_IMAGE : [COVER_IMAGE, styles.coverSpaced]} />}
      <NameLine color={p.color} name={p.name} detail={p.type} marginBottom={ENTRY_NAME.gap} />
      <View style={styles.placeText}>
        {p.description.length > 0 && (await renderBlocks(p.description, { layout: PLACE_LAYOUT }))}
        {p.notes.length > 0 && (
          <>
            <FieldLabel>Notes</FieldLabel>
            {await renderBlocks(p.notes, { layout: PLACE_LAYOUT })}
          </>
        )}
      </View>
    </Entry>
  )
}

// An event: the swatch (its colour, else its layer's) and title, with the
// dates at the right in a column datesWidth wide; under it, indented to the
// title, a plain line of its status, layer, who and where, then the
// description and notes.
function EventEntryView({ e, keepTogether, datesWidth }: { e: EventEntry; keepTogether: boolean; datesWidth: number }) {
  const meta = eventMeta(e)
  return (
    <View style={styles.event} wrap={!keepTogether}>
      <View style={styles.eventTitleRow}>
        <Swatch color={e.color} fontSize={EVENT_ENTRY.titleSize} lineHeight={EVENT_ENTRY.titleLineHeight} />
        <Text style={styles.eventTitle}>{e.title}</Text>
        {e.dates && <Text style={[styles.eventDates, { width: datesWidth }]}>{e.dates}</Text>}
      </View>
      <View style={styles.eventBody}>
        {meta && <Text style={styles.eventMeta}>{meta}</Text>}
        {(e.description.length > 0 || e.notes.length > 0) && (
          <View style={styles.eventText}>
            <Paragraphs items={e.description} />
            {e.notes.length > 0 && (
              <>
                <FieldLabel>Notes</FieldLabel>
                <Paragraphs items={e.notes} />
              </>
            )}
          </View>
        )}
      </View>
    </View>
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
    <CoverPage key="cover" bible={bible} />,
    <ContentsPage key="contents" bible={bible} pages={pageNumbers} />,
  ]

  if (bible.characters) {
    const { entries, familyTrees } = bible.characters
    // An entry that fits in BIBLE_ENTRY.keepTogetherShare of a page stays in
    // one piece.
    const keep = await Promise.all(
      entries.map(async (c) =>
        hasDetails(c) ? keepEntryTogether(await characterEntryHeight(c, LAYOUT.textWidth), LAYOUT.textHeight) : true
      )
    )
    pages.push(
      <Section key="characters" bible={bible} section="characters" pages={pageNumbers}>
        {entries.map((c, i) => (
          <CharacterEntryView key={i} c={c} first={i === 0} keepTogether={keep[i]} />
        ))}
        {/* A group heading goes inside its first entry, so it stays with it
            (minPresenceAhead only holds for the Text that follows it). */}
        {familyTrees.length > 0 && (
          <View>
            {familyTrees.map((tree, i) => (
              <View key={i} style={styles.familyTree}>
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
                    {tree.relationships.map((text, j) => (
                      <Text key={j} style={styles.bodyLine}>
                        {text}
                      </Text>
                    ))}
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
    // Kept in one piece as characters are.
    const entries = await Promise.all(
      bible.places.map(async (p, i) =>
        placeEntry(
          p,
          i === 0,
          placeHasDetails(p) && keepEntryTogether(await placeEntryHeight(p, LAYOUT.textWidth), LAYOUT.textHeight),
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
    // Each event's keep-together choice (as characters) and dates column.
    const layouts = await Promise.all(
      bible.timeline.map((group) =>
        Promise.all(
          group.events.map(async (e) => ({
            keep: keepEntryTogether(await eventEntryHeight(e, LAYOUT.textWidth), LAYOUT.textHeight),
            datesWidth: e.dates ? await eventDatesWidth(e.dates) : 0,
          }))
        )
      )
    )
    pages.push(
      <Section key="timeline" bible={bible} section="timeline" pages={pageNumbers}>
        {bible.timeline.map((group, gi) => {
          const events = group.events.map((e, ei) => (
            <EventEntryView key={ei} e={e} keepTogether={layouts[gi][ei].keep} datesWidth={layouts[gi][ei].datesWidth} />
          ))
          // The heading goes in one View with the first event, which keeps the
          // two together when that event is kept in one piece (minPresenceAhead
          // only holds for a Text after it).
          return (
            <View key={gi} style={gi > 0 ? { marginTop: EVENT_GROUP.before } : undefined}>
              <View wrap={!layouts[gi][0].keep}>
                <View style={styles.groupHeading}>
                  <Text id={timelineGroupAnchor(gi)} style={styles.groupTitle}>
                    {group.heading}
                  </Text>
                  <Text style={styles.groupCount}>{eventCount(group)}</Text>
                </View>
                <PageMarker anchor={timelineGroupAnchor(gi)} pages={pageNumbers} />
                {events[0]}
              </View>
              {events.slice(1)}
            </View>
          )
        })}
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

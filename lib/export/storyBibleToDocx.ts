import {
  AlignmentType,
  Document,
  Footer,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  BorderStyle,
  LineRuleType,
  Bookmark,
  InternalHyperlink,
  Tab,
  TabStopType,
  type FileChild,
  type IParagraphOptions,
  type ISectionOptions,
  type IStylesOptions,
} from 'docx'
import {
  blocksToParagraphs,
  docxColor,
  marginLineTwips,
  pageNumberFooter,
  printHeadingStyles,
  printPage,
  runningHeader,
  twips,
  type DocxLayout,
} from './outlineToDocx'
import { SERVER_FONTS_DIR } from './outlineToPdf'
import { registerPdfFonts } from './pdfFonts'
import { DEFAULT_DOCUMENT_FONT } from '../documentFonts'
import { MANUSCRIPT_PAGES } from './manuscriptLayout'
import {
  BIBLE_BODY,
  BIBLE_COVER,
  BIBLE_ENTRY,
  CONTENTS,
  ENTRY_INDENT,
  ENTRY_NAME,
  EVENT_ENTRY,
  EVENT_GROUP,
  MUTED_COLOR,
  PLACE_ENTRY,
  RELATIONS,
  SECTION_TITLE,
} from './printTypography'
import {
  ENTRY_TEXT_INDENT,
  coverOptions,
  entryParagraphs,
  fieldLabel,
  hangingName,
  rightTab,
  ruleParagraph,
  smallCapsRuns,
  swatchRuns,
} from './storyBibleDocxParts'
import {
  PLACE_TEXT,
  characterEntryHeight,
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

// Set as storyBibleToPdf sets the PDF: a cover, the contents, then each
// section as its own Word section (so it gets its own running header),
// opening with its title (Heading 1) and count line. Entries have no boxes: a
// square swatch before the name, labels in small capitals, characters and
// places divided by hairline rules, events as lines under each chapter.
// Character and place names, the family trees' heading and timeline chapters
// are Heading 2, family trees and event titles Heading 3, so they're in
// Word's navigation pane. Rich-text headings were already shifted by
// buildStoryBible to sit one level below their container (H3+ in places).

// The PDF's A4 page, the header and page number centred in its margins.
const PAGE = printPage('a4')
const EDGE = marginLineTwips(MANUSCRIPT_PAGES.a4.marginY)
const PAGE_PROPS = { size: PAGE.size, margin: { ...PAGE.margin, header: EDGE, footer: EDGE } }
// The cover's counts line sits in its footer, as far up from the page's
// edge as the PDF's.
const COVER_PAGE_PROPS = {
  ...PAGE_PROPS,
  margin: { ...PAGE_PROPS.margin, footer: twips(MANUSCRIPT_PAGES.a4.marginY + BIBLE_COVER.countsBottom - BIBLE_COVER.countsSize) },
}
// The text width in points, for the entry estimates (storyBibleMeasure).
const TEXT_WIDTH_PT = PAGE.textWidthTwips / twips(1)
// The width of what follows a name, indented past its swatch.
const INNER_WIDTH_PT = TEXT_WIDTH_PT - ENTRY_INDENT

// A place's description and notes: the place text style, indented, laid out
// at the indented width (in px).
const PLACE_TEXT_STYLE = 'PlaceText'
const PLACE_LAYOUT: DocxLayout = {
  textWidth: Math.floor((INNER_WIDTH_PT * 96) / 72),
  book: false,
  style: PLACE_TEXT_STYLE,
  indentLeft: twips(ENTRY_INDENT),
}

const GAP = twips(BIBLE_BODY.paragraphGap)

// Literata at the story bible's body size, lines at least BIBLE_BODY's
// height (as in the Book DOCX, so nothing is clipped), black headings,
// section titles over a hairline rule, and the places' caption text.
const STYLES: IStylesOptions = {
  default: {
    document: {
      run: { font: DEFAULT_DOCUMENT_FONT, size: BIBLE_BODY.fontSize * 2 },
      paragraph: {
        spacing: {
          line: twips(BIBLE_BODY.fontSize * BIBLE_BODY.lineHeight),
          lineRule: LineRuleType.AT_LEAST,
          after: GAP,
        },
      },
    },
    heading1: {
      run: { size: SECTION_TITLE.size * 2, bold: true, color: '000000' },
      paragraph: {
        spacing: { before: 0, after: 0 },
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: SECTION_TITLE.ruleWidth * 8,
            color: docxColor(SECTION_TITLE.ruleColor),
            space: SECTION_TITLE.ruleGap,
          },
        },
        keepNext: true,
      },
    },
    ...printHeadingStyles(),
  },
  paragraphStyles: [
    {
      id: PLACE_TEXT_STYLE,
      name: 'Place text',
      basedOn: 'Normal',
      next: PLACE_TEXT_STYLE,
      run: { size: PLACE_TEXT.fontSize * 2, color: docxColor(PLACE_ENTRY.textColor) },
      paragraph: {
        spacing: {
          line: twips(PLACE_TEXT.fontSize * PLACE_TEXT.lineHeight),
          lineRule: LineRuleType.AT_LEAST,
          after: twips(PLACE_TEXT.paragraphGap),
        },
      },
    },
  ],
}

// anchor: a bookmark around the heading's text, for the contents to link to.
function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel], anchor?: string) {
  const run = new TextRun({ text })
  return new Paragraph({ heading: level, children: [anchor ? new Bookmark({ id: anchor, children: [run] }) : run] })
}

// Body text after a name, indented to it.
const indented = (text: string): IParagraphOptions => ({ indent: ENTRY_TEXT_INDENT, children: [new TextRun({ text })] })

// A centred hairline BIBLE_COVER.ruleLength wide: an empty, tiny line with a
// rule under it.
function coverRule(before: number): Paragraph {
  const side = twips((TEXT_WIDTH_PT - BIBLE_COVER.ruleLength) / 2)
  return new Paragraph({
    indent: { left: side, right: side },
    spacing: { before: twips(before), after: 0, line: 20, lineRule: LineRuleType.EXACT },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: BIBLE_COVER.ruleWidth * 8, color: docxColor(BIBLE_COVER.ruleColor), space: 0 },
    },
    children: [new TextRun({ text: '', size: 2 })],
  })
}

// The cover, as in the PDF: the title between two short rules, STORY BIBLE,
// the project's description in italic and the author; the counts go in the
// section's footer (coverSection).
function coverParagraphs(bible: StoryBible): Paragraph[] {
  const descriptionSide = twips((TEXT_WIDTH_PT * (1 - BIBLE_COVER.descriptionWidthShare)) / 2)
  return [
    coverRule(PAGE.textHeightPt * BIBLE_COVER.top),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: {
        before: twips(BIBLE_COVER.ruleGap),
        after: twips(BIBLE_COVER.ruleGap),
        line: twips(BIBLE_COVER.titleSize * BIBLE_COVER.titleLineHeight),
        lineRule: LineRuleType.AT_LEAST,
      },
      children: [new TextRun({ text: bible.title, size: BIBLE_COVER.titleSize * 2 })],
    }),
    coverRule(0),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: twips(BIBLE_COVER.ruleGap), after: 0 },
      children: [
        new TextRun({
          text: 'Story Bible',
          allCaps: true,
          size: BIBLE_COVER.labelSize * 2,
          characterSpacing: twips(BIBLE_COVER.labelTracking),
          color: docxColor(BIBLE_COVER.labelColor),
        }),
      ],
    }),
    ...(bible.description
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            indent: { left: descriptionSide, right: descriptionSide },
            spacing: {
              before: twips(BIBLE_COVER.descriptionGap),
              after: 0,
              line: twips(BIBLE_COVER.descriptionSize * BIBLE_COVER.descriptionLineHeight),
              lineRule: LineRuleType.AT_LEAST,
            },
            children: [
              new TextRun({
                text: bible.description,
                italics: true,
                size: BIBLE_COVER.descriptionSize * 2,
                color: docxColor(BIBLE_COVER.descriptionColor),
              }),
            ],
          }),
        ]
      : []),
    ...(bible.author
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: twips(BIBLE_COVER.authorGap), after: 0 },
            children: [
              new TextRun({ text: bible.author, size: BIBLE_COVER.authorSize * 2, color: docxColor(BIBLE_COVER.authorColor) }),
            ],
          }),
        ]
      : []),
  ]
}

function coverSection(bible: StoryBible): ISectionOptions {
  const counts = coverSummary(bible)
  return {
    properties: { page: COVER_PAGE_PROPS },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: counts
              ? [
                  new TextRun({
                    text: counts,
                    allCaps: true,
                    size: BIBLE_COVER.countsSize * 2,
                    characterSpacing: twips(BIBLE_COVER.countsTracking),
                    color: docxColor(BIBLE_COVER.countsColor),
                  }),
                ]
              : [],
          }),
        ],
      }),
    },
    children: coverParagraphs(bible),
  }
}

// A section's opening: its title over the rule, then its count line in small
// capitals, or the empty note when the project has nothing for it (empty:
// true).
function sectionOpening(bible: StoryBible, section: StoryBibleSection): { paragraphs: Paragraph[]; empty: boolean } {
  const summary = sectionSummary(bible, section)
  const title = heading(SECTION_TITLES[section], HeadingLevel.HEADING_1, sectionAnchor(section))
  if (summary === null) {
    return {
      paragraphs: [
        title,
        new Paragraph({
          spacing: { before: twips(SECTION_TITLE.after) },
          children: [new TextRun({ text: SECTION_EMPTY_TEXT[section], italics: true, color: docxColor(MUTED_COLOR) })],
        }),
      ],
      empty: true,
    }
  }
  return {
    paragraphs: [
      title,
      new Paragraph({
        spacing: { before: twips(SECTION_TITLE.countGap), after: twips(SECTION_TITLE.after) },
        children: [...smallCapsRuns(summary)],
      }),
    ],
    empty: false,
  }
}

// An entry's paragraphs, after the rule (ruleParagraph) unless it's the
// section's first.
function ruled(first: boolean, options: IParagraphOptions[]): IParagraphOptions[] {
  return first ? options : [ruleParagraph(), ...options]
}

// A name: a Heading 2 with the swatch hanging before it and the role or type
// after it in small capitals. below: space between it and a rule above it.
// slim: an entry with no details, set a little smaller.
function nameOptions(
  color: string | null,
  name: string,
  detail: string | null,
  { below, slim = false }: { below: number; slim?: boolean }
): IParagraphOptions {
  return {
    heading: HeadingLevel.HEADING_2,
    indent: hangingName,
    spacing: { before: twips(below), after: slim ? 0 : twips(ENTRY_NAME.gap) },
    children: [
      ...swatchRuns(color),
      new TextRun({ text: name, size: (slim ? ENTRY_NAME.slimSize : ENTRY_NAME.size) * 2 }),
      ...(detail ? [new TextRun({ text: '   ' }), ...smallCapsRuns(detail)] : []),
    ],
  }
}

// A character, as in the PDF: the name line, then indented to the name the
// description, notes and relationships (the other character, then at a tab
// what they are, in italic).
async function characterEntry(c: CharacterEntry, first: boolean): Promise<Paragraph[]> {
  const below = first ? 0 : BIBLE_ENTRY.gap
  if (!hasDetails(c)) {
    return entryParagraphs(ruled(first, [nameOptions(c.color, c.name, c.role, { below, slim: true })]), true)
  }
  const columns = relationColumnsAt(INNER_WIDTH_PT)
  const size = RELATIONS.size * 2
  const options = ruled(first, [nameOptions(c.color, c.name, c.role, { below }), ...c.description.map(indented)])
  const labelled: Paragraph[] = []
  if (c.notes.length > 0) labelled.push(fieldLabel('Notes'), ...c.notes.map((n) => new Paragraph(indented(n))))
  if (c.relationships.length > 0) {
    labelled.push(
      fieldLabel('Relationships'),
      ...c.relationships.map(
        (r, i) =>
          new Paragraph({
            indent: ENTRY_TEXT_INDENT,
            keepLines: true,
            keepNext: i < c.relationships.length - 1,
            tabStops: [{ type: TabStopType.LEFT, position: twips(ENTRY_INDENT + columns.name + columns.gap) }],
            spacing: { after: i === c.relationships.length - 1 ? GAP : twips(RELATIONS.rowGap) },
            children: [
              new TextRun({ text: r.name, size }),
              new TextRun({ children: [new Tab()], size }),
              new TextRun({ text: r.relation, size, italics: true, color: docxColor(RELATIONS.relationColor) }),
            ],
          })
      )
    )
  }
  const keepTogether = keepEntryTogether(await characterEntryHeight(c, TEXT_WIDTH_PT), PAGE.textHeightPt)
  return entryParagraphs(options, keepTogether, labelled)
}

async function charactersBody(characters: NonNullable<StoryBible['characters']>): Promise<FileChild[]> {
  const out: FileChild[] = []
  for (const [i, c] of characters.entries.entries()) out.push(...(await characterEntry(c, i === 0)))
  if (characters.familyTrees.length > 0) {
    out.push(heading(FAMILY_TREES_TITLE, HeadingLevel.HEADING_2, FAMILY_TREES_ANCHOR))
    for (const tree of characters.familyTrees) {
      out.push(
        heading(tree.name, HeadingLevel.HEADING_3),
        fieldLabel('Members', false),
        new Paragraph({ children: [new TextRun({ text: tree.members.length > 0 ? tree.members.join(', ') : 'None' })] }),
        ...(tree.relationships.length > 0
          ? [
              fieldLabel('Relationships', false),
              ...tree.relationships.map(
                (text, i) =>
                  new Paragraph({
                    spacing: { after: i === tree.relationships.length - 1 ? GAP : 0 },
                    children: [new TextRun({ text })],
                  })
              ),
            ]
          : [])
      )
    }
  }
  return out
}

// A place, as in the PDF: its image across the page (with more room after
// the rule above it than other entries get), the name line as its caption,
// then the description and notes as indented caption text.
async function placeEntry(p: PlaceEntry, first: boolean): Promise<Paragraph[]> {
  const below = first ? 0 : BIBLE_ENTRY.gap
  if (!placeHasDetails(p)) {
    return entryParagraphs(ruled(first, [nameOptions(p.color, p.name, p.type, { below, slim: true })]), true)
  }
  const cover = p.cover ? await coverOptions(p.cover, TEXT_WIDTH_PT) : null
  const entry: IParagraphOptions[] = cover
    ? [
        // More room between the rule and an image than other entries get.
        { ...cover, spacing: { ...cover.spacing, before: twips(first ? 0 : below + PLACE_ENTRY.coverSpaceAbove) } },
        nameOptions(p.color, p.name, p.type, { below: 0 }),
      ]
    : [nameOptions(p.color, p.name, p.type, { below })]
  const options = ruled(first, entry)
  const rest: Paragraph[] = []
  if (p.description.length > 0) rest.push(...(await blocksToParagraphs(p.description, PLACE_LAYOUT)))
  if (p.notes.length > 0) rest.push(fieldLabel('Notes'), ...(await blocksToParagraphs(p.notes, PLACE_LAYOUT)))
  const keepTogether = keepEntryTogether(await placeEntryHeight(p, TEXT_WIDTH_PT), PAGE.textHeightPt)
  return entryParagraphs(options, keepTogether, rest)
}

async function placesBody(places: NonNullable<StoryBible['places']>): Promise<FileChild[]> {
  const out: FileChild[] = []
  for (const [i, p] of places.entries()) out.push(...(await placeEntry(p, i === 0)))
  return out
}

// A timeline chapter's heading, as in the PDF: a Heading 2 (bookmarked for
// the contents) over a hairline rule, the event count at the right in small
// capitals.
function groupHeading(text: string, count: string, anchor: string, first: boolean): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: first ? 0 : twips(EVENT_GROUP.before), after: twips(EVENT_GROUP.after) },
    tabStops: [rightTab(PAGE.textWidthTwips)],
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: EVENT_GROUP.ruleWidth * 8,
        color: docxColor(EVENT_GROUP.ruleColor),
        space: EVENT_GROUP.ruleGap,
      },
    },
    children: [
      new Bookmark({ id: anchor, children: [new TextRun({ text, size: EVENT_GROUP.size * 2 })] }),
      new TextRun({ children: [new Tab()] }),
      ...smallCapsRuns(count),
    ],
  })
}

// An event, as in the PDF: a Heading 3 with the swatch hanging before the
// title and the dates at a right tab stop (a title too long for the line
// pushes them onto the next), then indented to the title the plain line of
// its status, layer, who and where, and the description and notes.
async function eventEntry(e: EventEntry, first: boolean): Promise<Paragraph[]> {
  const metaColor = docxColor(EVENT_ENTRY.metaColor)
  const meta = eventMeta(e)
  const hasText = e.description.length > 0 || e.notes.length > 0
  const options: IParagraphOptions[] = [
    {
      heading: HeadingLevel.HEADING_3,
      indent: hangingName,
      spacing: { before: first ? 0 : twips(EVENT_ENTRY.gap), after: meta ? 0 : GAP },
      tabStops: [rightTab(PAGE.textWidthTwips)],
      children: [
        ...swatchRuns(e.color),
        new TextRun({ text: e.title, size: EVENT_ENTRY.titleSize * 2 }),
        ...(e.dates
          ? [new TextRun({ children: [new Tab(), e.dates], size: EVENT_ENTRY.datesSize * 2, bold: false, color: metaColor })]
          : []),
      ],
    },
    ...(meta
      ? [
          {
            indent: ENTRY_TEXT_INDENT,
            spacing: {
              before: twips(EVENT_ENTRY.metaGap),
              after: hasText ? GAP : 0,
              line: twips(EVENT_ENTRY.metaSize * EVENT_ENTRY.metaLineHeight),
              lineRule: LineRuleType.AT_LEAST,
            },
            children: [new TextRun({ text: meta, size: EVENT_ENTRY.metaSize * 2, color: metaColor })],
          },
        ]
      : []),
    ...e.description.map(indented),
  ]
  const rest = e.notes.length > 0 ? [fieldLabel('Notes'), ...e.notes.map((n) => new Paragraph(indented(n)))] : []
  const keepTogether = keepEntryTogether(await eventEntryHeight(e, TEXT_WIDTH_PT), PAGE.textHeightPt)
  return entryParagraphs(options, keepTogether, rest)
}

async function timelineBody(timeline: NonNullable<StoryBible['timeline']>): Promise<FileChild[]> {
  const out: FileChild[] = []
  for (const [i, group] of timeline.entries()) {
    out.push(groupHeading(group.heading, eventCount(group), timelineGroupAnchor(i), i === 0))
    for (const [j, e] of group.events.entries()) out.push(...(await eventEntry(e, j === 0)))
  }
  return out
}

// The contents: each entry links to its heading's bookmark. No page numbers:
// Word's own contents field would need updating in Word to show them, and
// other apps may never fill it in.
function contentsParagraphs(bible: StoryBible): Paragraph[] {
  return [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: CONTENTS_TITLE })] }),
    // The first entry sits the usual gap below the title's rule, as a
    // section's count line does.
    ...contentsEntries(bible).map(
      (entry, i) =>
        new Paragraph({
          spacing: {
            before: twips(i === 0 ? SECTION_TITLE.after : entry.level === 1 ? CONTENTS.gap : CONTENTS.subGap),
            after: 0,
          },
          indent: entry.level === 2 ? { left: twips(CONTENTS.subIndent) } : undefined,
          children: [
            new InternalHyperlink({
              anchor: entry.anchor,
              children: [
                new TextRun(
                  entry.level === 1
                    ? { text: entry.title, size: CONTENTS.size * 2 }
                    : { text: entry.title, size: CONTENTS.subSize * 2, color: docxColor(CONTENTS.subColor) }
                ),
              ],
            }),
          ],
        })
    ),
  ]
}

export async function renderStoryBibleToDocx(bible: StoryBible): Promise<Buffer> {
  // The entry estimates measure text with the PDF's fonts, so both formats
  // keep the same entries together.
  registerPdfFonts(SERVER_FONTS_DIR)
  const sections: ISectionOptions[] = [coverSection(bible)]

  const bodies: [StoryBibleSection, () => FileChild[] | Promise<FileChild[]>][] = []
  if (bible.characters) bodies.push(['characters', () => charactersBody(bible.characters!)])
  if (bible.places) bodies.push(['places', () => placesBody(bible.places!)])
  if (bible.timeline) bodies.push(['timeline', () => timelineBody(bible.timeline!)])

  // The contents and each section open on a page with no running header
  // (project · section); every page is numbered, from 1 on the contents.
  sections.push({
    properties: { titlePage: true, page: { ...PAGE_PROPS, pageNumbers: { start: 1 } } },
    headers: { default: runningHeader(`${bible.title} · ${CONTENTS_TITLE}`), first: runningHeader(null) },
    footers: { default: pageNumberFooter(true), first: pageNumberFooter(true) },
    children: contentsParagraphs(bible),
  })

  for (const [section, body] of bodies) {
    const opening = sectionOpening(bible, section)
    sections.push({
      properties: { titlePage: true, page: PAGE_PROPS },
      headers: { default: runningHeader(`${bible.title} · ${SECTION_TITLES[section]}`), first: runningHeader(null) },
      footers: { default: pageNumberFooter(true), first: pageNumberFooter(true) },
      children: [...opening.paragraphs, ...(opening.empty ? [] : await body())],
    })
  }

  const doc = new Document({
    title: `${bible.title} – Story Bible`,
    creator: bible.author ?? undefined,
    styles: STYLES,
    sections,
  })
  return Packer.toBuffer(doc)
}

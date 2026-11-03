import {
  Document,
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
  titlePageParagraphs,
  twips,
  type DocxLayout,
} from './outlineToDocx'
import { SERVER_FONTS_DIR } from './outlineToPdf'
import { registerPdfFonts } from './pdfFonts'
import { DEFAULT_DOCUMENT_FONT } from '../documentFonts'
import { MANUSCRIPT_PAGES } from './manuscriptLayout'
import { BIBLE_BODY, CHARACTER_CARD, CONTENTS, LABEL, META_TEXT, MUTED_COLOR, SECTION_TITLE } from './printTypography'
import { cardColors } from './printColors'
import { card, coverParagraph, fieldLabel, labelRuns } from './storyBibleDocxParts'
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

// Heading scheme: a centred title page, the contents, then each section as
// its own Word section (so it gets its own running header), opening with its
// title (Heading 1) and count line; card names and group headings (family
// trees, timeline chapters) = H2, their entries = H3. Rich-text headings were
// already shifted by buildStoryBible to sit one level below their container
// (H3+ in places).

// The PDF's A4 page, the header and page number centred in its margins.
const PAGE = printPage('a4')
const EDGE = marginLineTwips(MANUSCRIPT_PAGES.a4.marginY)
const PAGE_PROPS = { size: PAGE.size, margin: { ...PAGE.margin, header: EDGE, footer: EDGE } }
// The text width in points, for the card estimates (storyBibleMeasure).
const TEXT_WIDTH_PT = PAGE.textWidthTwips / twips(1)
// The text width inside a card, and rich text laid out at it (in px).
const CARD_WIDTH_PT = cardTextWidth(TEXT_WIDTH_PT)
const CARD_LAYOUT: DocxLayout = { textWidth: Math.floor((CARD_WIDTH_PT * 96) / 72), book: false }

// Literata at the story bible's body size, lines at least BIBLE_BODY's
// height (as in the Book DOCX, so nothing is clipped), black headings, and
// section titles over a hairline rule.
const STYLES: IStylesOptions = {
  default: {
    document: {
      run: { font: DEFAULT_DOCUMENT_FONT, size: BIBLE_BODY.fontSize * 2 },
      paragraph: {
        spacing: {
          line: twips(BIBLE_BODY.fontSize * BIBLE_BODY.lineHeight),
          lineRule: LineRuleType.AT_LEAST,
          after: twips(BIBLE_BODY.paragraphGap),
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
}

// anchor: a bookmark around the heading's text, for the contents to link to.
function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel], anchor?: string) {
  const run = new TextRun({ text })
  return new Paragraph({ heading: level, children: [anchor ? new Bookmark({ id: anchor, children: [run] }) : run] })
}

function plain(text: string) {
  return new Paragraph({ children: [new TextRun({ text })] })
}

function meta(label: string, value: string | null) {
  if (!value) return []
  const run = { size: META_TEXT.size * 2, color: docxColor(META_TEXT.color) }
  return [
    new Paragraph({
      children: [new TextRun({ ...run, text: `${label}: `, bold: true }), new TextRun({ ...run, text: value })],
    }),
  ]
}

function bullets(items: string[]) {
  return items.map((text) => new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text })] }))
}

// A section's opening: its title over the rule, then its count line, or the
// empty note when the project has nothing for it (empty: true).
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
        children: [new TextRun({ text: summary, size: SECTION_TITLE.countSize * 2, color: docxColor(MUTED_COLOR) })],
      }),
    ],
    empty: false,
  }
}

// A slim one-line card, as in the PDF (storyBibleToPdf's SlimCard). The name
// is a Heading 2, as on a full card.
function slimCard(color: string | null, name: string, detail: string | null): FileChild[] {
  const { text } = cardColors(color)
  const paragraph = new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 0, after: twips(BIBLE_BODY.paragraphGap) },
    children: [
      new TextRun({ text: name, size: CHARACTER_CARD.slimNameSize * 2 }),
      ...(detail
        ? [new TextRun({ text: `  ·  ${detail}`, size: CHARACTER_CARD.roleSize * 2, bold: false, color: docxColor(text) })]
        : []),
    ],
  })
  return card(color, [paragraph], { textWidthTwips: PAGE.textWidthTwips, keepTogether: true })
}

// A character's card, as in the PDF (storyBibleToPdf's CharacterCard). The
// name stays a Heading 2, so characters are in Word's navigation pane.
async function characterCard(c: CharacterEntry): Promise<FileChild[]> {
  if (!hasDetails(c)) return slimCard(c.color, c.name, c.role)
  const { text } = cardColors(c.color)
  const gap = twips(BIBLE_BODY.paragraphGap)
  const columns = relationColumns(cardTextWidth(TEXT_WIDTH_PT))
  const rowSize = CHARACTER_CARD.rowSize * 2
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 0, after: c.role ? twips(CHARACTER_CARD.nameGap) : gap },
      children: [new TextRun({ text: c.name })],
    }),
    ...(c.role
      ? [new Paragraph({ children: [new TextRun({ text: c.role, size: CHARACTER_CARD.roleSize * 2, color: docxColor(text) })] })]
      : []),
    ...c.description.map(plain),
    ...(c.notes.length > 0 ? [fieldLabel('Notes'), ...c.notes.map(plain)] : []),
    ...(c.relationships.length > 0 ? [fieldLabel('Relationships')] : []),
    // The other character's name, then at the tab stop what they are to this
    // one.
    ...c.relationships.map(
      (r, i) =>
        new Paragraph({
          tabStops: [{ type: TabStopType.LEFT, position: twips(columns.name + columns.gap) }],
          spacing: { after: i === c.relationships.length - 1 ? gap : twips(CHARACTER_CARD.rowGap) },
          children: [
            new TextRun({ text: r.name, size: rowSize }),
            new TextRun({ children: [new Tab()], size: rowSize }),
            new TextRun({ text: r.relation, size: rowSize, color: docxColor(CHARACTER_CARD.relationColor) }),
          ],
        })
    ),
  ]
  const keepTogether = keepCardTogether(await characterCardHeight(c, TEXT_WIDTH_PT), PAGE.textHeightPt)
  return card(c.color, children, { textWidthTwips: PAGE.textWidthTwips, keepTogether })
}

async function charactersBody(characters: NonNullable<StoryBible['characters']>): Promise<FileChild[]> {
  const out: FileChild[] = []
  for (const c of characters.entries) out.push(...(await characterCard(c)))
  if (characters.familyTrees.length > 0) {
    out.push(heading(FAMILY_TREES_TITLE, HeadingLevel.HEADING_2, FAMILY_TREES_ANCHOR))
    for (const tree of characters.familyTrees) {
      out.push(
        heading(tree.name, HeadingLevel.HEADING_3),
        fieldLabel('Members'),
        plain(tree.members.length > 0 ? tree.members.join(', ') : 'None'),
        ...(tree.relationships.length > 0 ? [fieldLabel('Relationships'), ...bullets(tree.relationships)] : [])
      )
    }
  }
  return out
}

// A place's card, as in the PDF (storyBibleToPdf's placeCard).
async function placeCard(p: PlaceEntry): Promise<FileChild[]> {
  if (!placeHasDetails(p)) return slimCard(p.color, p.name, p.type)
  const cover = p.cover ? await coverParagraph(p.cover, CARD_WIDTH_PT) : null
  const rich = async (label: string, blocks: PlaceEntry['description']) =>
    blocks.length > 0 ? [fieldLabel(label), ...(await blocksToParagraphs(blocks, CARD_LAYOUT))] : []
  const children: Paragraph[] = [
    ...(cover ? [cover] : []),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 0, after: twips(LABEL.gap) },
      children: [new TextRun({ text: p.name })],
    }),
    new Paragraph({ children: labelRuns([{ text: p.type, color: p.color }]) }),
    ...(await rich('Description', p.description)),
    ...(await rich('Notes', p.notes)),
  ]
  const keepTogether = keepCardTogether(await placeCardHeight(p, TEXT_WIDTH_PT), PAGE.textHeightPt)
  return card(p.color, children, { textWidthTwips: PAGE.textWidthTwips, keepTogether })
}

async function placesBody(places: NonNullable<StoryBible['places']>): Promise<FileChild[]> {
  const out: FileChild[] = []
  for (const p of places) out.push(...(await placeCard(p)))
  return out
}

async function timelineBody(timeline: NonNullable<StoryBible['timeline']>): Promise<Paragraph[]> {
  const out: Paragraph[] = []
  for (const [i, group] of timeline.entries()) {
    out.push(heading(group.heading, HeadingLevel.HEADING_2, timelineGroupAnchor(i)))
    for (const e of group.events) {
      out.push(
        heading(e.title, HeadingLevel.HEADING_3),
        ...meta('Layer', e.layer),
        ...meta('Status', e.status),
        ...meta('Dates', e.dates),
        ...meta('Characters', e.characters.join(', ') || null),
        ...meta('Places', e.places.join(', ') || null),
        ...e.description.map(plain)
      )
      if (e.notes.length > 0) {
        out.push(new Paragraph({ children: [new TextRun({ text: 'Notes', bold: true })] }), ...e.notes.map(plain))
      }
    }
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
  // The card estimates measure text with the PDF's fonts, so both formats
  // keep the same cards together.
  registerPdfFonts(SERVER_FONTS_DIR)
  const sections: ISectionOptions[] = [
    { properties: { page: PAGE_PROPS }, children: titlePageParagraphs(bible.title, 'Story Bible', PAGE.textHeightPt, bible.author) },
  ]

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

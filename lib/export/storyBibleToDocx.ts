import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  BorderStyle,
  LineRuleType,
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
} from './outlineToDocx'
import { DEFAULT_DOCUMENT_FONT } from '../documentFonts'
import { MANUSCRIPT_PAGES } from './manuscriptLayout'
import { BIBLE_BODY, META_TEXT, MUTED_COLOR, SECTION_TITLE } from './printTypography'
import type { BlockNode } from './outlineIR'
import {
  SECTION_EMPTY_TEXT,
  SECTION_TITLES,
  sectionSummary,
  type StoryBible,
  type StoryBibleSection,
} from './storyBible'

// Heading scheme: a centred title page, then each section as its own Word
// section (so it gets its own running header), opening with its title
// (Heading 1) and count line; entry = H2, subsection = H3. Rich-text
// headings were already shifted by buildStoryBible to sit one level below
// their container (H4+ in places).

// The PDF's A4 page, the header and page number centred in its margins.
const PAGE = printPage('a4')
const EDGE = marginLineTwips(MANUSCRIPT_PAGES.a4.marginY)
const PAGE_PROPS = { size: PAGE.size, margin: { ...PAGE.margin, header: EDGE, footer: EDGE } }

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

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({ heading: level, children: [new TextRun({ text })] })
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

// Character descriptions are plain textarea strings — one paragraph per line.
function lines(text: string | null) {
  return text ? text.split('\n').filter((l) => l.trim()).map(plain) : []
}

async function richSubsection(title: string, blocks: BlockNode[]) {
  if (blocks.length === 0) return []
  return [heading(title, HeadingLevel.HEADING_3), ...(await blocksToParagraphs(blocks))]
}

// A section's opening: its title over the rule, then its count line, or the
// empty note when the project has nothing for it (empty: true).
function sectionOpening(bible: StoryBible, section: StoryBibleSection): { paragraphs: Paragraph[]; empty: boolean } {
  const summary = sectionSummary(bible, section)
  const title = heading(SECTION_TITLES[section], HeadingLevel.HEADING_1)
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

function charactersBody(characters: NonNullable<StoryBible['characters']>): Paragraph[] {
  const out: Paragraph[] = []
  for (const c of characters.entries) {
    out.push(heading(c.name, HeadingLevel.HEADING_2), ...meta('Role', c.role), ...lines(c.description))
    if (c.relationships.length > 0) {
      out.push(heading('Relationships', HeadingLevel.HEADING_3), ...bullets(c.relationships))
    }
  }
  if (characters.familyTrees.length > 0) {
    out.push(heading('Family Trees', HeadingLevel.HEADING_2))
    for (const tree of characters.familyTrees) {
      out.push(
        heading(tree.name, HeadingLevel.HEADING_3),
        ...meta('Members', tree.members.length > 0 ? tree.members.join(', ') : 'None'),
        ...bullets(tree.relationships)
      )
    }
  }
  return out
}

async function placesBody(places: NonNullable<StoryBible['places']>): Promise<Paragraph[]> {
  const out: Paragraph[] = []
  for (const p of places) {
    out.push(
      heading(p.name, HeadingLevel.HEADING_2),
      ...meta('Type', p.type),
      ...(await richSubsection('Description', p.description)),
      ...(await richSubsection('Notes', p.notes))
    )
  }
  return out
}

async function timelineBody(timeline: NonNullable<StoryBible['timeline']>): Promise<Paragraph[]> {
  const out: Paragraph[] = []
  for (const group of timeline) {
    out.push(heading(group.heading, HeadingLevel.HEADING_2))
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

export async function renderStoryBibleToDocx(bible: StoryBible): Promise<Buffer> {
  const sections: ISectionOptions[] = [
    { properties: { page: PAGE_PROPS }, children: titlePageParagraphs(bible.title, 'Story Bible', PAGE.textHeightPt, bible.author) },
  ]

  const bodies: [StoryBibleSection, () => Paragraph[] | Promise<Paragraph[]>][] = []
  if (bible.characters) bodies.push(['characters', () => charactersBody(bible.characters!)])
  if (bible.places) bodies.push(['places', () => placesBody(bible.places!)])
  if (bible.timeline) bodies.push(['timeline', () => timelineBody(bible.timeline!)])

  // Each section's opening page shows no running header (project · section);
  // every page is numbered, from 1 on the first section.
  for (let i = 0; i < bodies.length; i++) {
    const [section, body] = bodies[i]
    const opening = sectionOpening(bible, section)
    sections.push({
      properties: { titlePage: true, page: { ...PAGE_PROPS, ...(i === 0 ? { pageNumbers: { start: 1 } } : {}) } },
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

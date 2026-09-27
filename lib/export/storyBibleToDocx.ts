import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { blocksToParagraphs } from './outlineToDocx'
import type { BlockNode } from './outlineIR'
import type { StoryBible } from './storyBible'

// Heading scheme: project title = TITLE, section = H1 (new page), entry = H2,
// subsection = H3. Rich-text headings were already shifted by buildStoryBible
// to sit one level below their container (H3+ in chapters, H4+ in places).

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel], pageBreakBefore = false) {
  return new Paragraph({ heading: level, pageBreakBefore, children: [new TextRun({ text })] })
}

function plain(text: string) {
  return new Paragraph({ children: [new TextRun({ text })] })
}

function empty(text: string) {
  return new Paragraph({ children: [new TextRun({ text, italics: true })] })
}

function meta(label: string, value: string | null) {
  if (!value) return []
  return [new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: value })] })]
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

export async function renderStoryBibleToDocx(bible: StoryBible): Promise<Buffer> {
  const children: Paragraph[] = [heading(bible.title, HeadingLevel.TITLE), plain('Story Bible')]

  if (bible.characters) {
    children.push(heading('Characters', HeadingLevel.HEADING_1, true))
    if (bible.characters.entries.length === 0) children.push(empty('No characters yet.'))
    for (const c of bible.characters.entries) {
      children.push(heading(c.name, HeadingLevel.HEADING_2), ...meta('Role', c.role), ...lines(c.description))
      if (c.relationships.length > 0) {
        children.push(heading('Relationships', HeadingLevel.HEADING_3), ...bullets(c.relationships))
      }
    }

    if (bible.characters.familyTrees.length > 0) {
      children.push(heading('Family Trees', HeadingLevel.HEADING_2))
      for (const tree of bible.characters.familyTrees) {
        children.push(
          heading(tree.name, HeadingLevel.HEADING_3),
          ...meta('Members', tree.members.length > 0 ? tree.members.join(', ') : 'None'),
          ...bullets(tree.relationships)
        )
      }
    }
  }

  if (bible.places) {
    children.push(heading('Places', HeadingLevel.HEADING_1, true))
    if (bible.places.length === 0) children.push(empty('No places yet.'))
    for (const p of bible.places) {
      children.push(
        heading(p.name, HeadingLevel.HEADING_2),
        ...meta('Type', p.type),
        ...(await richSubsection('Description', p.description)),
        ...(await richSubsection('Notes', p.notes))
      )
    }
  }

  if (bible.chapters) {
    children.push(heading('Chapters', HeadingLevel.HEADING_1, true))
    if (bible.chapters.length === 0) children.push(empty('No chapters yet.'))
    for (const ch of bible.chapters) {
      children.push(
        heading(ch.title, HeadingLevel.HEADING_2),
        ...meta('POV', ch.pov),
        ...(await blocksToParagraphs(ch.description))
      )
    }
  }

  if (bible.timeline) {
    children.push(heading('Timeline', HeadingLevel.HEADING_1, true))
    if (bible.timeline.length === 0) children.push(empty('No events yet.'))
    for (const group of bible.timeline) {
      children.push(heading(group.heading, HeadingLevel.HEADING_2))
      for (const e of group.events) {
        children.push(
          heading(e.title, HeadingLevel.HEADING_3),
          ...meta('Layer', e.layer),
          ...meta('Status', e.status),
          ...meta('Dates', e.dates),
          ...meta('Characters', e.characters.join(', ') || null),
          ...meta('Places', e.places.join(', ') || null),
          ...e.description.map(plain)
        )
        if (e.notes.length > 0) {
          children.push(new Paragraph({ children: [new TextRun({ text: 'Notes', bold: true })] }), ...e.notes.map(plain))
        }
      }
    }
  }

  const doc = new Document({ sections: [{ children }] })
  return Packer.toBuffer(doc)
}

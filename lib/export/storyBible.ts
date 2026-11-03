// Format-agnostic story bible model, built once from raw project rows and
// rendered by both storyBibleToDocx and storyBibleToPdf. All ordering,
// grouping, and wording decisions live here so the two renderers can't drift.

import { tiptapToBlocks, type BlockNode } from './outlineIR'
import { htmlToParagraphs } from './htmlToText'
import { PLACE_TYPE_LABELS } from '@/lib/places.config'
import { byPosition } from '@/lib/eventOrder'
import type {
  Chapter,
  Character,
  CharacterRelationship,
  Event,
  FamilyTree,
  FamilyTreeMember,
  Layer,
  Place,
  RelationshipType,
  Status,
} from '@/types/database'

export const STORY_BIBLE_SECTIONS = ['characters', 'places', 'timeline'] as const
export type StoryBibleSection = (typeof STORY_BIBLE_SECTIONS)[number]

// One of a character's relationships, from their side: the other character,
// and what they are to this one ("Parent"), or a sentence when a custom
// one-way label has no word for the other way round.
export interface CharacterRelation {
  name: string
  relation: string
}

// description and notes: plain textarea text, one paragraph per line.
export interface CharacterEntry {
  name: string
  color: string | null
  role: string | null
  description: string[]
  notes: string[]
  relationships: CharacterRelation[]
}

// Nothing but a name (and maybe a role): shown as a slim card.
export function hasDetails(c: CharacterEntry): boolean {
  return c.description.length > 0 || c.notes.length > 0 || c.relationships.length > 0
}

export interface FamilyTreeEntry {
  name: string
  members: string[]
  relationships: string[]
}

// cover: the place's image, cropped to 16:9 for print (prepareImage), as a
// URL the renderers can fetch; null when it has none or it couldn't be used.
export interface PlaceEntry {
  name: string
  color: string | null
  type: string
  cover: string | null
  description: BlockNode[]
  notes: BlockNode[]
}

// Nothing but a name and type: shown as a slim card.
export function placeHasDetails(p: PlaceEntry): boolean {
  return p.cover !== null || p.description.length > 0 || p.notes.length > 0
}

export interface EventEntry {
  title: string
  layer: string | null
  status: string | null
  dates: string | null
  characters: string[]
  places: string[]
  description: string[]
  notes: string[]
}

// unassigned: the group of events in no chapter (always last).
export interface TimelineGroup {
  heading: string
  events: EventEntry[]
  unassigned?: boolean
}

// A null section means it was deselected in the export dialog (omitted
// entirely); an empty array means it was selected but the project has none.
// author: the title page's byline (the profile's name), when there is one.
export interface StoryBible {
  title: string
  author: string | null
  characters: { entries: CharacterEntry[]; familyTrees: FamilyTreeEntry[] } | null
  places: PlaceEntry[] | null
  timeline: TimelineGroup[] | null
}

export interface StoryBibleInput {
  projectTitle: string
  author: string | null
  sections: Set<StoryBibleSection>
  characters: Character[]
  relationships: CharacterRelationship[]
  familyTrees: FamilyTree[]
  familyTreeMembers: FamilyTreeMember[]
  places: Place[]
  // Prepared cover URLs by place id (actions/export), for the places that
  // have a usable one.
  placeCovers: Map<string, string>
  chapters: Chapter[]
  events: Event[]
  layers: Layer[]
  statuses: Status[]
  eventCharacters: { event_id: string; character_id: string }[]
  eventPlaces: { event_id: string; place_id: string }[]
}

// Mirrors RELATIONSHIP_TYPES in RelationshipModal.tsx.
const SYMMETRIC_TYPES = new Set<RelationshipType>(['sibling', 'spouse', 'friend', 'enemy', 'rival', 'other'])

// Same sentence shapes as RelationshipModal's direction hint. Two cases the
// hint never has to handle get a fallback: a custom label can't be safely
// pluralized by appending "s", and the bare "other" type reads as "are others".
function relationshipSentence(rel: CharacterRelationship, nameById: Map<string, string>): string | null {
  const source = nameById.get(rel.source_character_id)
  const target = nameById.get(rel.target_character_id)
  if (!source || !target) return null
  const label = rel.relationship_label?.trim() || null

  if (SYMMETRIC_TYPES.has(rel.relationship_type)) {
    if (label) return `${source} and ${target}: ${label}.`
    if (rel.relationship_type === 'other') return `${source} and ${target} are related.`
    return `${source} and ${target} are ${rel.relationship_type}s.`
  }
  return `${source} is the ${label ?? rel.relationship_type} of ${target}.`
}

// RelationshipModal's labels for the built-in types, and what the two
// one-way types are called from the other end. "other" alone reads as
// "Related".
const TYPE_LABELS: Record<RelationshipType, string> = {
  parent: 'Parent',
  sibling: 'Sibling',
  spouse: 'Spouse',
  friend: 'Friend',
  enemy: 'Enemy',
  mentor: 'Mentor',
  rival: 'Rival',
  other: 'Related',
}
const INVERSE_LABELS: Partial<Record<RelationshipType, string>> = { parent: 'Child', mentor: 'Student' }

// A relationship as seen from characterId's side: the other character and
// what they are to this one. For a one-way relationship this character is
// the source of ("this is the mentor of other"), the built-in types have a
// word for the other end (other is their Student); a custom label doesn't,
// so it reads as a sentence ("Ilsa is their guardian").
function relationFor(
  rel: CharacterRelationship,
  characterId: string,
  nameById: Map<string, string>
): CharacterRelation | null {
  const isSource = rel.source_character_id === characterId
  const self = nameById.get(characterId)
  const other = nameById.get(isSource ? rel.target_character_id : rel.source_character_id)
  if (!self || !other) return null
  const label = rel.relationship_label?.trim() || null

  if (SYMMETRIC_TYPES.has(rel.relationship_type) || !isSource) {
    // A custom label starts with a capital, as the built-in ones do.
    return { name: other, relation: label ? label[0].toUpperCase() + label.slice(1) : TYPE_LABELS[rel.relationship_type] }
  }
  const inverse = label ? null : INVERSE_LABELS[rel.relationship_type]
  return { name: other, relation: inverse ?? `${self} is their ${label ?? rel.relationship_type}` }
}

// A textarea's text as paragraphs: one per non-blank line.
function lines(text: string | null): string[] {
  return text ? text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : []
}

// Headings a writer typed inside rich text would otherwise render at the same
// level as the export's own headings, so they're pushed down to sit one level
// below whatever heading contains them, capped at H6: place description/notes
// sit in a card under the place's name (H2), so they shift by 2.
const PLACE_HEADING_SHIFT = 2

function shiftHeadings(blocks: BlockNode[], by: number): BlockNode[] {
  return blocks.map((block) => {
    switch (block.type) {
      case 'heading':
        return { ...block, level: Math.min(6, block.level + by) }
      case 'blockquote':
        return { ...block, children: shiftHeadings(block.children, by) }
      case 'bulletList':
      case 'orderedList':
        return { ...block, items: block.items.map((item) => shiftHeadings(item, by)) }
      default:
        return block
    }
  })
}

// True if any block would render something a reader can see: non-whitespace
// text (a hardBreak's '\n' doesn't count), or an image.
function hasVisibleContent(blocks: BlockNode[]): boolean {
  return blocks.some((block) => {
    switch (block.type) {
      case 'heading':
      case 'paragraph':
        return block.runs.some((run) => run.text.trim() !== '')
      case 'blockquote':
        return hasVisibleContent(block.children)
      case 'bulletList':
      case 'orderedList':
        return block.items.some(hasVisibleContent)
      case 'image':
        return true
    }
  })
}

// A blank document (e.g. a single empty paragraph left after clearing a field)
// still walks to an empty paragraph block, which would make the renderers
// print an empty "Description"/"Notes" heading. Content with no visible text
// counts as absent; anything with visible text passes through untouched,
// blank lines included.
function richText(doc: Record<string, unknown> | null | undefined, headingShift: number): BlockNode[] {
  if (!doc) return []
  const blocks = tiptapToBlocks(doc)
  return hasVisibleContent(blocks) ? shiftHeadings(blocks, headingShift) : []
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)

export function buildStoryBible(input: StoryBibleInput): StoryBible {
  const characterNameById = new Map(input.characters.map((c) => [c.id, c.name]))
  const sortedChapters = [...input.chapters].sort((a, b) => a.position - b.position)

  let characters: StoryBible['characters'] = null
  if (input.sections.has('characters')) {
    const entries = [...input.characters].sort(byName).map((c) => ({
      name: c.name,
      color: c.color,
      role: c.role?.trim() || null,
      description: lines(c.description),
      notes: lines(c.notes),
      relationships: input.relationships
        .filter((r) => r.source_character_id === c.id || r.target_character_id === c.id)
        .map((r) => relationFor(r, c.id, characterNameById))
        .filter((r): r is CharacterRelation => r !== null)
        .sort((a, b) => a.name.localeCompare(b.name) || a.relation.localeCompare(b.relation)),
    }))

    const familyTrees = [...input.familyTrees]
      .sort((a, b) => a.position - b.position)
      .map((tree) => {
        const memberIds = new Set(
          input.familyTreeMembers.filter((m) => m.tree_id === tree.id).map((m) => m.character_id)
        )
        return {
          name: tree.name,
          members: [...memberIds]
            .map((id) => characterNameById.get(id))
            .filter((n): n is string => !!n)
            .sort((a, b) => a.localeCompare(b)),
          // Same rule the canvas uses to draw a line: both ends are members.
          relationships: input.relationships
            .filter((r) => memberIds.has(r.source_character_id) && memberIds.has(r.target_character_id))
            .map((r) => relationshipSentence(r, characterNameById))
            .filter((s): s is string => s !== null),
        }
      })

    characters = { entries, familyTrees }
  }

  const places = input.sections.has('places')
    ? [...input.places].sort(byName).map((p) => ({
        name: p.name,
        color: p.color,
        type: PLACE_TYPE_LABELS[p.type] ?? p.type,
        cover: input.placeCovers.get(p.id) ?? null,
        description: richText(p.description, PLACE_HEADING_SHIFT),
        notes: richText(p.notes, PLACE_HEADING_SHIFT),
      }))
    : null

  let timeline: StoryBible['timeline'] = null
  if (input.sections.has('timeline')) {
    const layerNameById = new Map(input.layers.map((l) => [l.id, l.name]))
    const statusNameById = new Map(input.statuses.map((s) => [s.id, s.name]))
    const placeNameById = new Map(input.places.map((p) => [p.id, p.name]))

    const namesFor = <T extends { event_id: string }>(
      links: T[],
      eventId: string,
      pick: (link: T) => string | undefined
    ) =>
      links
        .filter((l) => l.event_id === eventId)
        .map(pick)
        .filter((n): n is string => !!n)
        .sort((a, b) => a.localeCompare(b))

    const toEntry = (e: Event): EventEntry => ({
      title: e.title,
      layer: layerNameById.get(e.layer_id) ?? null,
      status: statusNameById.get(e.status_id) ?? null,
      dates:
        e.start_date && e.end_date && e.end_date !== e.start_date
          ? `${e.start_date} – ${e.end_date}`
          : (e.start_date ?? e.end_date ?? null),
      characters: namesFor(input.eventCharacters, e.id, (l) => characterNameById.get(l.character_id)),
      places: namesFor(input.eventPlaces, e.id, (l) => placeNameById.get(l.place_id)),
      description: htmlToParagraphs(e.description),
      notes: htmlToParagraphs(e.notes),
    })

    // Same order as the Grid: layers in their row order, then each layer's
    // events in cell order. Event positions only mean something within one
    // layer's cell, so sorting a chapter by position alone interleaves layers.
    const layerPositionById = new Map(input.layers.map((l) => [l.id, l.position]))
    const layerRank = (e: Event) => layerPositionById.get(e.layer_id) ?? Number.MAX_SAFE_INTEGER
    const sortedEvents = [...input.events].sort((a, b) => layerRank(a) - layerRank(b) || byPosition(a, b))
    const chapterIds = new Set(sortedChapters.map((ch) => ch.id))

    timeline = sortedChapters
      .map((ch) => ({
        heading: ch.title,
        events: sortedEvents.filter((e) => e.chapter_id === ch.id).map(toEntry),
      }))
      .filter((group) => group.events.length > 0)

    const unassigned = sortedEvents.filter((e) => !e.chapter_id || !chapterIds.has(e.chapter_id))
    if (unassigned.length > 0) {
      timeline.push({ heading: 'Unassigned', events: unassigned.map(toEntry), unassigned: true })
    }
  }

  return { title: input.projectTitle, author: input.author, characters, places, timeline }
}

// Each section's opening: its title, and what it says when the project has
// nothing for it.
export const SECTION_TITLES: Record<StoryBibleSection, string> = {
  characters: 'Characters',
  places: 'Places',
  timeline: 'Timeline',
}

export const SECTION_EMPTY_TEXT: Record<StoryBibleSection, string> = {
  characters: 'No characters yet.',
  places: 'No places yet.',
  timeline: 'No events yet.',
}

export const FAMILY_TREES_TITLE = 'Family Trees'
export const CONTENTS_TITLE = 'Contents'

// A contents entry and the anchor it links to (a PDF destination, a Word
// bookmark: letters, digits and underscores only). Level 1 is a section,
// level 2 a part of one (the family trees, each timeline chapter).
export interface ContentsEntry {
  anchor: string
  title: string
  level: 1 | 2
}

export const sectionAnchor = (section: StoryBibleSection) => `section_${section}`
export const FAMILY_TREES_ANCHOR = 'family_trees'
export const timelineGroupAnchor = (index: number) => `timeline_${index}`

// Every selected section, then the parts it shows: family trees and timeline
// chapters, which an empty section doesn't have.
export function contentsEntries(bible: StoryBible): ContentsEntry[] {
  const entries: ContentsEntry[] = []
  const add = (section: StoryBibleSection) =>
    entries.push({ anchor: sectionAnchor(section), title: SECTION_TITLES[section], level: 1 })

  if (bible.characters) {
    add('characters')
    if (bible.characters.entries.length > 0 && bible.characters.familyTrees.length > 0) {
      entries.push({ anchor: FAMILY_TREES_ANCHOR, title: FAMILY_TREES_TITLE, level: 2 })
    }
  }
  if (bible.places) add('places')
  if (bible.timeline) {
    add('timeline')
    bible.timeline.forEach((group, i) => entries.push({ anchor: timelineGroupAnchor(i), title: group.heading, level: 2 }))
  }
  return entries
}

function count(n: number, singular: string, plural = `${singular}s`) {
  return `${n} ${n === 1 ? singular : plural}`
}

// The count line under a section's title ("12 characters · 2 family trees"),
// or null for an empty section, which shows SECTION_EMPTY_TEXT instead.
export function sectionSummary(bible: StoryBible, section: StoryBibleSection): string | null {
  switch (section) {
    case 'characters': {
      const n = bible.characters?.entries.length ?? 0
      if (n === 0) return null
      const trees = bible.characters?.familyTrees.length ?? 0
      return trees > 0 ? `${count(n, 'character')} · ${count(trees, 'family tree')}` : count(n, 'character')
    }
    case 'places': {
      const n = bible.places?.length ?? 0
      return n > 0 ? count(n, 'place') : null
    }
    case 'timeline': {
      const groups = bible.timeline ?? []
      const events = groups.reduce((sum, g) => sum + g.events.length, 0)
      if (events === 0) return null
      // Unassigned events aren't in a chapter.
      const chapters = groups.filter((g) => !g.unassigned).length
      return chapters > 0 ? `${count(events, 'event')} across ${count(chapters, 'chapter')}` : count(events, 'event')
    }
  }
}

// Format-agnostic story bible model, built once from raw project rows and
// rendered by both storyBibleToDocx and storyBibleToPdf. All ordering,
// grouping, and wording decisions live here so the two renderers can't drift.

import { tiptapToBlocks, type BlockNode } from './outlineIR'
import { htmlToParagraphs } from './htmlToText'
import { PLACE_TYPE_LABELS } from '@/lib/places.config'
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

export const STORY_BIBLE_SECTIONS = ['characters', 'places', 'chapters', 'timeline'] as const
export type StoryBibleSection = (typeof STORY_BIBLE_SECTIONS)[number]

export interface CharacterEntry {
  name: string
  role: string | null
  description: string | null
  relationships: string[]
}

export interface FamilyTreeEntry {
  name: string
  members: string[]
  relationships: string[]
}

export interface PlaceEntry {
  name: string
  type: string
  description: BlockNode[]
  notes: BlockNode[]
}

export interface ChapterEntry {
  title: string
  pov: string | null
  description: BlockNode[]
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

export interface TimelineGroup {
  heading: string
  events: EventEntry[]
}

// A null section means it was deselected in the export dialog (omitted
// entirely); an empty array means it was selected but the project has none.
export interface StoryBible {
  title: string
  characters: { entries: CharacterEntry[]; familyTrees: FamilyTreeEntry[] } | null
  places: PlaceEntry[] | null
  chapters: ChapterEntry[] | null
  timeline: TimelineGroup[] | null
}

export interface StoryBibleInput {
  projectTitle: string
  sections: Set<StoryBibleSection>
  characters: Character[]
  relationships: CharacterRelationship[]
  familyTrees: FamilyTree[]
  familyTreeMembers: FamilyTreeMember[]
  places: Place[]
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

// Headings a writer typed inside rich text would otherwise render at the same
// level as the export's own headings, so they're pushed down to sit one level
// below whatever heading contains them, capped at H6: chapter descriptions sit
// directly under the entry (H2), so they shift by 2; place description/notes
// sit under an H3 "Description"/"Notes" subheading, so they shift by 3.
const CHAPTER_HEADING_SHIFT = 2
const PLACE_HEADING_SHIFT = 3

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

function richText(doc: Record<string, unknown> | null | undefined, headingShift: number): BlockNode[] {
  return doc ? shiftHeadings(tiptapToBlocks(doc), headingShift) : []
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)

export function buildStoryBible(input: StoryBibleInput): StoryBible {
  const characterNameById = new Map(input.characters.map((c) => [c.id, c.name]))
  const sortedChapters = [...input.chapters].sort((a, b) => a.position - b.position)

  let characters: StoryBible['characters'] = null
  if (input.sections.has('characters')) {
    const entries = [...input.characters].sort(byName).map((c) => ({
      name: c.name,
      role: c.role?.trim() || null,
      description: c.description?.trim() || null,
      relationships: input.relationships
        .filter((r) => r.source_character_id === c.id || r.target_character_id === c.id)
        .map((r) => relationshipSentence(r, characterNameById))
        .filter((s): s is string => s !== null),
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
        type: PLACE_TYPE_LABELS[p.type] ?? p.type,
        description: richText(p.description, PLACE_HEADING_SHIFT),
        notes: richText(p.notes, PLACE_HEADING_SHIFT),
      }))
    : null

  const chapters = input.sections.has('chapters')
    ? sortedChapters.map((ch) => ({
        title: ch.title,
        pov: ch.pov_character_id ? (characterNameById.get(ch.pov_character_id) ?? null) : null,
        description: richText(ch.description, CHAPTER_HEADING_SHIFT),
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

    const sortedEvents = [...input.events].sort((a, b) => a.position - b.position)
    const chapterIds = new Set(sortedChapters.map((ch) => ch.id))

    timeline = sortedChapters
      .map((ch) => ({
        heading: ch.title,
        events: sortedEvents.filter((e) => e.chapter_id === ch.id).map(toEntry),
      }))
      .filter((group) => group.events.length > 0)

    const unassigned = sortedEvents.filter((e) => !e.chapter_id || !chapterIds.has(e.chapter_id))
    if (unassigned.length > 0) timeline.push({ heading: 'Unassigned', events: unassigned.map(toEntry) })
  }

  return { title: input.projectTitle, characters, places, chapters, timeline }
}

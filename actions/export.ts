'use server'

import { createClient } from '@/lib/supabase/server'
import { tiptapToBlocks } from '@/lib/export/outlineIR'
import { renderOutlinesToDocx, type OutlineSection } from '@/lib/export/outlineToDocx'
import { renderOutlinesToPdf } from '@/lib/export/outlineToPdf'
import { buildStoryBible, STORY_BIBLE_SECTIONS, type StoryBibleSection } from '@/lib/export/storyBible'
import { renderStoryBibleToDocx } from '@/lib/export/storyBibleToDocx'
import { renderStoryBibleToPdf } from '@/lib/export/storyBibleToPdf'
import type {
  Chapter,
  Character,
  CharacterRelationship,
  Event,
  FamilyTree,
  FamilyTreeMember,
  Layer,
  Outline,
  Place,
  Status,
} from '@/types/database'

export type ExportOutlinesResult =
  | { base64: string; mimeType: string; filename: string }
  | { error: string }

const MIME_TYPE = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
} as const

// Small enough (text-heavy, no per-project image volume like storyboards
// will have) to return the file directly from the action as base64 rather
// than uploading to Storage for a signed URL — see the manuscript-export
// plan for why that tradeoff flips for image-heavy export types later.
export async function exportOutlines(
  projectId: string,
  outlineIds: string[],
  format: 'docx' | 'pdf'
): Promise<ExportOutlinesResult> {
  if (outlineIds.length === 0) return { error: 'No documents selected' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('outlines')
    .select('*')
    .eq('project_id', projectId)
    .in('id', outlineIds)
    .order('position')

  if (error) return { error: error.message }
  const outlines = (data ?? []) as Outline[]
  if (outlines.length === 0) return { error: 'No documents found' }

  const sections: OutlineSection[] = outlines.map((o) => ({
    title: o.name,
    blocks: tiptapToBlocks(o.content),
  }))

  try {
    const buffer = format === 'docx' ? await renderOutlinesToDocx(sections) : await renderOutlinesToPdf(sections)
    return {
      base64: buffer.toString('base64'),
      mimeType: MIME_TYPE[format],
      filename: `${outlines.length === 1 ? outlines[0].name : 'Outline Export'}.${format}`,
    }
  } catch (err) {
    console.error('Outline export error:', err)
    return { error: 'Failed to generate export' }
  }
}

// Same base64 delivery as exportOutlines: text-heavy, and the only images are
// ones embedded in place/chapter descriptions. Always exports the whole
// project, regardless of any filters active on the Timeline tab.
export async function exportStoryBible(
  projectId: string,
  sections: StoryBibleSection[],
  format: 'docx' | 'pdf'
): Promise<ExportOutlinesResult> {
  const selected = new Set(sections.filter((s) => STORY_BIBLE_SECTIONS.includes(s)))
  if (selected.size === 0) return { error: 'No sections selected' }

  const supabase = await createClient()
  const [
    projectRes,
    charactersRes,
    relationshipsRes,
    treesRes,
    treeMembersRes,
    placesRes,
    chaptersRes,
    eventsRes,
    layersRes,
    statusesRes,
    eventCharactersRes,
    eventPlacesRes,
  ] = await Promise.all([
    supabase.from('projects').select('title').eq('id', projectId).single(),
    supabase.from('characters').select('*').eq('project_id', projectId),
    supabase.from('character_relationships').select('*').eq('project_id', projectId),
    supabase.from('family_trees').select('*').eq('project_id', projectId),
    supabase
      .from('family_tree_members')
      .select('tree_id, character_id, x, y, created_at, family_trees!inner(project_id)')
      .eq('family_trees.project_id', projectId),
    supabase.from('places').select('*').eq('project_id', projectId),
    supabase.from('chapters').select('*').eq('project_id', projectId),
    supabase.from('events').select('*').eq('project_id', projectId),
    supabase.from('layers').select('*').eq('project_id', projectId),
    supabase.from('statuses').select('*').eq('project_id', projectId),
    supabase
      .from('event_characters')
      .select('event_id, character_id, events!inner(project_id)')
      .eq('events.project_id', projectId),
    supabase
      .from('event_places')
      .select('event_id, place_id, events!inner(project_id)')
      .eq('events.project_id', projectId),
  ])

  const failed = [
    projectRes, charactersRes, relationshipsRes, treesRes, treeMembersRes, placesRes,
    chaptersRes, eventsRes, layersRes, statusesRes, eventCharactersRes, eventPlacesRes,
  ].find((res) => res.error)
  if (failed?.error) return { error: failed.error.message }

  const projectTitle = (projectRes.data as { title: string } | null)?.title ?? 'Untitled'

  const bible = buildStoryBible({
    projectTitle,
    sections: selected,
    characters: (charactersRes.data ?? []) as Character[],
    relationships: (relationshipsRes.data ?? []) as CharacterRelationship[],
    familyTrees: (treesRes.data ?? []) as FamilyTree[],
    familyTreeMembers: (treeMembersRes.data ?? []) as FamilyTreeMember[],
    places: (placesRes.data ?? []) as Place[],
    chapters: (chaptersRes.data ?? []) as Chapter[],
    events: (eventsRes.data ?? []) as Event[],
    layers: (layersRes.data ?? []) as Layer[],
    statuses: (statusesRes.data ?? []) as Status[],
    eventCharacters: (eventCharactersRes.data ?? []) as { event_id: string; character_id: string }[],
    eventPlaces: (eventPlacesRes.data ?? []) as { event_id: string; place_id: string }[],
  })

  try {
    const buffer = format === 'docx' ? await renderStoryBibleToDocx(bible) : await renderStoryBibleToPdf(bible)
    return {
      base64: buffer.toString('base64'),
      mimeType: MIME_TYPE[format],
      filename: `${projectTitle} - Story Bible.${format}`,
    }
  } catch (err) {
    console.error('Story bible export error:', err)
    return { error: 'Failed to generate export' }
  }
}

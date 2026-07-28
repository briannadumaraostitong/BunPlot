'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { LAYER_COLORS } from '@/lib/theme.config'
import type {
  Character,
  CharacterRelationship,
  FamilyTree,
  FamilyTreeMember,
  RelationshipType,
} from '@/types/database'

// ── Characters ──────────────────────────────────────────────

export async function getCharacters(projectId: string): Promise<Character[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Get characters error:', error)
    return []
  }
  return (data ?? []) as Character[]
}

export async function createCharacter(projectId: string, name: string) {
  const supabase = await createClient()

  const { count } = await supabase
    .from('characters')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)

  const color = LAYER_COLORS[(count ?? 0) % LAYER_COLORS.length]

  const { data, error } = await supabase
    .from('characters')
    .insert({ project_id: projectId, name, color } as never)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return data as Character
}

export async function updateCharacter(
  id: string,
  projectId: string,
  updates: Partial<{
    name: string
    role: string | null
    color: string
    description: string | null
  }>
) {
  const supabase = await createClient()
  const { error } = await supabase.from('characters').update(updates as never).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteCharacter(
  id: string,
  projectId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()

  const [{ count: asSource }, { count: asTarget }] = await Promise.all([
    supabase
      .from('character_relationships')
      .select('id', { count: 'exact', head: true })
      .eq('source_character_id', id),
    supabase
      .from('character_relationships')
      .select('id', { count: 'exact', head: true })
      .eq('target_character_id', id),
  ])

  if ((asSource ?? 0) > 0 || (asTarget ?? 0) > 0) {
    return { error: 'This character has relationships. Remove those first.' }
  }

  const { error } = await supabase.from('characters').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

// ── Relationships ───────────────────────────────────────────

export async function getRelationships(projectId: string): Promise<CharacterRelationship[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('character_relationships')
    .select('*')
    .eq('project_id', projectId)

  if (error) {
    console.error('Get relationships error:', error)
    return []
  }
  return (data ?? []) as CharacterRelationship[]
}

export async function createRelationship(
  projectId: string,
  sourceCharacterId: string,
  targetCharacterId: string,
  relationshipType: RelationshipType,
  relationshipLabel?: string | null
) {
  if (sourceCharacterId === targetCharacterId) {
    return { error: 'A character cannot have a relationship with themselves.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('character_relationships')
    .insert({
      project_id: projectId,
      source_character_id: sourceCharacterId,
      target_character_id: targetCharacterId,
      relationship_type: relationshipType,
      relationship_label: relationshipLabel || null,
    } as never)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return data as CharacterRelationship
}

export async function deleteRelationship(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('character_relationships').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

// ── Family Trees ────────────────────────────────────────────

export async function getFamilyTrees(projectId: string): Promise<FamilyTree[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('family_trees')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true })

  if (error) {
    console.error('Get family trees error:', error)
    return []
  }

  const trees = (data ?? []) as FamilyTree[]
  if (trees.length > 0) return trees

  const { data: created, error: createError } = await supabase
    .from('family_trees')
    .insert({ project_id: projectId, name: 'Main Family', position: 0 } as never)
    .select()
    .single()

  if (createError) {
    console.error('Create default family tree error:', createError)
    return []
  }

  return [created as FamilyTree]
}

export async function createFamilyTree(projectId: string, name: string) {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('family_trees')
    .select('position')
    .eq('project_id', projectId)
    .order('position', { ascending: false })
    .limit(1)

  const existingTree = existing?.[0] as { position: number } | undefined
  const nextPosition = (existingTree?.position ?? -1) + 1

  const { data, error } = await supabase
    .from('family_trees')
    .insert({ project_id: projectId, name, position: nextPosition } as never)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return data as FamilyTree
}

export async function renameFamilyTree(id: string, projectId: string, name: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('family_trees').update({ name } as never).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteFamilyTree(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('family_trees').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

// ── Family Tree Members ─────────────────────────────────────

export async function getFamilyTreeMembers(treeId: string): Promise<FamilyTreeMember[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('family_tree_members')
    .select('*')
    .eq('tree_id', treeId)

  if (error) {
    console.error('Get family tree members error:', error)
    return []
  }
  return (data ?? []) as FamilyTreeMember[]
}

export async function saveFamilyTreeMemberPosition(
  treeId: string,
  characterId: string,
  x: number,
  y: number
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('family_tree_members')
    .upsert({ tree_id: treeId, character_id: characterId, x, y } as never, {
      onConflict: 'tree_id,character_id',
    })

  if (error) return { error: error.message }
  return { success: true }
}

export async function removeFamilyTreeMember(treeId: string, characterId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('family_tree_members')
    .delete()
    .eq('tree_id', treeId)
    .eq('character_id', characterId)

  if (error) return { error: error.message }
  return { success: true }
}

// ── Event <-> Character links ────────────────────────────────

export interface EventCharacterLink {
  event_id: string
  character_id: string
}

export async function getEventCharacterLinks(projectId: string): Promise<EventCharacterLink[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('event_characters')
    .select('event_id, character_id, events!inner(project_id)')
    .eq('events.project_id', projectId)

  if (error) {
    console.error('Get event character links error:', error)
    return []
  }

  return ((data ?? []) as { event_id: string; character_id: string }[]).map((row) => ({
    event_id: row.event_id,
    character_id: row.character_id,
  }))
}

export async function getCharactersForEvent(eventId: string): Promise<Character[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('event_characters')
    .select('characters(*)')
    .eq('event_id', eventId)

  if (error) {
    console.error('Get characters for event error:', error)
    return []
  }

  return ((data ?? []) as { characters: Character | null }[])
    .map((row) => row.characters)
    .filter((character): character is Character => character !== null)
}

export async function linkEventToCharacter(eventId: string, characterId: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('event_characters')
    .insert({ event_id: eventId, character_id: characterId } as never)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function unlinkEventFromCharacter(eventId: string, characterId: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('event_characters')
    .delete()
    .eq('event_id', eventId)
    .eq('character_id', characterId)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

// ── Suggested characters (via chapter_links) ─────────────────
// Characters that already appear in events within chapters this chapter
// "continues from" — surfaced as one-click suggestions when creating a new
// event, not auto-added.

export async function getSuggestedCharactersForChapter(chapterId: string): Promise<Character[]> {
  const supabase = await createClient()

  const { data: links, error: linksError } = await supabase
    .from('chapter_links')
    .select('continues_from_chapter_id')
    .eq('chapter_id', chapterId)

  if (linksError) {
    console.error('Get chapter links for suggestions error:', linksError)
    return []
  }
  if (!links || links.length === 0) return []

  const sourceChapterIds = (links as { continues_from_chapter_id: string }[]).map(
    (l) => l.continues_from_chapter_id
  )

  const { data, error } = await supabase
    .from('event_characters')
    .select('characters(*), events!inner(chapter_id)')
    .in('events.chapter_id', sourceChapterIds)

  if (error) {
    console.error('Get suggested characters error:', error)
    return []
  }

  const seen = new Map<string, Character>()
  for (const row of (data ?? []) as { characters: Character | null }[]) {
    if (row.characters && !seen.has(row.characters.id)) {
      seen.set(row.characters.id, row.characters)
    }
  }
  return [...seen.values()]
}

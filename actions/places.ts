'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { LAYER_COLORS } from '@/lib/theme.config'
import type { Place, PlaceType } from '@/types/database'

// Cover images live in the private 'attachments' bucket (same bucket Outline
// uses for embedded body images), so reads need a signed URL. Recomputed on
// every getPlaces() call, so a short TTL is fine — unlike Outline's body
// images, which bake a 10-year signed URL directly into saved content because
// that content isn't refetched on every load.
const COVER_SIGNED_URL_TTL = 60 * 60 * 24 // 24h

export interface PlaceWithCover extends Place {
  cover_url: string | null
}

async function withCoverUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  places: Place[]
): Promise<PlaceWithCover[]> {
  return Promise.all(
    places.map(async (place) => {
      if (!place.image_url) return { ...place, cover_url: null }
      const { data } = await supabase.storage
        .from('attachments')
        .createSignedUrl(place.image_url, COVER_SIGNED_URL_TTL)
      return { ...place, cover_url: data?.signedUrl ?? null }
    })
  )
}

// ── Places ──────────────────────────────────────────────────

export async function getPlaces(projectId: string): Promise<PlaceWithCover[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Get places error:', error)
    return []
  }
  return withCoverUrls(supabase, (data ?? []) as Place[])
}

export async function createPlace(projectId: string, name: string) {
  const supabase = await createClient()

  const { count } = await supabase
    .from('places')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)

  const color = LAYER_COLORS[(count ?? 0) % LAYER_COLORS.length]

  const { data, error } = await supabase
    .from('places')
    .insert({ project_id: projectId, name, color } as never)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { ...(data as Place), cover_url: null }
}

export async function updatePlace(
  id: string,
  projectId: string,
  updates: Partial<{
    name: string
    type: PlaceType
    color: string
    description: Record<string, unknown>
    notes: Record<string, unknown>
    image_url: string | null
  }>
) {
  const supabase = await createClient()
  const { error } = await supabase.from('places').update(updates as never).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deletePlace(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('places').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

// ── Event <-> Place links ───────────────────────────────────

export interface EventPlaceLink {
  event_id: string
  place_id: string
}

export async function getEventPlaceLinks(projectId: string): Promise<EventPlaceLink[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('event_places')
    .select('event_id, place_id, events!inner(project_id)')
    .eq('events.project_id', projectId)

  if (error) {
    console.error('Get event place links error:', error)
    return []
  }

  return ((data ?? []) as { event_id: string; place_id: string }[]).map((row) => ({
    event_id: row.event_id,
    place_id: row.place_id,
  }))
}

export async function getPlacesForEvent(eventId: string): Promise<Place[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('event_places')
    .select('places(*)')
    .eq('event_id', eventId)

  if (error) {
    console.error('Get places for event error:', error)
    return []
  }

  return ((data ?? []) as { places: Place | null }[])
    .map((row) => row.places)
    .filter((place): place is Place => place !== null)
}

export async function linkEventToPlace(eventId: string, placeId: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('event_places')
    .insert({ event_id: eventId, place_id: placeId } as never)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function unlinkEventFromPlace(eventId: string, placeId: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('event_places')
    .delete()
    .eq('event_id', eventId)
    .eq('place_id', placeId)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

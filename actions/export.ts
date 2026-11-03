'use server'

import { createClient } from '@/lib/supabase/server'
import { tiptapToBlocks } from '@/lib/export/outlineIR'
import { renderOutlinesToDocx, type OutlineSection } from '@/lib/export/outlineToDocx'
import { renderOutlinesToPdf } from '@/lib/export/outlineToPdf'
import type { BookDetails } from '@/lib/export/manuscriptLayout'
import { DEFAULT_MANUSCRIPT_OPTIONS, type ManuscriptOptions } from '@/lib/export/manuscriptOptions'
import { COVER_SIZE, PLACE_COVER_SIZE, prepareImage } from '@/lib/export/prepareImage'
import { buildStoryBible, STORY_BIBLE_SECTIONS, type StoryBibleSection } from '@/lib/export/storyBible'
import { renderStoryBibleToDocx } from '@/lib/export/storyBibleToDocx'
import { renderStoryBibleToPdf } from '@/lib/export/storyBibleToPdf'
import { DOWNLOAD_CONCURRENCY, forEachWithConcurrency } from '@/lib/export/concurrency'
import type {
  Chapter,
  Character,
  CharacterRelationship,
  Event,
  FamilyTree,
  FamilyTreeMember,
  Layer,
  Outline,
  Panel,
  Place,
  Status,
} from '@/types/database'

// notice: something left out of an otherwise good export (a Book cover, or a
// story bible's place covers, that couldn't be used), to tell the user.
export type ExportOutlinesResult =
  | { base64: string; mimeType: string; filename: string; notice?: string }
  | { error: string }

const COVER_NOTICE = "Couldn't include the cover image, so the book starts at its title page."

// Signed cover URLs only need to outlive the export itself.
const EXPORT_SIGNED_URL_TTL = 60 * 5

const MIME_TYPE = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
} as const

// The signed-in writer's name for a title page: their profile's display name,
// else username, else null.
async function profileAuthor(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', auth.user.id)
    .single()
  const p = profile as { display_name: string | null; username: string | null } | null
  return p?.display_name?.trim() || p?.username?.trim() || null
}

// The Book style's title page: the project's title and cover, and the
// author's name (profileAuthor). A cover that can't be used is left out, with
// a notice.
async function bookDetails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  includeCover: boolean
): Promise<{ details: BookDetails; notice: string | null } | { error: string }> {
  const { data: project, error } = await supabase
    .from('projects')
    .select('title, cover_image_url')
    .eq('id', projectId)
    .single()
  if (error || !project) return { error: error?.message ?? 'Project not found' }
  const { title, cover_image_url } = project as { title: string; cover_image_url: string | null }
  const author = await profileAuthor(supabase)

  let coverUrl: string | null = null
  let notice: string | null = null
  if (includeCover && cover_image_url) {
    const { data } = await supabase.storage.from('attachments').createSignedUrl(cover_image_url, EXPORT_SIGNED_URL_TTL)
    const cover = data?.signedUrl
      ? await prepareImage(data.signedUrl, COVER_SIZE)
      : { error: "Couldn't sign the cover's URL." }
    if ('url' in cover) {
      coverUrl = cover.url
    } else {
      console.error('Book cover left out:', cover.error)
      notice = COVER_NOTICE
    }
  }

  return { details: { projectTitle: title, author, coverUrl }, notice }
}

// The story bible's place covers, cropped to 16:9 for print (prepareImage),
// by place id. A cover that can't be used is left out, and the notice names
// the place (or counts them).
async function placeCovers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  places: Place[]
): Promise<{ covers: Map<string, string>; notice: string | null }> {
  const covers = new Map<string, string>()
  const withCover = places.filter((p): p is Place & { image_url: string } => p.image_url !== null)
  if (withCover.length === 0) return { covers, notice: null }

  // One batch call for every cover, as getStoryboardPanels does.
  const { data } = await supabase.storage
    .from('attachments')
    .createSignedUrls([...new Set(withCover.map((p) => p.image_url))], EXPORT_SIGNED_URL_TTL)
  const urlByPath = new Map(
    (data ?? []).flatMap((entry) => (entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl] as const] : []))
  )

  const failed: string[] = []
  await forEachWithConcurrency(withCover, DOWNLOAD_CONCURRENCY, async (p) => {
    const url = urlByPath.get(p.image_url)
    const cover = url ? await prepareImage(url, PLACE_COVER_SIZE) : { error: "Couldn't sign the cover's URL." }
    if ('url' in cover) {
      covers.set(p.id, cover.url)
    } else {
      console.error(`Place cover left out (${p.id}):`, cover.error)
      failed.push(p.name)
    }
  })

  const notice =
    failed.length === 0
      ? null
      : failed.length === 1
        ? `Couldn't include the cover image for ${failed[0]}, so its card has none.`
        : `Couldn't include the cover images for ${failed.length} places, so their cards have none.`
  return { covers, notice }
}

// Small enough (text-heavy, no per-project image volume like storyboards
// will have) to return the file directly from the action as base64 rather
// than uploading to Storage for a signed URL — see the manuscript-export
// plan for why that tradeoff flips for image-heavy export types later.
// options: the style and page size, for either format.
export async function exportOutlines(
  projectId: string,
  outlineIds: string[],
  format: 'docx' | 'pdf',
  options: ManuscriptOptions = DEFAULT_MANUSCRIPT_OPTIONS
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

  let book: BookDetails | undefined
  let notice: string | null = null
  if (options.style === 'book') {
    const result = await bookDetails(supabase, projectId, options.includeCover)
    if ('error' in result) return result
    book = result.details
    notice = result.notice
  }

  try {
    const render = format === 'docx' ? renderOutlinesToDocx : renderOutlinesToPdf
    const buffer = await render(sections, { style: options.style, pageSize: options.pageSize, book })
    return {
      base64: buffer.toString('base64'),
      mimeType: MIME_TYPE[format],
      filename: `${outlines.length === 1 ? outlines[0].name : 'Outline Export'}.${format}`,
      ...(notice ? { notice } : {}),
    }
  } catch (err) {
    console.error('Outline export error:', err)
    return { error: 'Failed to generate export' }
  }
}

// Same base64 delivery as exportOutlines: text-heavy, and the only images are
// place covers (scaled down for print) and ones embedded in place
// descriptions/notes. Always exports the whole
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
    author,
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
    profileAuthor(supabase),
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
  const places = (placesRes.data ?? []) as Place[]
  const { covers, notice } = selected.has('places')
    ? await placeCovers(supabase, places)
    : { covers: new Map<string, string>(), notice: null }

  const bible = buildStoryBible({
    projectTitle,
    author,
    sections: selected,
    characters: (charactersRes.data ?? []) as Character[],
    relationships: (relationshipsRes.data ?? []) as CharacterRelationship[],
    familyTrees: (treesRes.data ?? []) as FamilyTree[],
    familyTreeMembers: (treeMembersRes.data ?? []) as FamilyTreeMember[],
    places,
    placeCovers: covers,
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
      ...(notice ? { notice } : {}),
    }
  } catch (err) {
    console.error('Story bible export error:', err)
    return { error: 'Failed to generate export' }
  }
}

// Long enough for a big export to download every image from the browser;
// the URLs are only ever handed to that one export run.
const STORYBOARD_SIGNED_URL_TTL = 60 * 60 // 1h

export interface StoryboardPanel {
  id: string
  number: number
  caption: string | null
  // Both null for a panel with no image — kept so the PDF can still show its
  // caption in an empty frame; the ZIP skips it. url alone is null if signing
  // failed, which both exports treat as a failed download.
  path: string | null
  url: string | null
}

export interface StoryboardChapter {
  id: string
  title: string
  panels: StoryboardPanel[]
}

export type StoryboardResult = { projectTitle: string; chapters: StoryboardChapter[] } | { error: string }

// Data only — both files are built in the browser (lib/export/storyboardZip.ts
// and storyboardToPdf.tsx), which fetch each image straight from Storage. Routing the image bytes
// back through this action would hit Vercel's 4.5 MB response cap on any
// storyboard with more than a handful of panels.
export async function getStoryboardPanels(projectId: string, chapterIds: string[]): Promise<StoryboardResult> {
  if (chapterIds.length === 0) return { error: 'No chapters selected' }

  const supabase = await createClient()
  const [projectRes, chaptersRes, panelsRes] = await Promise.all([
    supabase.from('projects').select('title').eq('id', projectId).single(),
    supabase
      .from('chapters')
      .select('id, title, position')
      .eq('project_id', projectId)
      .in('id', chapterIds)
      .order('position'),
    supabase
      .from('panels')
      .select('id, chapter_id, position, image_url, caption')
      .eq('project_id', projectId)
      .in('chapter_id', chapterIds)
      .order('position'),
  ])

  const failed = [projectRes, chaptersRes, panelsRes].find((res) => res.error)
  if (failed?.error) return { error: failed.error.message }

  const chapters = (chaptersRes.data ?? []) as Pick<Chapter, 'id' | 'title' | 'position'>[]
  const panels = (panelsRes.data ?? []) as Pick<Panel, 'id' | 'chapter_id' | 'position' | 'image_url' | 'caption'>[]

  // One batch call for every image, same as withPanelCoverUrls in actions/panels.ts.
  const paths = panels.map((p) => p.image_url).filter((path): path is string => path !== null)
  let urlByPath = new Map<string, string>()
  if (paths.length > 0) {
    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUrls(paths, STORYBOARD_SIGNED_URL_TTL)
    if (error) return { error: error.message }
    urlByPath = new Map(
      (data ?? []).flatMap((entry) => (entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl] as const] : []))
    )
  }

  return {
    projectTitle: (projectRes.data as { title: string } | null)?.title ?? 'Untitled',
    chapters: chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      // Numbered across every panel in the chapter, imageless ones included,
      // so "Panel n" and the file order match the Panels tab even when the
      // ZIP skips panels that have no image.
      panels: panels
        .filter((p) => p.chapter_id === ch.id)
        .map((p, i) => ({
          id: p.id,
          number: i + 1,
          caption: p.caption,
          path: p.image_url,
          url: p.image_url ? (urlByPath.get(p.image_url) ?? null) : null,
        })),
    })),
  }
}

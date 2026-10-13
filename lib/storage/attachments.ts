import type { createClient } from '@/lib/supabase/server'

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

// Storage remove() takes at most ~1000 paths per call; list() pages at the same size.
export const STORAGE_BATCH_SIZE = 1000

// Every file under `prefix` in the attachments bucket, recursing into
// subfolders (list() only returns direct children; folders come back with a
// null id). Throws on a listing error — callers decide whether that's fatal.
export async function listFilesRecursive(supabase: ServerSupabase, prefix: string): Promise<string[]> {
  const paths: string[] = []
  for (let offset = 0; ; offset += STORAGE_BATCH_SIZE) {
    const { data, error } = await supabase.storage
      .from('attachments')
      .list(prefix, { limit: STORAGE_BATCH_SIZE, offset })
    if (error) throw error
    const entries = data ?? []
    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`
      if (entry.id === null) paths.push(...(await listFilesRecursive(supabase, path)))
      else paths.push(path)
    }
    if (entries.length < STORAGE_BATCH_SIZE) break
  }
  return paths
}

// Removes `paths` from the attachments bucket in remove()-sized batches.
// Errors are logged, never thrown: these run as cleanup after a delete that
// already happened.
export async function removeInBatches(supabase: ServerSupabase, paths: string[], label: string) {
  for (let i = 0; i < paths.length; i += STORAGE_BATCH_SIZE) {
    const { error } = await supabase.storage
      .from('attachments')
      .remove(paths.slice(i, i + STORAGE_BATCH_SIZE))
    if (error) console.error(`${label} file cleanup error:`, error)
  }
}

const SIGNED_URL_MARKER = '/storage/v1/object/sign/attachments/'

// The attachments object path inside a signed URL from createSignedUrl
// (…/storage/v1/object/sign/attachments/{path}?token=…), as embedded in
// rich-text image nodes. Null for anything else (external images, bad URLs).
export function attachmentPathFromSignedUrl(src: string): string | null {
  let url: URL
  try {
    url = new URL(src)
  } catch {
    return null
  }
  const i = url.pathname.indexOf(SIGNED_URL_MARKER)
  if (i === -1) return null
  try {
    return decodeURIComponent(url.pathname.slice(i + SIGNED_URL_MARKER.length)) || null
  } catch {
    return null
  }
}

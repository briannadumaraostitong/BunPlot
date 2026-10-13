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

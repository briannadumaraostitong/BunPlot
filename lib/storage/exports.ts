import type { createClient } from '@/lib/supabase/server'
import { STORAGE_BATCH_SIZE, removeInBatches } from './attachments'

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

// Finished manuscript and story bible files, kept only while the browser
// downloads them: a function's response can't be larger than Vercel's 4.5 MB,
// so the file goes through Storage instead and the action returns a signed
// URL. They have their own private bucket, limited to PDF and DOCX at 50 MB,
// so the attachments bucket can stay limited to images. Paths keep the
// attachments layout, exports/<project_id>/<uuid>.<ext>, and so do the
// bucket's policies (supabase/schema.sql).
export const EXPORTS_BUCKET = 'exports'
export const EXPORTS_FOLDER = 'exports'

// The exports bucket's file size limit (and the free plan's maximum). Checked
// here first so an oversized export gets a clear message.
const EXPORT_MAX_BYTES = 50 * 1024 * 1024

// Long enough for a slow connection to download a large file.
const EXPORT_URL_TTL = 60 * 10
// An export still stored after this long was never discarded (a closed tab,
// a failed delete), well past its URL's expiry.
const LEFTOVER_AGE_MS = 60 * 60 * 1000

export interface StoredExport {
  url: string
  path: string
}

// Removes this project's exports older than LEFTOVER_AGE_MS. Errors are
// logged, never thrown: a leftover file mustn't stop a new export.
async function removeLeftoverExports(supabase: ServerSupabase, projectId: string) {
  const prefix = `${EXPORTS_FOLDER}/${projectId}`
  const { data, error } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .list(prefix, { limit: STORAGE_BATCH_SIZE, sortBy: { column: 'created_at', order: 'asc' } })
  if (error) {
    console.error('Export cleanup listing error:', error)
    return
  }
  const cutoff = Date.now() - LEFTOVER_AGE_MS
  const old = (data ?? []).filter((f) => f.id !== null && f.created_at && Date.parse(f.created_at) < cutoff)
  await removeInBatches(supabase, old.map((f) => `${prefix}/${f.name}`), 'Export', EXPORTS_BUCKET)
}

// Uploads a finished export under a random name and signs it, first clearing
// out any of the project's old ones. A file that can't be signed is removed
// again.
export async function storeExport(
  supabase: ServerSupabase,
  projectId: string,
  data: Buffer,
  mimeType: string,
  extension: string
): Promise<StoredExport | { error: string }> {
  if (data.length > EXPORT_MAX_BYTES) {
    console.error('Export too large:', data.length)
    return { error: 'This export is larger than 50 MB, too large to download. Try exporting fewer documents or smaller images.' }
  }
  await removeLeftoverExports(supabase, projectId)
  const path = `${EXPORTS_FOLDER}/${projectId}/${crypto.randomUUID()}.${extension}`
  const storage = supabase.storage.from(EXPORTS_BUCKET)
  const { error: uploadError } = await storage.upload(path, data, { contentType: mimeType })
  if (uploadError) {
    console.error('Export upload error:', uploadError)
    return { error: "Couldn't prepare the file for download." }
  }
  const { data: signed, error: signError } = await storage.createSignedUrl(path, EXPORT_URL_TTL)
  if (signError || !signed) {
    console.error('Export signing error:', signError)
    await storage.remove([path])
    return { error: "Couldn't prepare the file for download." }
  }
  return { url: signed.signedUrl, path }
}

// Whether path is one of this project's exports (and nothing else, so the
// discard action can't be pointed at other files).
export function isExportPath(projectId: string, path: string): boolean {
  const name = path.slice(`${EXPORTS_FOLDER}/${projectId}/`.length)
  return path.startsWith(`${EXPORTS_FOLDER}/${projectId}/`) && /^[\w-]+\.(pdf|docx)$/.test(name)
}

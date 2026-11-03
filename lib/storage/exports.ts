import type { createClient } from '@/lib/supabase/server'

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

// Finished manuscript and story bible files, kept in the attachments bucket
// only while the browser downloads them: a function's response can't be
// larger than Vercel's 4.5 MB, so the file goes through Storage instead and
// the action returns a signed URL. The attachments policies already cover
// exports/<project_id>/…, as they do every other folder.
const EXPORTS_FOLDER = 'exports'

// Long enough for a slow connection to download a large file.
const EXPORT_URL_TTL = 60 * 10

export interface StoredExport {
  url: string
  path: string
}

// Uploads a finished export under a random name and signs it. A file that
// can't be signed is removed again.
export async function storeExport(
  supabase: ServerSupabase,
  projectId: string,
  data: Buffer,
  mimeType: string,
  extension: string
): Promise<StoredExport | { error: string }> {
  const path = `${EXPORTS_FOLDER}/${projectId}/${crypto.randomUUID()}.${extension}`
  const storage = supabase.storage.from('attachments')
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

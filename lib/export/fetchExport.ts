import { discardExport, type ExportFile } from '@/actions/export'

// Downloads a finished export from its signed URL (see actions/export.ts) as
// a Blob, for saving it or showing it in a preview, then has the server
// delete the stored copy, which is done with either way.
export async function fetchExport(projectId: string, file: ExportFile): Promise<{ blob: Blob } | { error: string }> {
  try {
    const res = await fetch(file.url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { blob: new Blob([await res.arrayBuffer()], { type: file.mimeType }) }
  } catch (err) {
    console.error('Export download error:', err)
    return { error: "Couldn't download the file. Try again." }
  } finally {
    discardExport(projectId, file.path).catch((err: unknown) => console.error('Export discard error:', err))
  }
}

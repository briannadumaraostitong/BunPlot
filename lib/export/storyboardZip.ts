import { Zip, ZipPassThrough } from 'fflate'
import type { StoryboardChapter } from '@/actions/export'
import { DOWNLOAD_CONCURRENCY, forEachWithConcurrency } from './concurrency'

const MAX_NAME_LENGTH = 80
const WINDOWS_FORBIDDEN = '\\/:*?"<>|'

// Safe as a Windows file or folder name: drops forbidden and control
// characters, collapses whitespace (captions can be multi-line), caps the
// length, and trims trailing dots/spaces, which Windows silently strips.
export function sanitizeFileName(name: string, fallback: string): string {
  const cleaned = [...name]
    .filter((c) => c.charCodeAt(0) >= 32 && !WINDOWS_FORBIDDEN.includes(c))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .replace(/[. ]+$/, '')
  return cleaned || fallback
}

// From the stored Storage path (e.g. ".../1712345-sketch.png"), not the
// signed URL, whose query string would otherwise end up in the extension.
function extensionOf(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1)
  const dot = base.lastIndexOf('.')
  const ext = dot > 0 ? base.slice(dot + 1).toLowerCase() : ''
  return /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'bin'
}

const pad = (n: number, width: number) => String(n).padStart(width, '0')

export interface StoryboardZipResult {
  blob: Blob
  added: number
  skipped: number
}

export async function buildStoryboardZip(
  chapters: StoryboardChapter[],
  onProgress: (progress: { done: number; total: number }) => void
): Promise<StoryboardZipResult> {
  const jobs = chapters.flatMap((ch, ci) => {
    const folder = `${pad(ci + 1, 2)} - ${sanitizeFileName(ch.title, `Chapter ${ci + 1}`)}`
    // Panels with no image have nothing to put in the ZIP (the PDF still
    // shows them as captioned frames).
    return ch.panels.flatMap((p) =>
      p.path
        ? [{
            url: p.url,
            name: `${folder}/${pad(p.number, 3)} - ${sanitizeFileName(p.caption ?? '', `Panel ${p.number}`)}.${extensionOf(p.path)}`,
          }]
        : []
    )
  })

  const chunks: Uint8Array<ArrayBuffer>[] = []
  const zip = new Zip()
  const finished = new Promise<void>((resolve, reject) => {
    zip.ondata = (err, chunk, final) => {
      if (err) return reject(err)
      // fflate types chunks as ArrayBufferLike-backed, which Blob rejects
      // (it could be a SharedArrayBuffer), but it always allocates plain
      // ArrayBuffers — type-only narrowing, no copy.
      chunks.push(chunk as Uint8Array<ArrayBuffer>)
      if (final) resolve()
    }
  })

  const total = jobs.length
  let done = 0
  let skipped = 0
  onProgress({ done, total })

  // A failed image is logged and skipped rather than failing the whole export.
  await forEachWithConcurrency(jobs, DOWNLOAD_CONCURRENCY, async (job) => {
    try {
      if (!job.url) throw new Error('No signed URL')
      const res = await fetch(job.url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const bytes = new Uint8Array(await res.arrayBuffer())
      // Store-only (no compression): PNG/JPEG are already compressed, so
      // deflating them again costs CPU for almost no size gain.
      const file = new ZipPassThrough(job.name)
      zip.add(file)
      file.push(bytes, true)
    } catch (err) {
      console.error('Storyboard image download error:', job.name, err)
      skipped++
    }
    done++
    onProgress({ done, total })
  })
  zip.end()
  await finished

  return { blob: new Blob(chunks, { type: 'application/zip' }), added: total - skipped, skipped }
}

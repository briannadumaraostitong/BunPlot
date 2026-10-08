import type { StoryboardChapter } from '@/actions/export'
import { DOWNLOAD_CONCURRENCY, forEachWithConcurrency } from './concurrency'

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.9

export interface PreparedImage {
  blob: Blob
  width: number
  height: number
}

export type PanelImageState =
  | { kind: 'image'; image: PreparedImage }
  | { kind: 'missing' | 'failed' | 'unsupported' }

// Redraws through a canvas so whatever was uploaded embeds in react-pdf,
// which only takes PNG/JPEG: decodes anything the browser can (WebP, GIF's
// first frame, EXIF-rotated phone photos), downscales to MAX_DIMENSION on the
// longest side, and flattens onto white so transparent areas match the white
// page instead of turning black as JPEG. PNG/GIF sources (sketches, line art,
// screenshots) stay PNG to keep strokes crisp; everything else becomes JPEG
// to keep photo pages small. Returns null if the browser can't decode the
// image at all (e.g. HEIC outside Safari).
export async function prepareImage(source: Blob): Promise<PreparedImage | null> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' })
  } catch {
    return null
  }
  if (!bitmap.width || !bitmap.height) {
    bitmap.close()
    return null
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return null
  }
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const keepPng = source.type === 'image/png' || source.type === 'image/gif'
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, keepPng ? 'image/png' : 'image/jpeg', JPEG_QUALITY)
  )
  // Frees the backing store now rather than at GC — matters when preparing
  // hundreds of panels in a row.
  canvas.width = 0
  canvas.height = 0
  return blob ? { blob, width, height } : null
}

export interface PreparedStoryboardImages {
  images: Map<string, PanelImageState>
  failed: number
  unsupported: number
}

// Keyed by panel id. Every panel gets an entry, so the PDF can draw a frame
// in its place: 'missing' (no image uploaded), 'failed' (download error),
// 'unsupported' (couldn't decode) — the numbering never skips.
export async function prepareStoryboardImages(
  chapters: StoryboardChapter[],
  onProgress: (progress: { done: number; total: number }) => void
): Promise<PreparedStoryboardImages> {
  const images = new Map<string, PanelImageState>()
  const panels = chapters.flatMap((ch) => ch.panels)
  for (const panel of panels) {
    if (!panel.path) images.set(panel.id, { kind: 'missing' })
  }

  const withImage = panels.filter((panel) => panel.path)
  const total = withImage.length
  let done = 0
  let failed = 0
  let unsupported = 0
  onProgress({ done, total })

  await forEachWithConcurrency(withImage, DOWNLOAD_CONCURRENCY, async (panel) => {
    try {
      if (!panel.url) throw new Error('No signed URL')
      const res = await fetch(panel.url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const prepared = await prepareImage(await res.blob())
      if (prepared) {
        images.set(panel.id, { kind: 'image', image: prepared })
      } else {
        images.set(panel.id, { kind: 'unsupported' })
        unsupported++
      }
    } catch (err) {
      console.error('Storyboard image download error:', panel.id, err)
      images.set(panel.id, { kind: 'failed' })
      failed++
    }
    done++
    onProgress({ done, total })
  })

  return { images, failed, unsupported }
}

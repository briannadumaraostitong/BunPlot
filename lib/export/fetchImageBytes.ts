import { readImageInfo, type ImageInfo } from './readImageInfo'

export interface FetchedImage {
  bytes: Uint8Array
  info: ImageInfo
}

// Outline's own image upload bakes a long-lived signed URL directly into the
// saved content (see OutlineEditor's upload flow), so these are plain,
// directly-fetchable HTTPS URLs — no Supabase auth context needed here.
export async function fetchImageBytes(src: string): Promise<FetchedImage | null> {
  try {
    const res = await fetch(src)
    if (!res.ok) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    return { bytes, info: readImageInfo(bytes) }
  } catch (err) {
    console.error('Export image fetch error:', err)
    return null
  }
}

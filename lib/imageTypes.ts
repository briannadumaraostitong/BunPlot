// Image formats and size accepted for uploads (covers, place and outline
// images, storyboard panels and sketches). The attachments bucket enforces
// the same list and limit (supabase/schema.sql); checking first gives a clear
// message instead of a failed upload. A file input's accept only filters the
// picker (its "All files" option gets around it), so upload handlers also
// check each file with checkImageUpload.
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export const ACCEPTED_IMAGE_ACCEPT = ACCEPTED_IMAGE_TYPES.join(',')

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

// Why an image can't be uploaded, as a sentence to show, or null if it can.
export function checkImageUpload(file: Blob): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'Use a JPG, PNG, GIF or WebP image.'
  if (file.size > MAX_IMAGE_BYTES) return 'Use an image under 10 MB.'
  return null
}

// A storage file name for an accepted image: a random id and the extension
// for its type, so nothing from the user's own file name ends up in a path.
export function imageFileName(type: string): string {
  return `${crypto.randomUUID()}.${EXTENSION_BY_TYPE[type] ?? 'bin'}`
}

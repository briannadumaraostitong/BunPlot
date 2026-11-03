import sharp from 'sharp'
import { fetchImageBytes, type FetchedImage } from './fetchImageBytes'
import { PLACE_CARD } from './printTypography'

// An image ready for react-pdf, which only takes PNG and JPEG. WebP and GIF
// uploads (both allowed) are converted, and any image bigger than its size's
// maxWidth × maxHeight is scaled down to fit, so a large upload doesn't bloat
// the file. A size with an aspect (width ÷ height) also crops the image to
// that shape around its centre, as the app's object-cover frames show it.
// Server-only (sharp).

// maxHeight: none when only the width matters (images in rich text).
// photo: a picture that's far smaller as JPEG (a cover), so a PNG that isn't
// actually transparent becomes one. Without it a PNG stays PNG, which keeps
// screenshots and diagrams in rich text sharp.
export interface ImageSize {
  maxWidth: number
  maxHeight?: number
  aspect?: number
  photo?: boolean
}

// A Book style cover: a 6×9 in page at 300 dpi.
export const COVER_SIZE: ImageSize = { maxWidth: 1800, maxHeight: 2700, photo: true }
// A place's cover in the story bible: 16:9 like the app's aspect-video
// frames, about 260 dpi across a card on an A4 page.
export const PLACE_COVER_SIZE: ImageSize = { maxWidth: 1600, maxHeight: 900, aspect: PLACE_CARD.coverAspect, photo: true }

// Images in rich text are printed at this resolution, at most.
const PRINT_DPI = 300
// The editor's (and the renderers') CSS pixels, at 96 to the inch.
const PT_PER_PX = 0.75

export type PreparedImage = { url: string } | { error: string }

export async function prepareImage(src: string, size: ImageSize): Promise<PreparedImage> {
  const fetched = await fetchImageBytes(src)
  if (!fetched) return { error: "Couldn't download the image." }
  return prepareFetched(src, fetched, size)
}

// An image in rich text (an outline, a place description), scaled down to
// what it needs at PRINT_DPI where it's printed: at its editor width (CSS
// px), or its own width if it was never resized, and no wider than the
// text. width: the width it's shown at, for the caller to keep on the
// block, since the renderers otherwise fall back to the image's own width,
// which scaling down changes.
export async function prepareInlineImage(
  src: string,
  editorWidth: number | null,
  textWidthPt: number
): Promise<{ url: string; width: number } | { error: string }> {
  const fetched = await fetchImageBytes(src)
  if (!fetched) return { error: "Couldn't download the image." }
  // readImageInfo doesn't size WebP (the renderers can't embed it), so sharp
  // does when it can't.
  const ownWidth = fetched.info.width ?? (await sharp(fetched.bytes).metadata().catch(() => null))?.width
  if (!ownWidth) return { error: "Couldn't read the image's size." }
  const width = editorWidth ?? ownWidth
  const printedPt = Math.min(width * PT_PER_PX, textWidthPt)
  const prepared = await prepareFetched(src, fetched, { maxWidth: Math.ceil((printedPt / 72) * PRINT_DPI) })
  return 'url' in prepared ? { url: prepared.url, width } : prepared
}

// Whether the prepared image is a PNG (to keep transparency) rather than a
// JPEG. A JPEG stays JPEG. Otherwise: a photo only when it really has
// transparent pixels (checked on the pixels, since many PNGs carry an alpha
// channel they never use); anything else, a PNG stays PNG, and a WebP or GIF
// becomes PNG if it has an alpha channel.
async function keepsPng(fetched: FetchedImage, hasAlpha: boolean, size: ImageSize): Promise<boolean> {
  const { format } = fetched.info
  if (format === 'jpeg') return false
  if (size.photo) return hasAlpha && !(await sharp(fetched.bytes).stats()).isOpaque
  return format === 'png' || hasAlpha
}

async function prepareFetched(src: string, fetched: FetchedImage, size: ImageSize): Promise<PreparedImage> {
  const { format, width, height } = fetched.info

  const fits =
    width !== null &&
    height !== null &&
    width <= size.maxWidth &&
    (size.maxHeight === undefined || height <= size.maxHeight)

  try {
    const metadata = await sharp(fetched.bytes).metadata()
    const png = await keepsPng(fetched, !!metadata.hasAlpha, size)
    // Used as it is when it already fits, is a format react-pdf takes, and
    // keeps that format.
    if (fits && !size.aspect && (format === 'jpeg' || (format === 'png' && png))) return { url: src }

    // A GIF gives its first frame.
    let image = sharp(fetched.bytes)
    if (size.aspect) {
      // Turned upright first (its EXIF orientation, as browsers show it), so
      // the crop is taken from the picture as it's seen.
      const upright = (metadata.orientation ?? 1) >= 5
      const w = (upright ? metadata.height : metadata.width) ?? 0
      const h = (upright ? metadata.width : metadata.height) ?? 0
      // As wide as the image allows at this aspect, never enlarged.
      const cropWidth = Math.round(Math.min(w, h * size.aspect, size.maxWidth, (size.maxHeight ?? Infinity) * size.aspect))
      const cropHeight = Math.round(cropWidth / size.aspect)
      if (cropWidth < 1 || cropHeight < 1) return { error: 'The image is too small to crop.' }
      image = image.rotate().resize({ width: cropWidth, height: cropHeight, fit: 'cover', position: 'centre' })
    } else {
      image = image.resize({ width: size.maxWidth, height: size.maxHeight, fit: 'inside', withoutEnlargement: true })
    }
    const data = png ? await image.png().toBuffer() : await image.jpeg({ quality: 90 }).toBuffer()
    return { url: `data:image/${png ? 'png' : 'jpeg'};base64,${data.toString('base64')}` }
  } catch (err) {
    console.error('Export image conversion error:', err)
    return { error: "Couldn't convert the image." }
  }
}

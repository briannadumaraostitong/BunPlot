import sharp from 'sharp'
import { fetchImageBytes } from './fetchImageBytes'
import { PLACE_CARD } from './printTypography'

// An image ready for react-pdf, which only takes PNG and JPEG. WebP and GIF
// uploads (both allowed) are converted, and any image bigger than its size's
// maxWidth × maxHeight is scaled down to fit, so a large upload doesn't bloat
// the file. A size with an aspect (width ÷ height) also crops the image to
// that shape around its centre, as the app's object-cover frames show it.
// Server-only (sharp).

export interface ImageSize {
  maxWidth: number
  maxHeight: number
  aspect?: number
}

// A Book style cover: a 6×9 in page at 300 dpi.
export const COVER_SIZE: ImageSize = { maxWidth: 1800, maxHeight: 2700 }
// A place's cover in the story bible: 16:9 like the app's aspect-video
// frames, about 260 dpi across a card on an A4 page.
export const PLACE_COVER_SIZE: ImageSize = { maxWidth: 1600, maxHeight: 900, aspect: PLACE_CARD.coverAspect }

export type PreparedImage = { url: string } | { error: string }

export async function prepareImage(src: string, size: ImageSize): Promise<PreparedImage> {
  const fetched = await fetchImageBytes(src)
  if (!fetched) return { error: "Couldn't download the image." }
  const { format, width, height } = fetched.info

  const fits = width !== null && height !== null && width <= size.maxWidth && height <= size.maxHeight
  if ((format === 'png' || format === 'jpeg') && fits && !size.aspect) return { url: src }

  try {
    const metadata = await sharp(fetched.bytes).metadata()
    // A GIF gives its first frame.
    let image = sharp(fetched.bytes)
    if (size.aspect) {
      // Turned upright first (its EXIF orientation, as browsers show it), so
      // the crop is taken from the picture as it's seen.
      const upright = (metadata.orientation ?? 1) >= 5
      const w = (upright ? metadata.height : metadata.width) ?? 0
      const h = (upright ? metadata.width : metadata.height) ?? 0
      // As wide as the image allows at this aspect, never enlarged.
      const cropWidth = Math.round(Math.min(w, h * size.aspect, size.maxWidth, size.maxHeight * size.aspect))
      const cropHeight = Math.round(cropWidth / size.aspect)
      if (cropWidth < 1 || cropHeight < 1) return { error: 'The image is too small to crop.' }
      image = image.rotate().resize({ width: cropWidth, height: cropHeight, fit: 'cover', position: 'centre' })
    } else {
      image = image.resize({ width: size.maxWidth, height: size.maxHeight, fit: 'inside', withoutEnlargement: true })
    }
    // PNG and JPEG keep their format. A converted WebP or GIF becomes PNG if
    // it has transparency, otherwise JPEG (far smaller for photos).
    const png = format === 'png' || (format !== 'jpeg' && metadata.hasAlpha)
    const data = png ? await image.png().toBuffer() : await image.jpeg({ quality: 90 }).toBuffer()
    return { url: `data:image/${png ? 'png' : 'jpeg'};base64,${data.toString('base64')}` }
  } catch (err) {
    console.error('Export image conversion error:', err)
    return { error: "Couldn't convert the image." }
  }
}

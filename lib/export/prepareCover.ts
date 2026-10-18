import sharp from 'sharp'
import { fetchImageBytes } from './fetchImageBytes'

// A Book style cover, ready for react-pdf, which only takes PNG and JPEG.
// WebP and GIF covers (both allowed as uploads) are converted, and any cover
// bigger than a 6×9 in page needs at 300 dpi is scaled down to fit, so a
// large upload doesn't bloat the PDF. Server-only (sharp).

const MAX_WIDTH = 1800
const MAX_HEIGHT = 2700

export type PreparedCover = { url: string } | { error: string }

export async function prepareCover(src: string): Promise<PreparedCover> {
  const fetched = await fetchImageBytes(src)
  if (!fetched) return { error: "Couldn't download the cover image." }
  const { format, width, height } = fetched.info

  const fits = width !== null && height !== null && width <= MAX_WIDTH && height <= MAX_HEIGHT
  if ((format === 'png' || format === 'jpeg') && fits) return { url: src }

  try {
    // A GIF gives its first frame.
    const image = sharp(fetched.bytes).resize({
      width: MAX_WIDTH,
      height: MAX_HEIGHT,
      fit: 'inside',
      withoutEnlargement: true,
    })
    // PNG and JPEG keep their format. A converted WebP or GIF becomes PNG if
    // it has transparency, otherwise JPEG (far smaller for photos).
    const { hasAlpha } = await sharp(fetched.bytes).metadata()
    const png = format === 'png' || (format !== 'jpeg' && hasAlpha)
    const data = png ? await image.png().toBuffer() : await image.jpeg({ quality: 90 }).toBuffer()
    return { url: `data:image/${png ? 'png' : 'jpeg'};base64,${data.toString('base64')}` }
  } catch (err) {
    console.error('Cover conversion error:', err)
    return { error: "Couldn't convert the cover image." }
  }
}

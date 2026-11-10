import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { APP_ICON_SRC } from '@/lib/brand'

// Renders the logo file as a square PNG for app/icon.tsx and app/apple-icon.tsx.
// Built once at build time (no request data), so it costs nothing per request.
// `background` fills the square behind the mark, for icons that can't be
// transparent; `padding` is the margin around the mark, in px.
export async function logoIcon(size: number, { background, padding = 0 }: { background?: string; padding?: number } = {}) {
  const svg = await readFile(join(process.cwd(), 'public', APP_ICON_SRC))
  const src = `data:image/svg+xml;base64,${svg.toString('base64')}`
  const mark = size - padding * 2

  return new ImageResponse(
    (
      // background only when given: next/og fails on an undefined style value.
      <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', ...(background && { background }) }}>
        {/* next/og draws plain <img>; next/image doesn't apply here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" width={mark} height={mark} />
      </div>
    ),
    { width: size, height: size }
  )
}

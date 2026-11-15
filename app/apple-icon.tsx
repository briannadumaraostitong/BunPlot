import { logoIcon } from '@/lib/logoIcon'

// The home-screen icon for iOS, generated from the logo file (lib/brand.ts).
// iOS fills transparency with black, so the mark sits on an opaque square with
// a margin. The color is Classic Light's cream background as a literal, to
// match the logo: icons are images rendered outside the page, with no access
// to the theme's CSS variables.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return logoIcon(size.width, { background: '#FCF7DF', padding: 28 })
}

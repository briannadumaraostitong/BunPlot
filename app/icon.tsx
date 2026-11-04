import { logoIcon } from '@/lib/logoIcon'

// The browser tab icon, generated from the logo file (lib/brand.ts). Browsers
// scale it down for smaller slots, so there's no separate 16px icon.
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return logoIcon(size.width)
}

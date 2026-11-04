// The Nightcity frames (public/frames/, credited in ASSETS.md) with their
// viewBox sizes and measured content areas, from design/landing/HANDOFF.md.
// Insets are percentages of the frame; content goes only inside them, since
// the frames' edges carry notches and marks. Frames are never stretched:
// <ThemeFrame> keeps each one at its own aspect ratio.

export interface FrameInset {
  left?: number
  right?: number
  top?: number
  bottom?: number
  width?: number
  height?: number
}

export interface FrameSpec {
  src: string
  width: number
  height: number
  // Named content areas; every frame has `content`.
  slots: { content: FrameInset } & Record<string, FrameInset>
}

const HUD = '/frames/nightcity-hud-frame-set'
const MODALS = '/frames/nightcity-modals'

export const FRAMES = {
  // Bottom-left has a notch: keep text right-aligned near the bottom.
  primary: { src: `${HUD}/frame-primary.svg`, width: 320, height: 180, slots: { content: { left: 20, right: 11, top: 30, bottom: 20 } } },
  terminal: { src: `${HUD}/frame-terminal.svg`, width: 300, height: 200, slots: { content: { left: 11, right: 13, top: 26, bottom: 17 } } },
  portrait: { src: `${HUD}/frame-portrait.svg`, width: 160, height: 160, slots: { content: { left: 14, right: 14, top: 18, bottom: 16 } } },
  // Thin slots: a single line of text.
  readout: { src: `${HUD}/frame-readout.svg`, width: 320, height: 120, slots: { content: { left: 6, right: 6, top: 65.4, bottom: 10.8 } } },
  tag: { src: `${HUD}/frame-tag.svg`, width: 200, height: 72, slots: { content: { left: 8, right: 6, top: 53, bottom: 12.5 } } },
  // Modified copy of modal-info.svg with its built-in buttons removed; real
  // buttons go in `actions`. `title` is the title bar.
  modal: {
    src: `${MODALS}/modal-info-frame.svg`, width: 360, height: 200,
    slots: {
      content: { left: 9, right: 13, top: 24, bottom: 36 },
      title: { left: 12, right: 24, top: 1.5, height: 15 },
      actions: { left: 9, right: 13, bottom: 11 },
    },
  },
  // `icon` is centered around x 10%, y 54%, about 4% wide.
  plate: {
    src: `${MODALS}/plate-info.svg`, width: 320, height: 64,
    slots: {
      content: { left: 21, right: 6, top: 16, bottom: 0 },
      icon: { left: 7.9, top: 40, width: 4, height: 28 },
    },
  },
} satisfies Record<string, FrameSpec>

export type FrameName = keyof typeof FRAMES

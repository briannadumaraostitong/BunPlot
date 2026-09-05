export type SketchTool = 'pen' | 'eraser' | 'line' | 'rectangle' | 'ellipse' | 'fill' | 'select' | 'text'

export const BRUSH_MIN = 1
export const BRUSH_MAX = 40

export const FONT_SIZE_MIN = 12
export const FONT_SIZE_MAX = 72

export const ZOOM_MIN = 0.25
export const ZOOM_MAX = 4
export const ZOOM_BUTTON_STEP = 0.25
export const ZOOM_WHEEL_FACTOR = 1.1

export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom))
}

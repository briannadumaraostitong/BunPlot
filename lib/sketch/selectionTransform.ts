// Geometry for the select-and-move tool's floating selection: local<->world
// transforms, handle positions, and hit-testing. Everything here works in
// the selection's own local (unrotated) coordinate space — world-space
// points are transformed in, handles/hit-testing/resize math happen in that
// local space, and results are transformed back out. This sidesteps ever
// needing to recompute a rotated rectangle's axis-aligned bounding box: nothing
// here needs one.

export interface SelectionTransform {
  x: number // world-space center
  y: number // world-space center
  w: number
  h: number
  rotation: number // radians
}

export interface LocalPoint {
  x: number
  y: number
}

export type ResizeHandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const HANDLE_HIT_RADIUS = 8
export const HANDLE_VISUAL_SIZE = 8
export const ROTATE_HANDLE_OFFSET = 24
export const MIN_SELECTION_SIZE = 8

// Which axes each handle drags, and in which direction (0 = axis untouched —
// n/s handles never change w, e/w handles never change h).
export const HANDLE_SIGN: Record<ResizeHandleId, { sx: number; sy: number }> = {
  nw: { sx: -1, sy: -1 },
  n: { sx: 0, sy: -1 },
  ne: { sx: 1, sy: -1 },
  e: { sx: 1, sy: 0 },
  se: { sx: 1, sy: 1 },
  s: { sx: 0, sy: 1 },
  sw: { sx: -1, sy: 1 },
  w: { sx: -1, sy: 0 },
}

const CURSOR_BY_HANDLE: Record<ResizeHandleId, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
}

export function toLocal(point: { x: number; y: number }, t: Pick<SelectionTransform, 'x' | 'y' | 'rotation'>): LocalPoint {
  const dx = point.x - t.x
  const dy = point.y - t.y
  const cos = Math.cos(-t.rotation)
  const sin = Math.sin(-t.rotation)
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos }
}

export function toWorld(point: LocalPoint, t: Pick<SelectionTransform, 'x' | 'y' | 'rotation'>): { x: number; y: number } {
  const cos = Math.cos(t.rotation)
  const sin = Math.sin(t.rotation)
  return {
    x: t.x + point.x * cos - point.y * sin,
    y: t.y + point.x * sin + point.y * cos,
  }
}

export function resizeHandlePositions(t: Pick<SelectionTransform, 'w' | 'h'>): Record<ResizeHandleId, LocalPoint> {
  const hw = t.w / 2
  const hh = t.h / 2
  return {
    nw: { x: -hw, y: -hh },
    n: { x: 0, y: -hh },
    ne: { x: hw, y: -hh },
    e: { x: hw, y: 0 },
    se: { x: hw, y: hh },
    s: { x: 0, y: hh },
    sw: { x: -hw, y: hh },
    w: { x: -hw, y: 0 },
  }
}

export function rotateHandlePosition(t: Pick<SelectionTransform, 'h'>): LocalPoint {
  return { x: 0, y: -t.h / 2 - ROTATE_HANDLE_OFFSET }
}

// The point that stays fixed in world space while dragging a given resize
// handle — the opposite corner/edge, in local (unrotated) space.
export function resizeAnchor(handle: ResizeHandleId, t: Pick<SelectionTransform, 'w' | 'h'>): LocalPoint {
  const hw = t.w / 2
  const hh = t.h / 2
  const anchors: Record<ResizeHandleId, LocalPoint> = {
    nw: { x: hw, y: hh },
    n: { x: 0, y: hh },
    ne: { x: -hw, y: hh },
    e: { x: -hw, y: 0 },
    se: { x: -hw, y: -hh },
    s: { x: 0, y: -hh },
    sw: { x: hw, y: -hh },
    w: { x: hw, y: 0 },
  }
  return anchors[handle]
}

function distance(a: LocalPoint, b: LocalPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export type SelectionHit =
  | { kind: 'rotate' }
  | { kind: 'resize'; handle: ResizeHandleId }
  | { kind: 'move' }
  | { kind: 'none' }

export function hitTestSelection(point: { x: number; y: number }, t: SelectionTransform): SelectionHit {
  const local = toLocal(point, t)

  if (distance(local, rotateHandlePosition(t)) <= HANDLE_HIT_RADIUS) {
    return { kind: 'rotate' }
  }

  const handles = resizeHandlePositions(t)
  for (const id of Object.keys(handles) as ResizeHandleId[]) {
    if (distance(local, handles[id]) <= HANDLE_HIT_RADIUS) {
      return { kind: 'resize', handle: id }
    }
  }

  const hw = t.w / 2
  const hh = t.h / 2
  if (local.x >= -hw && local.x <= hw && local.y >= -hh && local.y <= hh) {
    return { kind: 'move' }
  }

  return { kind: 'none' }
}

// Static per-handle cursor, not adjusted for the selection's current
// rotation — CSS only offers 8 fixed resize-cursor directions, so a handle's
// cursor can be visually "off" once the selection is rotated. Accepted
// simplification rather than computing a nearest-direction approximation.
export function cursorForHit(hit: SelectionHit): string {
  if (hit.kind === 'rotate') return 'grab'
  if (hit.kind === 'resize') return CURSOR_BY_HANDLE[hit.handle]
  if (hit.kind === 'move') return 'move'
  return 'crosshair'
}

export interface ResizeResult {
  w: number
  h: number
  centerLocal: LocalPoint
}

// Computes the new w/h and local center for a resize drag, given the fixed
// anchor and the current pointer already transformed into local space
// (relative to the selection's center/rotation as they were at drag start).
export function computeResize(
  local: LocalPoint,
  anchorLocal: LocalPoint,
  handle: ResizeHandleId,
  startW: number,
  startH: number
): ResizeResult {
  const sign = HANDLE_SIGN[handle]
  const w = sign.sx !== 0 ? Math.max(MIN_SELECTION_SIZE, sign.sx * (local.x - anchorLocal.x)) : startW
  const h = sign.sy !== 0 ? Math.max(MIN_SELECTION_SIZE, sign.sy * (local.y - anchorLocal.y)) : startH
  const cornerLocal = { x: anchorLocal.x + sign.sx * w, y: anchorLocal.y + sign.sy * h }
  const centerLocal = { x: (anchorLocal.x + cornerLocal.x) / 2, y: (anchorLocal.y + cornerLocal.y) / 2 }
  return { w, h, centerLocal }
}

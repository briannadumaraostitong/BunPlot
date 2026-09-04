import { getStroke } from 'perfect-freehand'

export interface StrokePoint {
  x: number
  y: number
  pressure: number
}

export function getStrokeOutline(points: StrokePoint[], size: number): number[][] {
  return getStroke(
    points.map((p) => [p.x, p.y, p.pressure]),
    { size }
  )
}

// perfect-freehand's recommended rendering recipe: draw the outline as a
// filled path using quadratic curves through each pair's midpoint, rather
// than straight lineTo segments, for a smooth (not faceted) stroke edge.
export function outlineToPath2D(outline: number[][]): Path2D {
  const path = new Path2D()
  if (outline.length === 0) return path

  path.moveTo(outline[0][0], outline[0][1])
  for (let i = 1; i < outline.length; i++) {
    const [x0, y0] = outline[i]
    const [x1, y1] = outline[(i + 1) % outline.length]
    path.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
  }
  path.closePath()
  return path
}

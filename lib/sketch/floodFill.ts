// Scanline span flood fill (4-connected), operating in place on ImageData.
// Faster than a naive per-pixel queue: extends whole horizontal runs at once
// instead of pushing/popping one pixel per step. Uses a tolerance threshold
// rather than exact color equality, since freehand strokes and anti-aliased
// shape edges produce blended intermediate pixel colors along boundaries —
// an exact match would leak through those edges or leave unfilled slivers.
export function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillColor: [number, number, number, number],
  tolerance = 32
) {
  const { data, width, height } = imageData
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return

  const startIdx = (startY * width + startX) * 4
  const targetR = data[startIdx]
  const targetG = data[startIdx + 1]
  const targetB = data[startIdx + 2]
  const targetA = data[startIdx + 3]
  const [fillR, fillG, fillB, fillA] = fillColor

  const matchesTarget = (idx: number) =>
    Math.abs(data[idx] - targetR) <= tolerance &&
    Math.abs(data[idx + 1] - targetG) <= tolerance &&
    Math.abs(data[idx + 2] - targetB) <= tolerance &&
    Math.abs(data[idx + 3] - targetA) <= tolerance

  if (matchesTarget(startIdx) && targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) {
    return
  }

  const visited = new Uint8Array(width * height)
  const stack: [number, number][] = [[startX, startY]]

  while (stack.length > 0) {
    const [x, y] = stack.pop()!
    if (x < 0 || x >= width || y < 0 || y >= height) continue

    const rowStart = y * width
    if (visited[rowStart + x] || !matchesTarget((rowStart + x) * 4)) continue

    let left = x
    while (left > 0 && !visited[rowStart + left - 1] && matchesTarget((rowStart + left - 1) * 4)) {
      left--
    }
    let right = x
    while (
      right < width - 1 &&
      !visited[rowStart + right + 1] &&
      matchesTarget((rowStart + right + 1) * 4)
    ) {
      right++
    }

    let spanAbove = false
    let spanBelow = false
    for (let px = left; px <= right; px++) {
      const idx = rowStart + px
      visited[idx] = 1
      const dataIdx = idx * 4
      data[dataIdx] = fillR
      data[dataIdx + 1] = fillG
      data[dataIdx + 2] = fillB
      data[dataIdx + 3] = fillA

      if (y > 0) {
        const aboveIdx = rowStart - width + px
        const isMatch = !visited[aboveIdx] && matchesTarget(aboveIdx * 4)
        if (isMatch && !spanAbove) {
          stack.push([px, y - 1])
        }
        spanAbove = isMatch
      }
      if (y < height - 1) {
        const belowIdx = rowStart + width + px
        const isMatch = !visited[belowIdx] && matchesTarget(belowIdx * 4)
        if (isMatch && !spanBelow) {
          stack.push([px, y + 1])
        }
        spanBelow = isMatch
      }
    }
  }
}

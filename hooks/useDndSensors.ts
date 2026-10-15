'use client'

import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

// Shared by every DndContext. Drags only start from a grip button, which
// carries touch-none: dnd-kit's PointerSensor needs touch-action: none on the
// element the drag starts from, or the browser takes the touch as a scroll and
// cancels it. Swiping anywhere else still scrolls. distance: 4 keeps a tap on a
// grip from becoming a tiny drag. If a whole card ever becomes draggable on
// touch, add a TouchSensor with a press delay here instead.
export function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
}

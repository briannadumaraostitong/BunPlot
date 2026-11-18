'use client'

import { useEffect, useState } from 'react'

export interface VisibleArea {
  // Height of the part of the page the user can see (window.visualViewport).
  height: number
  // How much of the layout viewport's bottom is covered: the on-screen
  // keyboard on iOS Safari, and on Android Chrome in its default
  // resizes-visual mode, where the keyboard shrinks only the visual viewport.
  bottomInset: number
}

// While `active`, the visible part of the layout viewport, from
// window.visualViewport, so a bottom-anchored overlay can sit above the
// on-screen keyboard. null when inactive, unsupported, or pinch-zoomed
// (where the visual viewport is a zoomed window, not the keyboard's doing).
// Listeners are attached only while active and removed when it ends.
export function useVisibleArea(active: boolean): VisibleArea | null {
  const [area, setArea] = useState<VisibleArea | null>(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!active || !vv) return

    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (Math.abs(vv.scale - 1) > 0.01) {
          setArea(null)
          return
        }
        // iOS pans the visual viewport down (offsetTop) to reach the focused
        // field, so what's hidden is below offsetTop + height.
        const bottomInset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
        setArea({ height: Math.round(vv.height), bottomInset })
      })
    }

    measure()
    vv.addEventListener('resize', measure)
    vv.addEventListener('scroll', measure)
    return () => {
      cancelAnimationFrame(frame)
      vv.removeEventListener('resize', measure)
      vv.removeEventListener('scroll', measure)
      setArea(null)
    }
  }, [active])

  return active ? area : null
}

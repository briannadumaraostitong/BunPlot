'use client'

import { useSyncExternalStore } from 'react'

// Whether the visitor asks for reduced motion, kept current if they change
// the setting while the page is open. False on the server and while
// hydrating, so the first render matches the server's.
const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  )
}

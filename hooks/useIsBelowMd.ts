'use client'

import { useSyncExternalStore } from 'react'

// Tailwind's md breakpoint is 768px, so "below md" is up to 767px.
const QUERY = '(max-width: 767px)'

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

// The server can't know the viewport, so it renders the desktop layout and
// hydration matches it; the real value takes over right after hydration.
function getServerSnapshot() {
  return false
}

// Whether the viewport is below Tailwind's md breakpoint. Live: it follows
// the media query on resize or rotation.
export function useIsBelowMd() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

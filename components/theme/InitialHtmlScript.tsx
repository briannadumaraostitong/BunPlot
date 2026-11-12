'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

// An inline script that exists only in the server HTML. While hydrating that
// HTML, React reads the server snapshot (true), so it adopts the script the
// browser already ran; afterwards it reads the client one (false) and drops
// it. Mounted fresh on the client (a client-side navigation), it renders
// nothing, so React never creates a script it couldn't run anyway.
export function InitialHtmlScript({ html }: { html: string }) {
  const inServerHtml = useSyncExternalStore(subscribe, () => false, () => true)
  if (!inServerHtml) return null
  return <script dangerouslySetInnerHTML={{ __html: html }} suppressHydrationWarning />
}

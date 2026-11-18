'use client'

import { useState, useSyncExternalStore } from 'react'
import { useIsBelowMd } from '@/hooks/useIsBelowMd'

// For useSyncExternalStore: true once the browser is running, false on the
// server and during hydration.
const noSubscribe = () => () => {}
const isClient = () => true
const isServer = () => false

// Whether something that opens as a phone sheet below md (and as a dialog or
// panel from md up) shows as the phone sheet. Chosen when it opens and kept
// until it closes: switching mid-edit (a phone rotated past 768px) would
// replace its contents and drop their unsaved edits. The choice waits for a
// real measurement: during hydration useIsBelowMd still reports the server's
// guess (not a phone), so something already open on a full page load
// (?entity=) locks only once the browser is running. After closing, the last
// surface stays for its exit animation; the next open chooses again.
export function usePhoneSurface(open: boolean): boolean {
  const belowMd = useIsBelowMd()
  const measured = useSyncExternalStore(noSubscribe, isClient, isServer)
  const [surface, setSurface] = useState<{ phone: boolean; locked: boolean } | null>(null)
  if (open && measured && !surface?.locked) setSurface({ phone: belowMd, locked: true })
  if (!open && surface?.locked) setSurface({ phone: surface.phone, locked: false })
  return surface?.locked || !open ? (surface?.phone ?? belowMd) : belowMd
}

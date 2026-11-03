'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clearAllBackups, hasAnyBackup } from '@/lib/editorBackup'
import { flushAllEdits, markSigningOut } from '@/lib/saveRegistry'

// Signing out safely, for whatever offers it (SignOutDialog asks when
// needed). requestSignOut saves open edits and waits for saves in flight
// while still signed in, then signs out. Only if something didn't save, or a
// backup is left (here or in another outline or project), it opens the
// confirmation instead, since signing out deletes backups; confirmSignOut is
// its "Sign out anyway". onSignOut: runs just before signing out (closing a
// menu), only then so the confirmation isn't hidden with it.
export function useSignOut({ onSignOut }: { onSignOut?: () => void } = {}) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function requestSignOut() {
    if (signingOut) return
    setSigningOut(true)
    const allSaved = await flushAllEdits()
    if (!allSaved || hasAnyBackup()) {
      setSigningOut(false)
      setConfirmOpen(true)
      return
    }
    await confirmSignOut()
  }

  async function confirmSignOut() {
    setConfirmOpen(false)
    setSigningOut(true)
    onSignOut?.()
    markSigningOut()
    await createClient().auth.signOut()
    // Local drafts belong to this account; remove them so the next person
    // using this browser doesn't inherit them.
    clearAllBackups()
    router.push('/login')
    router.refresh()
  }

  return { signingOut, confirmOpen, setConfirmOpen, requestSignOut, confirmSignOut }
}

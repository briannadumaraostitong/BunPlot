'use client'

import { useEffect } from 'react'
import { LoadError } from '@/components/ui/load-error'

// Catches failed server-side loads on the dashboard, projects and settings
// pages (and any other page under the app shell without its own error.tsx),
// so they show an error instead of an empty page or a redirect.
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <LoadError thing="this page" onRetry={() => unstable_retry()} />
    </div>
  )
}

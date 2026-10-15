'use client'

import { useEffect } from 'react'
import { LoadError } from '@/components/ui/load-error'

export default function ProjectError({
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
    <div className="p-6">
      <LoadError thing="this project" onRetry={() => unstable_retry()} />
    </div>
  )
}

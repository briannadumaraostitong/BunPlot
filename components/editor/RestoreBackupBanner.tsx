'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { BackupBannerState } from '@/hooks/useEditorBackup'

// Offers a backup of edits that never reached the database (useEditorBackup).
// `onApply` loads the content into the editor and saves it; `compact` is for
// small editors such as place descriptions and notes.
export function RestoreBackupBanner({
  banner,
  onApply,
  compact = false,
}: {
  banner: BackupBannerState
  onApply: (content: Record<string, unknown>) => void
  compact?: boolean
}) {
  if (!banner.pending) return null
  const buttonClass = compact ? 'h-6 px-2 text-[11px]' : 'h-7'

  return (
    <div
      className={cn(
        'flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-secondary/30',
        compact ? 'px-2 py-1.5 text-[11px]' : 'px-4 py-2 text-xs'
      )}
    >
      <p className="min-w-0 flex-1">
        {banner.confirming ? (
          <>This replaces what you&apos;ve typed since opening it. Restore anyway?</>
        ) : (
          <>
            Unsaved changes from{' '}
            {new Date(banner.pending.savedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}{' '}
            were found.
            {banner.changedSince && (
              <span className="text-muted-foreground">
                {' '}The saved version has changed since. Restoring replaces it.
              </span>
            )}
          </>
        )}
      </p>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button size="sm" className={buttonClass} onClick={() => banner.restore(onApply)}>
          {banner.confirming ? 'Restore anyway' : 'Restore'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={buttonClass}
          onClick={banner.confirming ? banner.cancel : banner.discard}
        >
          {banner.confirming ? 'Cancel' : 'Discard'}
        </Button>
      </div>
    </div>
  )
}

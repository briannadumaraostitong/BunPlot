'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { duplicateProject } from '@/actions/projects'
import type { Project } from '@/types/database'

interface DuplicateProjectDialogProps {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
}

type DuplicateMode = 'full' | 'structure'

export function DuplicateProjectDialog({ project, open, onOpenChange }: DuplicateProjectDialogProps) {
  const router = useRouter()
  const [title, setTitle] = useState(`${project.title} (Copy)`)
  const [mode, setMode] = useState<DuplicateMode>('full')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
    if (next) {
      setTitle(`${project.title} (Copy)`)
      setMode('full')
      setError(null)
    }
  }

  async function handleDuplicate() {
    if (!title.trim()) return
    setLoading(true)
    setError(null)

    const result = await duplicateProject(project.id, title.trim(), mode)

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    onOpenChange(false)
    setLoading(false)
    router.push(`/projects/${result.id}`)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicate project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="dup-title">Title</Label>
            <Input
              id="dup-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDuplicate()}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>What to copy</Label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setMode('full')}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                  mode === 'full'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-secondary/30'
                )}
              >
                <p className="text-sm font-medium">Full copy</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Everything: layers, statuses, chapters, events, characters, places, outlines, and all relationships between them.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMode('structure')}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                  mode === 'structure'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-secondary/30'
                )}
              >
                <p className="text-sm font-medium">Structure only</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Layers, statuses, and chapters as a starting template. Events, characters, and places are left empty.
                </p>
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            className="w-full"
            onClick={handleDuplicate}
            disabled={loading || !title.trim()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Duplicate Project'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

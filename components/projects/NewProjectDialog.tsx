'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { createProject, updateProject } from '@/actions/projects'
import { notifyError, reportResult, settle } from '@/lib/notify'
import { cn } from '@/lib/utils'

// Same list as the file input's accept, which a drop bypasses.
const COVER_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

interface NewProjectDialogProps {
  trigger?: string
}

export function NewProjectDialog({ trigger }: NewProjectDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [draggingOver, setDraggingOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Revokes the previous preview URL whenever it's replaced, and on unmount —
  // otherwise every picked file leaks an object URL for the tab's lifetime.
  useEffect(() => {
    return () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    }
  }, [coverPreviewUrl])

  function handleCoverPick(file: File) {
    setCoverFile(file)
    setCoverPreviewUrl(URL.createObjectURL(file))
  }

  async function handleCreate() {
    if (!title.trim()) return
    setLoading(true)
    setError(null)

    const result = await settle(createProject({
      title: title.trim(),
      description: description.trim(),
    }))

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    // Sequential, not part of the same request: the project needs a real id
    // before a storage path (projects/{project_id}/...) can exist. Failure
    // here is deliberately non-blocking — the project itself was created
    // successfully, so a cover-upload hiccup shouldn't stop navigation into
    // it; a cover can always be added later from the project card.
    if (coverFile) {
      const supabase = createClient()
      const safeName = coverFile.name.replace(/\s+/g, '-')
      const path = `projects/${result.id}/${Date.now()}-${safeName}`
      try {
        const { error: uploadErr } = await supabase.storage.from('attachments').upload(path, coverFile)
        if (uploadErr) throw uploadErr
        const updated = await settle(updateProject(result.id, { cover_image_url: path }))
        // The file is uploaded but the project doesn't point at it, so
        // nothing would ever show or clean it up.
        if (!reportResult(updated, "Couldn't add the cover image. You can add one from the project card.")) {
          supabase.storage.from('attachments').remove([path]).catch(() => {})
        }
      } catch (err) {
        notifyError("Couldn't upload the cover image. You can add one from the project card.", err)
      }
    }

    setOpen(false)
    setTitle('')
    setDescription('')
    setCoverFile(null)
    setCoverPreviewUrl(null)
    setLoading(false)
    router.push(`/projects/${result.id}`)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          <Button variant="outline" size="sm">{trigger}</Button>
        ) : (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            New Project
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="proj-title">Title</Label>
            <Input
              id="proj-title"
              placeholder="My Novel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proj-desc">Description</Label>
            <Textarea
              id="proj-desc"
              placeholder="A brief description..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proj-cover">Cover image</Label>
            {coverPreviewUrl ? (
              <div className="relative h-20 w-full overflow-hidden rounded-md border border-border">
                <img src={coverPreviewUrl} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setCoverFile(null); setCoverPreviewUrl(null) }}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm hover:text-destructive"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDraggingOver(true)
                }}
                onDragLeave={() => setDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDraggingOver(false)
                  const file = e.dataTransfer.files?.[0]
                  if (!file) return
                  if (!COVER_TYPES.includes(file.type)) {
                    notifyError("Couldn't add that file. Use a JPG, PNG, GIF or WebP image.")
                    return
                  }
                  handleCoverPick(file)
                }}
                className={cn(
                  'flex h-20 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground',
                  draggingOver && 'border-primary bg-secondary/30 text-foreground'
                )}
              >
                <ImagePlus className="h-4 w-4" />
                Click or drag to add a cover
              </button>
            )}
            <input
              ref={fileInputRef}
              id="proj-cover"
              type="file"
              accept={COVER_TYPES.join(',')}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) handleCoverPick(file)
              }}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={loading || !title.trim()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Create Project'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
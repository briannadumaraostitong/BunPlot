'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import {
  MoreHorizontal,
  Archive,
  ArchiveRestore,
  Trash2,
  FolderInput,
  FolderMinus,
  Pencil,
  Copy,
  Check,
  X,
  Camera,
  Loader2,
  GanttChartSquare,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { reportResult, settle } from '@/lib/notify'
import { ACCEPTED_IMAGE_ACCEPT, isAcceptedImage } from '@/lib/imageTypes'
import {
  deleteProject,
  archiveProject,
  unarchiveProject,
  moveProjectToFolder,
  updateProject,
} from '@/actions/projects'
import { DuplicateProjectDialog } from './DuplicateProjectDialog'
import type { ProjectFolder } from '@/types/database'
import type { ProjectWithCover } from '@/actions/projects'
import type { ProjectStats } from './ProjectCard'

interface ProjectDetailModalProps {
  project: ProjectWithCover
  folders: ProjectFolder[]
  stats: ProjectStats
  open: boolean
  onClose: () => void
  // Only rename/description/cover flow back through here — they don't change
  // list membership or grouping, so the card needs to reflect them instantly
  // without waiting on a refetch. Archive/duplicate/delete/move-to-folder all
  // keep the original router.refresh()-only behavior they had in ProjectCard,
  // since those DO change what's in the list (or where).
  onUpdated: (updates: Partial<ProjectWithCover>) => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

export function ProjectDetailModal({ project, folders, stats, open, onClose, onUpdated }: ProjectDetailModalProps) {
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(project.title)
  const [description, setDescription] = useState(project.description ?? '')

  async function handleDelete() {
    setLoading(true)
    const result = await settle(deleteProject(project.id))
    // Leave the confirm dialog and the modal open on failure, so it can be
    // retried or cancelled.
    if (!reportResult(result, "Couldn't delete the project.")) {
      setLoading(false)
      return
    }
    setConfirmDelete(false)
    setLoading(false)
    onClose()
    router.refresh()
  }

  async function handleArchive() {
    const result = await settle(archiveProject(project.id))
    reportResult(result, "Couldn't archive the project.")
    router.refresh()
  }

  async function handleUnarchive() {
    const result = await settle(unarchiveProject(project.id))
    reportResult(result, "Couldn't unarchive the project.")
    router.refresh()
  }

  async function handleRenameTitle() {
    if (!title.trim() || title === project.title) {
      setTitle(project.title)
      setEditingTitle(false)
      return
    }
    onUpdated({ title: title.trim() })
    const result = await settle(updateProject(project.id, { title: title.trim() }))
    reportResult(result, "Couldn't rename the project.")
    setEditingTitle(false)
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleRenameTitle()
    if (e.key === 'Escape') {
      setTitle(project.title)
      setEditingTitle(false)
    }
  }

  async function handleMoveToFolder(folderId: string | null) {
    const result = await settle(moveProjectToFolder(project.id, folderId))
    reportResult(result, "Couldn't move the project.")
    router.refresh()
  }

  async function saveDescription() {
    if (description === (project.description ?? '')) return
    const next = description.trim() || null
    onUpdated({ description: next })
    const result = await settle(updateProject(project.id, { description: next }))
    reportResult(result, "Couldn't save the description.")
  }

  function handleOpenTimeline() {
    onClose()
    router.push(`/projects/${project.id}`)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0 bg-card">
          <DialogTitle className="sr-only">{project.title}</DialogTitle>
          <DialogDescription className="sr-only">
            Project cover, description, and stats
          </DialogDescription>

          <div className="space-y-5 p-5">
            <div className="flex gap-4">
              <ProjectCoverImage
                projectId={project.id}
                imagePath={project.cover_image_url}
                displayUrl={project.cover_url}
                onUpdated={({ imagePath, url }) =>
                  onUpdated({ cover_image_url: imagePath, cover_url: url })
                }
              />

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="min-w-0">
                  {editingTitle ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={handleTitleKeyDown}
                        onBlur={handleRenameTitle}
                        className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-lg font-semibold outline-none focus:border-primary"
                      />
                      <button
                        onClick={handleRenameTitle}
                        className="relative shrink-0 text-primary after:absolute after:-inset-y-1.5 after:-inset-x-0.5"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { setTitle(project.title); setEditingTitle(false) }}
                        className="relative shrink-0 text-muted-foreground after:absolute after:-inset-y-1.5 after:-inset-x-0.5"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <h2 className="truncate text-lg font-semibold leading-tight">{project.title}</h2>
                      {project.archived && (
                        <span className="shrink-0 rounded-full border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Archived
                        </span>
                      )}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Started {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" onClick={handleOpenTimeline}>
                    <GanttChartSquare className="h-3.5 w-3.5 mr-1.5" />
                    Open timeline
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem className="text-muted-foreground" onClick={() => setEditingTitle(true)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-muted-foreground" onClick={() => setDuplicateOpen(true)}>
                        <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                      </DropdownMenuItem>
                      {folders.length > 0 && (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="text-muted-foreground">
                            <FolderInput className="h-3.5 w-3.5 mr-2" /> Move to folder
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {project.folder_id && (
                              <DropdownMenuItem
                                className="text-muted-foreground"
                                onClick={() => handleMoveToFolder(null)}
                              >
                                <FolderMinus className="h-3.5 w-3.5 mr-2" /> Remove from folder
                              </DropdownMenuItem>
                            )}
                            {folders.map((folder) => (
                              <DropdownMenuItem
                                key={folder.id}
                                disabled={folder.id === project.folder_id}
                                onClick={() => handleMoveToFolder(folder.id)}
                              >
                                {folder.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      )}
                      {project.archived ? (
                        <DropdownMenuItem className="text-muted-foreground" onClick={handleUnarchive}>
                          <ArchiveRestore className="h-3.5 w-3.5 mr-2" /> Unarchive
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem className="text-muted-foreground" onClick={handleArchive}>
                          <Archive className="h-3.5 w-3.5 mr-2" /> Archive
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setConfirmDelete(true)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <Field label="Description">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={saveDescription}
                  placeholder="No description yet"
                  className="min-h-32 bg-background text-xs"
                />
              </Field>

              <Field label="Stats">
                <div className="space-y-2 rounded-lg border border-border bg-background/50 p-3">
                  <StatRow label="Words" value={stats.wordCount} />
                  <StatRow label="Events" value={stats.eventCount} />
                  <StatRow label="Chapters" value={stats.chapterCount} />
                  <StatRow label="Characters" value={stats.characterCount} />
                </div>
              </Field>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DuplicateProjectDialog project={project} open={duplicateOpen} onOpenChange={setDuplicateOpen} />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete <strong>{project.title}</strong> and all its layers and events. This cannot be undone.
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value.toLocaleString()}</span>
    </div>
  )
}

// Ported from the old ProjectCard.tsx (pre-redesign) — same upload/drag-drop/
// remove logic, resized from a landscape card-top strip to a portrait
// 150px-wide 2:3 thumbnail rounded on all corners, since it no longer sits
// flush against a card edge.
function ProjectCoverImage({
  projectId,
  imagePath,
  displayUrl,
  onUpdated,
}: {
  projectId: string
  imagePath: string | null
  displayUrl: string | null
  onUpdated: (next: { imagePath: string | null; url: string | null }) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function uploadFile(file: File) {
    setError(null)
    if (!isAcceptedImage(file)) {
      setError('Use a JPG, PNG, GIF or WebP image.')
      return
    }
    setUploading(true)
    try {
      const supabase = createClient()
      const safeName = file.name.replace(/\s+/g, '-')
      const path = `projects/${projectId}/${Date.now()}-${safeName}`

      const { error: uploadErr } = await supabase.storage.from('attachments').upload(path, file)
      if (uploadErr) throw uploadErr

      const { data, error: signError } = await supabase.storage
        .from('attachments')
        .createSignedUrl(path, 60 * 60 * 24)
      if (signError || !data) throw signError ?? new Error('Failed to create signed URL')

      const previousPath = imagePath
      // Row first: only once it points at the new file is it safe to show it
      // and delete the old one. On failure the row still has the old cover,
      // so drop the new upload instead.
      const result = await settle(updateProject(projectId, { cover_image_url: path }))
      if ('error' in result) {
        supabase.storage.from('attachments').remove([path]).catch(() => {})
        throw new Error(result.error)
      }
      onUpdated({ imagePath: path, url: data.signedUrl })

      if (previousPath) {
        supabase.storage.from('attachments').remove([previousPath]).catch(() => {})
      }
    } catch (err) {
      console.error('Project cover upload error:', err)
      setError('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    if (!imagePath) return
    const path = imagePath
    setError(null)
    // Clear the row first; the file is only deleted once nothing points at it.
    const result = await settle(updateProject(projectId, { cover_image_url: null }))
    if ('error' in result) {
      setError('Failed to remove image')
      return
    }
    onUpdated({ imagePath: null, url: null })
    createClient().storage.from('attachments').remove([path]).catch(() => {})
  }

  return (
    <div
      className="group/cover relative aspect-2/3 w-37.5 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-primary"
      onClick={() => !uploading && fileInputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const file = e.dataTransfer.files?.[0]
        if (file) uploadFile(file)
      }}
    >
      {displayUrl && <img src={displayUrl} alt="" className="h-full w-full object-cover" />}

      <div className="absolute inset-0 flex items-center justify-center bg-background/70 opacity-0 transition-opacity group-hover/cover:opacity-100">
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin text-foreground" />
        ) : (
          <span className="text-xs font-medium text-foreground px-2 text-center">
            {displayUrl ? 'Click or drag to replace' : 'Click or drag to add a cover'}
          </span>
        )}
      </div>

      {/* Mobile has no hover to discover the overlay above, so this corner
          badge stays persistently visible below md instead. */}
      <div
        className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm md:hidden"
        title={displayUrl ? 'Replace cover image' : 'Add cover image'}
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
      </div>

      {displayUrl && !uploading && (
        <button
          onClick={handleRemove}
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-100 md:opacity-0 shadow-sm transition-opacity hover:text-destructive md:group-hover/cover:opacity-100 after:absolute after:-inset-2.5"
          title="Remove cover image"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) uploadFile(file)
        }}
      />

      {error && (
        <p className="absolute bottom-1 left-1.5 right-1.5 text-[10px] text-destructive bg-card/90 rounded px-1">
          {error}
        </p>
      )}
    </div>
  )
}

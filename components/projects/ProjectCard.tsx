'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontal, Archive, ArchiveRestore, Trash2, FolderInput, FolderMinus, Pencil, Copy, Check, X, Camera, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DuplicateProjectDialog } from './DuplicateProjectDialog'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { deleteProject, archiveProject, unarchiveProject, moveProjectToFolder, updateProject } from '@/actions/projects'
import type { ProjectFolder } from '@/types/database'
import type { ProjectWithCover } from '@/actions/projects'
import { useRef, useState } from 'react'

export interface ProjectStats {
  wordCount: number
  eventCount: number
  chapterCount: number
  characterCount: number
}

interface ProjectCardProps {
  project: ProjectWithCover
  folders?: ProjectFolder[]
  stats: ProjectStats
}

export function ProjectCard({ project, folders = [], stats }: ProjectCardProps) {
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(project.title)
  // Local, optimistic mirror of the two cover fields — same convention as
  // `title` above rather than the usePanels/usePlaces hook pattern, since
  // ProjectCard has no such hook backing it. updateProject's revalidatePath
  // already refreshes the server-fetched props on next navigation; matching
  // how handleRenameTitle doesn't force a router.refresh() either.
  const [cover, setCover] = useState({
    imagePath: project.cover_image_url,
    url: project.cover_url,
  })

  async function handleDelete() {
    setLoading(true)
    await deleteProject(project.id)
    setConfirmDelete(false)
    setLoading(false)
    router.refresh()
  }

  async function handleArchive() {
    await archiveProject(project.id)
    router.refresh()
  }

  async function handleUnarchive() {
    await unarchiveProject(project.id)
    router.refresh()
  }

  async function handleRenameTitle() {
    if (!title.trim() || title === project.title) {
      setTitle(project.title)
      setEditingTitle(false)
      return
    }
    await updateProject(project.id, { title: title.trim() })
    setEditingTitle(false)
    router.refresh()
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleRenameTitle()
    if (e.key === 'Escape') {
      setTitle(project.title)
      setEditingTitle(false)
    }
  }

  async function handleMoveToFolder(folderId: string | null) {
    await moveProjectToFolder(project.id, folderId)
    router.refresh()
  }

  return (
    <>
      <div className={cn(
        'group relative rounded-xl border border-border bg-card',
        'hover:shadow-md transition-all duration-150',
        project.archived && 'opacity-60 hover:opacity-100'
      )}>
        <ProjectCoverImage
          projectId={project.id}
          imagePath={cover.imagePath}
          displayUrl={cover.url}
          onUpdated={setCover}
        />

        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            {editingTitle ? (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  onBlur={handleRenameTitle}
                  className="min-w-0 flex-1 text-sm font-semibold bg-background border border-border rounded px-1.5 py-0.5 outline-none focus:border-primary"
                />
                <button
                  onClick={handleRenameTitle}
                  className="relative text-primary shrink-0 after:absolute after:-inset-y-1.5 after:-inset-x-0.5"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { setTitle(project.title); setEditingTitle(false) }}
                  className="relative text-muted-foreground shrink-0 after:absolute after:-inset-y-1.5 after:-inset-x-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="min-w-0 truncate font-semibold text-sm leading-tight hover:text-primary transition-colors">
                    {title}
                  </h3>
                  {project.archived && (
                    <span className="shrink-0 rounded-full border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Archived
                    </span>
                  )}
                </div>
                {project.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {project.description}
                  </p>
                )}
              </Link>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-7 w-7 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0 after:absolute after:-inset-y-2 after:-inset-x-1.5"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-muted-foreground"
                  onClick={() => setEditingTitle(true)}
                >
                  <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-muted-foreground"
                  onClick={() => setDuplicateOpen(true)}
                >
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
                  <DropdownMenuItem
                    className="text-muted-foreground"
                    onClick={handleUnarchive}
                  >
                    <ArchiveRestore className="h-3.5 w-3.5 mr-2" /> Unarchive
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="text-muted-foreground"
                    onClick={handleArchive}
                  >
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

          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
          </span>

          <div className="flex items-center gap-4">
            <StatItem value={stats.wordCount} label="words" />
            <StatItem value={stats.eventCount} label="events" />
            <StatItem value={stats.chapterCount} label="chapters" />
            <StatItem value={stats.characterCount} label="characters" />
          </div>
        </div>
      </div>

      <DuplicateProjectDialog project={project} open={duplicateOpen} onOpenChange={setDuplicateOpen} />

      {/* Delete confirmation dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete <strong>{project.title}</strong> and all its layers and events. This cannot be undone.
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-sm font-semibold leading-none">{value.toLocaleString()}</span>
      <span className="mt-0.5 text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}

// Replaces the old decorative color strip. Reserves the same height whether
// or not a cover is set (falls back to a plain bg-primary block) so cards
// stay aligned across the grid regardless of which ones have images.
// Named group (group/cover) because the outer card is itself an unnamed
// .group for its own hover-reveal controls — nesting two plain .group
// elements would make the outer hover also trigger this one's
// group-hover: utilities. Same fix PanelCard.tsx already uses (group/image).
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
      onUpdated({ imagePath: path, url: data.signedUrl })
      await updateProject(projectId, { cover_image_url: path })

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
    onUpdated({ imagePath: null, url: null })
    await updateProject(projectId, { cover_image_url: null })
    createClient().storage.from('attachments').remove([path]).catch(() => {})
  }

  return (
    <div
      className="group/cover relative h-20 w-full overflow-hidden rounded-t-xl cursor-pointer bg-primary"
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
        accept="image/jpeg,image/png,image/gif,image/webp"
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
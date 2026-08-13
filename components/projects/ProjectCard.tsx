'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontal, Archive, ArchiveRestore, Trash2, FolderInput, FolderMinus } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { deleteProject, archiveProject, unarchiveProject, moveProjectToFolder } from '@/actions/projects'
import type { Project, ProjectFolder } from '@/types/database'
import { useState } from 'react'

export interface ProjectStats {
  wordCount: number
  eventCount: number
  chapterCount: number
  characterCount: number
}

interface ProjectCardProps {
  project: Project
  folders?: ProjectFolder[]
  stats: ProjectStats
}

export function ProjectCard({ project, folders = [], stats }: ProjectCardProps) {
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loading, setLoading] = useState(false)

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
        {/* Color strip */}
        <div className="h-2 rounded-t-xl bg-primary" />

        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="min-w-0 truncate font-semibold text-sm leading-tight hover:text-primary transition-colors">
                  {project.title}
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
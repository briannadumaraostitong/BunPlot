'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { MoreHorizontal, Archive, Trash2, FolderInput, FolderMinus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { deleteProject, archiveProject, moveProjectToFolder } from '@/actions/projects'
import type { Project, ProjectFolder } from '@/types/database'
import { useState } from 'react'

interface ProjectCardProps {
  project: Project
  folders?: ProjectFolder[]
}

export function ProjectCard({ project, folders = [] }: ProjectCardProps) {
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

  async function handleMoveToFolder(folderId: string | null) {
    await moveProjectToFolder(project.id, folderId)
    router.refresh()
  }

  return (
    <>
      <div className={cn(
        'group relative rounded-xl border border-border bg-card',
        'hover:shadow-md transition-all duration-150'
      )}>
        {/* Color strip */}
        <div className="h-2 rounded-t-xl bg-primary" />

        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm leading-tight truncate hover:text-primary transition-colors">
                {project.title}
              </h3>
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
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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
                <DropdownMenuItem
                  className="text-muted-foreground"
                  onClick={handleArchive}
                >
                  <Archive className="h-3.5 w-3.5 mr-2" /> Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs capitalize">
              {project.mode}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
            </span>
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
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronDown, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProjectCard, type ProjectStats } from '@/components/projects/ProjectCard'
import { updateFolder, deleteFolder } from '@/actions/folders'
import type { Project, ProjectFolder } from '@/types/database'

interface FolderSectionProps {
  folder: ProjectFolder
  projects: Project[]
  allFolders: ProjectFolder[]
  statsByProject: Record<string, ProjectStats>
}

export function FolderSection({ folder, projects, allFolders, statsByProject }: FolderSectionProps) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(folder.collapsed)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(folder.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleToggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    await updateFolder(folder.id, { collapsed: next })
    router.refresh()
  }

  async function handleRename() {
    if (!name.trim() || name === folder.name) {
      setName(folder.name)
      setEditing(false)
      return
    }
    await updateFolder(folder.id, { name: name.trim() })
    setEditing(false)
    router.refresh()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleRename()
    if (e.key === 'Escape') {
      setName(folder.name)
      setEditing(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    await deleteFolder(folder.id)
    setConfirmDelete(false)
    setDeleting(false)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="group flex items-center gap-1.5">
        <button
          onClick={handleToggleCollapsed}
          className="text-muted-foreground hover:text-foreground p-0.5 shrink-0"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {editing ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleRename}
              className="text-sm font-semibold bg-background border border-border rounded px-1.5 py-0.5 outline-none focus:border-primary"
            />
            <button onClick={handleRename} className="text-primary shrink-0">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { setName(folder.name); setEditing(false) }}
              className="text-muted-foreground shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <h2
            className="text-sm font-semibold cursor-pointer"
            title="Double-click to rename"
            onDoubleClick={() => setEditing(true)}
          >
            {folder.name}
          </h2>
        )}

        <span className="text-xs text-muted-foreground">
          {projects.length}
        </span>

        {!editing && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="ml-1 text-muted-foreground hover:text-destructive p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!collapsed && (
        projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                folders={allFolders}
                stats={statsByProject[project.id]}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground pl-6">No projects in this folder yet</p>
        )
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete folder?</DialogTitle>
            <DialogDescription className="sr-only">
              Confirm deleting this folder
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will delete <strong>{folder.name}</strong>. Projects inside will not be deleted — they&apos;ll become ungrouped.
          </p>
          <div className="flex gap-2 justify-end mt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

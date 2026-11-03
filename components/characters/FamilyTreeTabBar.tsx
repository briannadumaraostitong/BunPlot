'use client'

import { useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RenameHint } from '@/components/ui/rename-hint'
import { RenameButton } from '@/components/ui/rename-button'
import type { FamilyTree } from '@/types/database'

interface FamilyTreeTabBarProps {
  trees: FamilyTree[]
  activeId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

export function FamilyTreeTabBar({
  trees,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}: FamilyTreeTabBarProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const pendingDeleteTree = trees.find((t) => t.id === pendingDeleteId) ?? null

  return (
    <>
      <div className="flex h-8 shrink-0 items-center gap-0.5 border-b border-border bg-background px-2 overflow-x-auto scrollbar-thin">
        {trees.map((tree) => (
          <FamilyTreeTab
            key={tree.id}
            tree={tree}
            active={tree.id === activeId}
            canDelete={trees.length > 1}
            onSelect={() => onSelect(tree.id)}
            onRename={(name) => onRename(tree.id, name)}
            onDelete={() => setPendingDeleteId(tree.id)}
          />
        ))}
        <button
          type="button"
          onClick={onAdd}
          title="New family tree"
          className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground after:absolute after:-inset-y-1 after:-inset-x-0.5"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <Dialog open={pendingDeleteTree !== null} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete family tree?</DialogTitle>
            <DialogDescription>
              <strong className="text-foreground">{pendingDeleteTree?.name}</strong>{' '}
              and its layout will be deleted. The characters and their relationships stay.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setPendingDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (pendingDeleteId) onDelete(pendingDeleteId)
                setPendingDeleteId(null)
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function FamilyTreeTab({
  tree,
  active,
  canDelete,
  onSelect,
  onRename,
  onDelete,
}: {
  tree: FamilyTree
  active: boolean
  canDelete: boolean
  onSelect: () => void
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(tree.name)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEditing() {
    setName(tree.name)
    setEditing(true)
  }

  function commitRename() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === tree.name) {
      setName(tree.name)
    } else {
      onRename(trimmed)
    }
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') {
      setName(tree.name)
      setEditing(false)
    }
  }

  return (
    <div
      onClick={onSelect}
      onDoubleClick={startEditing}
      data-slot="tree-tab"
      data-active={active || undefined}
      className={cn(
        // isolate + after:-z-10 keeps the enlarged hit area behind the tab's
        // own content, so it extends the tap target without covering the
        // input, the rename pencil or the delete ✕.
        'group relative isolate flex h-6 max-w-40 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors select-none after:absolute after:-inset-y-1 after:-inset-x-0.5 after:-z-10',
        active
          ? 'bg-secondary text-foreground'
          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
      )}
    >
      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitRename}
          onClick={(e) => e.stopPropagation()}
          className="w-28 rounded border border-border bg-background px-1 py-0 text-base md:text-xs outline-none focus:border-primary"
        />
      ) : (
        <RenameHint name={tree.name}>
          <span className="truncate">{tree.name}</span>
        </RenameHint>
      )}

      {/* Active tab only: the tabs are narrow (max-w-40), and a tap on another
          tab first selects it. */}
      {!editing && active && <RenameButton onClick={startEditing} label="Rename family tree" />}

      {!editing && canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          title="Delete family tree"
          className="relative shrink-0 text-muted-foreground opacity-100 md:can-hover:opacity-0 transition-opacity hover:text-destructive md:group-hover:opacity-100 after:absolute after:-inset-y-1 after:-inset-x-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

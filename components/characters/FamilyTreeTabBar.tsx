'use client'

import { useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
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
  return (
    <div className="flex h-8 shrink-0 items-center gap-0.5 border-b border-border bg-background px-2 overflow-x-auto scrollbar-thin">
      {trees.map((tree) => (
        <FamilyTreeTab
          key={tree.id}
          tree={tree}
          active={tree.id === activeId}
          canDelete={trees.length > 1}
          onSelect={() => onSelect(tree.id)}
          onRename={(name) => onRename(tree.id, name)}
          onDelete={() => onDelete(tree.id)}
        />
      ))}
      <button
        type="button"
        onClick={onAdd}
        title="New family tree"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
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
      title={editing ? undefined : `${tree.name} — double-click to rename`}
      className={cn(
        'group relative flex h-6 max-w-40 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors select-none',
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
          className="w-28 rounded border border-border bg-background px-1 py-0 text-xs outline-none focus:border-primary"
        />
      ) : (
        <span className="truncate">{tree.name}</span>
      )}

      {!editing && canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          title="Delete family tree"
          className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

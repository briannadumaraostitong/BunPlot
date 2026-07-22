'use client'

import { useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Outline } from '@/types/database'

interface OutlineTabBarProps {
  outlines: Outline[]
  activeId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
}

function hasTextContent(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false
  const obj = node as Record<string, unknown>
  if (typeof obj.text === 'string' && obj.text.trim().length > 0) return true
  if (Array.isArray(obj.content)) return obj.content.some(hasTextContent)
  return false
}

export function OutlineTabBar({
  outlines,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}: OutlineTabBarProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const pendingDeleteOutline = outlines.find((o) => o.id === pendingDeleteId) ?? null

  function requestDelete(outline: Outline) {
    if (hasTextContent(outline.content)) {
      setPendingDeleteId(outline.id)
    } else {
      onDelete(outline.id)
    }
  }

  return (
    <>
      <div className="flex h-8 shrink-0 items-center gap-0.5 border-b border-border bg-background px-2 overflow-x-auto scrollbar-thin">
        {outlines.map((outline) => (
          <OutlineTab
            key={outline.id}
            outline={outline}
            active={outline.id === activeId}
            onSelect={() => onSelect(outline.id)}
            onRename={(name) => onRename(outline.id, name)}
            onDeleteRequest={() => requestDelete(outline)}
          />
        ))}
        <button
          type="button"
          onClick={onAdd}
          title="New document"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <Dialog
        open={pendingDeleteOutline !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              <strong className="text-foreground">{pendingDeleteOutline?.name}</strong> has
              content. Deleting it cannot be undone.
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

function OutlineTab({
  outline,
  active,
  onSelect,
  onRename,
  onDeleteRequest,
}: {
  outline: Outline
  active: boolean
  onSelect: () => void
  onRename: (name: string) => void
  onDeleteRequest: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(outline.name)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEditing() {
    setName(outline.name)
    setEditing(true)
  }

  function commitRename() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === outline.name) {
      setName(outline.name)
    } else {
      onRename(trimmed)
    }
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') {
      setName(outline.name)
      setEditing(false)
    }
  }

  return (
    <div
      onClick={onSelect}
      onDoubleClick={startEditing}
      onContextMenu={(e) => {
        e.preventDefault()
        onDeleteRequest()
      }}
      title={editing ? undefined : `${outline.name} — double-click to rename`}
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
          className="w-24 rounded border border-border bg-background px-1 py-0 text-xs outline-none focus:border-primary"
        />
      ) : (
        <span className="truncate">{outline.name}</span>
      )}

      {!editing && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDeleteRequest()
          }}
          title="Delete document"
          className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

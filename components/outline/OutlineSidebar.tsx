'use client'

import { useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Download, FileText, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { RenameHint } from '@/components/ui/rename-hint'
import { RenameButton } from '@/components/ui/rename-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useIsBelowMd } from '@/hooks/useIsBelowMd'
import type { Outline } from '@/types/database'

interface OutlineSidebarProps {
  outlines: Outline[]
  activeId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onRename: (id: string, name: string) => void
  // Asks first when the document has content (see OutlineEditor).
  onDelete: (id: string) => void
  onExport: () => void
}

export function OutlineSidebar({
  outlines,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  onExport,
}: OutlineSidebarProps) {
  // null until the chevron is used: until then the sidebar follows the
  // breakpoint (collapsed below md); after that it keeps the user's choice.
  const isBelowMd = useIsBelowMd()
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null)
  const collapsed = userCollapsed ?? isBelowMd

  return (
    <div
      className={cn(
        'flex flex-col border-r border-border bg-sidebar shrink-0 transition-all duration-200',
        collapsed ? 'w-10' : 'w-52'
      )}
    >
      <div className="h-10 border-b border-border flex items-center justify-between px-2 shrink-0">
        {!collapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider transition-colors hover:text-foreground">
                File
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onAdd}>
                <Plus className="h-3.5 w-3.5 mr-2" />
                New document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport}>
                <Download className="h-3.5 w-3.5 mr-2" />
                Export...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-6 w-6 ml-auto after:absolute after:-inset-2.5"
          onClick={() => setUserCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
          {outlines.length === 0 ? (
            <p className="px-3 py-4 text-[11px] text-muted-foreground text-center">No documents yet</p>
          ) : (
            outlines.map((outline) => (
              <OutlineRow
                key={outline.id}
                outline={outline}
                active={outline.id === activeId}
                onSelect={() => onSelect(outline.id)}
                onRename={(name) => onRename(outline.id, name)}
                onDeleteRequest={() => onDelete(outline.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function OutlineRow({
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
      className={cn(
        'group flex items-center gap-2 mx-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
        active ? 'bg-secondary' : 'hover:bg-secondary/50'
      )}
    >
      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitRename}
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 rounded border border-border bg-background px-1 py-0 text-sm md:text-xs outline-none focus:border-primary"
        />
      ) : (
        <RenameHint name={outline.name}>
          <span className="flex-1 min-w-0 truncate text-xs">{outline.name}</span>
        </RenameHint>
      )}

      {!editing && <RenameButton onClick={startEditing} label="Rename document" />}

      {!editing && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDeleteRequest()
          }}
          title="Delete document"
          className="relative shrink-0 p-0.5 text-muted-foreground opacity-100 md:can-hover:opacity-0 transition-opacity hover:text-destructive md:group-hover:opacity-100 after:absolute after:-inset-1.5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

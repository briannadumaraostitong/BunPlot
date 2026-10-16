'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, FileText, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { RenameHint } from '@/components/ui/rename-hint'
import { RenameButton } from '@/components/ui/rename-button'
import { useIsBelowMd } from '@/hooks/useIsBelowMd'
import { useInlineRename } from '@/hooks/useInlineRename'
import type { Outline } from '@/types/database'

interface OutlineSidebarProps {
  outlines: Outline[]
  activeId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onRename: (id: string, name: string) => void
  // Asks first when the document has content (see OutlineEditor).
  onDelete: (id: string) => void
}

export function OutlineSidebar({
  outlines,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
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
      <div className="h-10 border-b border-border flex items-center justify-between gap-2.5 px-2 shrink-0">
        {!collapsed && (
          <>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Documents
            </span>
            {/* Rename, export and delete are in the menu bar's File menu. */}
            <Button
              variant="ghost"
              size="icon"
              title="New document"
              aria-label="New document"
              className="relative h-6 w-6 ml-auto after:absolute after:-inset-x-1 after:-inset-y-2.5"
              onClick={onAdd}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative h-6 w-6 after:absolute after:-inset-2.5', collapsed && 'ml-auto')}
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
  const rename = useInlineRename(outline.name, onRename)

  return (
    <div
      onClick={onSelect}
      onDoubleClick={rename.start}
      className={cn(
        'group flex items-center gap-2 mx-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
        active ? 'bg-secondary' : 'hover:bg-secondary/50'
      )}
    >
      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

      {rename.editing ? (
        <input
          autoFocus
          value={rename.draft}
          onChange={(e) => rename.setDraft(e.target.value)}
          onKeyDown={rename.onKeyDown}
          onBlur={rename.commit}
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 rounded border border-border bg-background px-1 py-0 text-sm md:text-xs outline-none focus:border-primary"
        />
      ) : (
        <RenameHint name={outline.name}>
          <span className="flex-1 min-w-0 truncate text-xs">{outline.name}</span>
        </RenameHint>
      )}

      {!rename.editing && <RenameButton onClick={rename.start} label="Rename document" />}

      {!rename.editing && (
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

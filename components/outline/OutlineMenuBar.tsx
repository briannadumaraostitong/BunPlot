'use client'

import { Fragment, useRef } from 'react'
import { Download, MoreHorizontal, Pencil, Plus, TextSelect, Trash2, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from '@/components/ui/menubar'
import { useInlineRename } from '@/hooks/useInlineRename'
import { cn } from '@/lib/utils'
import type { ToolbarTool } from '@/components/outline/OutlineEditor'

// Only shortcuts Tiptap already binds, keyed by toolbar tool id. Written as
// Tiptap writes them; formatShortcut turns them into ⌘/Ctrl labels.
const SHORTCUTS: Record<string, string[]> = {
  undo: ['Mod', 'Z'],
  redo: ['Mod', 'Shift', 'Z'],
  bold: ['Mod', 'B'],
  italic: ['Mod', 'I'],
  underline: ['Mod', 'U'],
  strike: ['Mod', 'Shift', 'S'],
  h1: ['Mod', 'Alt', '1'],
  h2: ['Mod', 'Alt', '2'],
  h3: ['Mod', 'Alt', '3'],
  bullet: ['Mod', 'Shift', '8'],
  ordered: ['Mod', 'Shift', '7'],
  quote: ['Mod', 'Shift', 'B'],
  'align-left': ['Mod', 'Shift', 'L'],
  'align-center': ['Mod', 'Shift', 'E'],
  'align-right': ['Mod', 'Shift', 'R'],
  'align-justify': ['Mod', 'Shift', 'J'],
}
const SELECT_ALL_SHORTCUT = ['Mod', 'A']

// Format's tools, in toolbar order; a change of group puts a separator between them.
const FORMAT_GROUPS = [0, 1, 2, 3]

const MAC_SYMBOLS: Record<string, string> = { Alt: '⌥', Shift: '⇧', Mod: '⌘' }

// Mac lists modifiers as ⌥⇧⌘ before the key; elsewhere it's Ctrl+Shift+Z.
function formatShortcut(keys: string[], mac: boolean) {
  const key = keys[keys.length - 1]
  const mods = keys.slice(0, -1)
  if (mac) return ['Alt', 'Shift', 'Mod'].filter((m) => mods.includes(m)).map((m) => MAC_SYMBOLS[m]).join('') + key
  return [...mods.map((m) => (m === 'Mod' ? 'Ctrl' : m)), key].join('+')
}

interface OutlineMenuBarProps {
  name: string
  tools: ToolbarTool[]
  onAdd: () => void
  onRename: (name: string) => void
  onExport: () => void
  onDelete: () => void
  onSelectAll: () => void
  // Shown at the end of the row (word count and save status).
  children?: React.ReactNode
}

interface FileItem {
  id: string
  label: string
  icon: LucideIcon
  onSelect: () => void
  destructive?: boolean
}

// Section labels in the phone menu, as in ThemeToggle's menu.
const PHONE_LABEL = 'px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'

// Docs-style menu bar above the formatting toolbar: the document's name,
// renamable in place, then File, Edit, Insert and Format. Edit, Insert and
// Format run the toolbar's own tools, so the two can't drift apart. Phones
// get the name and one ⋯ menu with File and Edit; the toolbar already has
// everything in Insert and Format.
export function OutlineMenuBar({
  name,
  tools,
  onAdd,
  onRename,
  onExport,
  onDelete,
  onSelectAll,
  children,
}: OutlineMenuBarProps) {
  const rename = useInlineRename(name, onRename)
  // Set when a menu item runs, so closing that menu leaves focus where the
  // item put it (the editor, the title input or a dialog) instead of Radix
  // returning it to the trigger. Closing with Escape or a click outside still
  // returns it.
  const ranItem = useRef(false)
  // Only rendered on the client, after the outline loads, so reading
  // navigator here can't cause a hydration mismatch.
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)

  function run(action: () => void) {
    return () => {
      ranItem.current = true
      action()
    }
  }

  function handleCloseAutoFocus(e: Event) {
    if (ranItem.current) e.preventDefault()
    ranItem.current = false
  }

  function shortcut(keys: string[] | undefined) {
    if (!keys) return null
    return (
      <MenubarShortcut className={cn(!mac && 'tracking-normal')}>{formatShortcut(keys, mac)}</MenubarShortcut>
    )
  }

  // Filtered here rather than in the editor's render: the list holds the image
  // tool's handler, which uses a ref (see ToolbarTools).
  const byId = (id: string) => tools.find((t) => t.id === id)
  const formatTools = tools.filter((t) => FORMAT_GROUPS.includes(t.group))
  const editTools = ['undo', 'redo'].map(byId).filter((t): t is ToolbarTool => t !== undefined)
  const imageTool = byId('image')

  // Shared by the File menu and the phone menu. Delete comes last; the File
  // menu puts a separator before it, and in the phone menu the Edit section's
  // separator follows it.
  const fileItems: FileItem[] = [
    { id: 'new', label: 'New document', icon: Plus, onSelect: onAdd },
    { id: 'rename', label: 'Rename', icon: Pencil, onSelect: rename.start },
    { id: 'export', label: 'Export', icon: Download, onSelect: onExport },
    { id: 'delete', label: 'Delete', icon: Trash2, onSelect: onDelete, destructive: true },
  ]

  function toolItem(tool: ToolbarTool, label = tool.title) {
    return (
      <MenubarItem key={tool.id} disabled={tool.disabled} onSelect={run(tool.onClick)}>
        <tool.icon className={cn('size-3.5', tool.iconClassName)} />
        {label}
        {shortcut(SHORTCUTS[tool.id])}
      </MenubarItem>
    )
  }

  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-background px-2.5">
      {rename.editing ? (
        <input
          autoFocus
          aria-label="Document name"
          value={rename.draft}
          onChange={(e) => rename.setDraft(e.target.value)}
          onKeyDown={rename.onKeyDown}
          onBlur={rename.commit}
          className="h-7 w-64 min-w-0 rounded-md border border-border bg-background px-1.5 text-sm outline-none focus:border-primary"
        />
      ) : (
        <button
          type="button"
          onClick={rename.start}
          title="Rename document"
          className="relative h-7 min-w-0 max-w-64 truncate rounded-md px-1.5 text-sm font-medium transition-colors hover:bg-secondary after:absolute after:-inset-1"
        >
          {name}
        </button>
      )}

      <Menubar className="hidden h-auto shrink-0 gap-0 rounded-none border-0 p-0 md:flex">
        <Menu label="File" onCloseAutoFocus={handleCloseAutoFocus}>
          {fileItems.map((item) => (
            <Fragment key={item.id}>
              {item.destructive && <MenubarSeparator />}
              <MenubarItem variant={item.destructive ? 'destructive' : 'default'} onSelect={run(item.onSelect)}>
                <item.icon className="size-3.5" />
                {item.label}
              </MenubarItem>
            </Fragment>
          ))}
        </Menu>

        <Menu label="Edit" onCloseAutoFocus={handleCloseAutoFocus}>
          {editTools.map((tool) => toolItem(tool))}
          <MenubarSeparator />
          <MenubarItem onSelect={run(onSelectAll)}>
            <TextSelect className="size-3.5" />
            Select all
            {shortcut(SELECT_ALL_SHORTCUT)}
          </MenubarItem>
        </Menu>

        <Menu label="Insert" onCloseAutoFocus={handleCloseAutoFocus}>
          {imageTool && toolItem(imageTool, 'Image')}
        </Menu>

        <Menu label="Format" onCloseAutoFocus={handleCloseAutoFocus}>
          {formatTools.map((tool, i) => (
            <Fragment key={tool.id}>
              {i > 0 && tool.group !== formatTools[i - 1].group && <MenubarSeparator />}
              {toolItem(tool)}
            </Fragment>
          ))}
        </Menu>
      </Menubar>

      <div className="ml-auto flex shrink-0 items-center gap-3 text-xs">{children}</div>

      {/* Phones: File and Edit in one menu, without shortcuts. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Document menu"
            className="relative h-7 w-7 shrink-0 md:hidden after:absolute after:-inset-2"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        {/* Sized to its items: the default width is the trigger's, which for
            this small button wraps "New document". */}
        <DropdownMenuContent align="end" className="w-auto whitespace-nowrap" onCloseAutoFocus={handleCloseAutoFocus}>
          <DropdownMenuLabel className={PHONE_LABEL}>File</DropdownMenuLabel>
          {fileItems.map((item) => (
            <DropdownMenuItem
              key={item.id}
              variant={item.destructive ? 'destructive' : 'default'}
              onSelect={run(item.onSelect)}
            >
              <item.icon className="size-3.5" />
              {item.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className={PHONE_LABEL}>Edit</DropdownMenuLabel>
          {editTools.map((tool) => (
            <DropdownMenuItem key={tool.id} disabled={tool.disabled} onSelect={run(tool.onClick)}>
              <tool.icon className="size-3.5" />
              {tool.title}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onSelect={run(onSelectAll)}>
            <TextSelect className="size-3.5" />
            Select all
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function Menu({
  label,
  onCloseAutoFocus,
  children,
}: {
  label: string
  onCloseAutoFocus: (e: Event) => void
  children: React.ReactNode
}) {
  return (
    <MenubarMenu>
      <MenubarTrigger className="h-7 px-2 py-0 text-xs font-normal text-muted-foreground hover:bg-secondary hover:text-foreground aria-expanded:bg-secondary aria-expanded:text-foreground">
        {label}
      </MenubarTrigger>
      <MenubarContent onCloseAutoFocus={onCloseAutoFocus}>{children}</MenubarContent>
    </MenubarMenu>
  )
}

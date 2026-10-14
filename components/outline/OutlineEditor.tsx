'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, useEditorState, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import Blockquote from '@tiptap/extension-blockquote'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { ResizableImage, ImageTrailingParagraph, type ImageAlign } from '@/components/outline/ResizableImage'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ImageIcon,
  Loader2,
  PanelLeft,
  PanelRight,
  Download,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { SidebarRowSkeleton } from '@/components/ui/sidebar-skeleton-row'
import { createClient } from '@/lib/supabase/client'
import { getEditorJson } from '@/lib/editorJson'
import { dismissError, reportResult, settle } from '@/lib/notify'
import { clearBackup, pruneBackups } from '@/lib/editorBackup'
import { isSigningOut, registerFlusher, trackSave } from '@/lib/saveRegistry'
import { useEditorBackup } from '@/hooks/useEditorBackup'
import { RestoreBackupBanner } from '@/components/editor/RestoreBackupBanner'
import {
  getOutlines,
  createOutline,
  updateOutline,
  renameOutline,
  deleteOutline,
} from '@/actions/outline'
import { OutlineSidebar } from '@/components/outline/OutlineSidebar'
import { ExportOutlinesDialog } from '@/components/outline/ExportOutlinesDialog'
import { cn } from '@/lib/utils'
import type { Outline } from '@/types/database'

const AUTOSAVE_INTERVAL_MS = 30000

// The three layouts offered in the image's bubble menu. "In line" is center —
// the image on its own line; wrap left/right float it so text flows beside it.
const IMAGE_LAYOUTS = [
  { align: 'center', label: 'In line', icon: AlignCenter },
  { align: 'left', label: 'Wrap left', icon: PanelLeft },
  { align: 'right', label: 'Wrap right', icon: PanelRight },
] as const

type SaveStatus = 'saved' | 'saving' | 'error'

// One toast for every outline save failure, so a failing autosave interval
// updates the same toast instead of stacking them.
const SAVE_TOAST_ID = 'outline-save'

function countWords(text: string) {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

// Tracks in-flight `updateOutline` calls across unmount/remount of the Outline
// tab. The tab is fully unmounted when the user navigates away (see the
// activeTab conditional in the project page), so a save kicked off from an
// unmount cleanup can still be in flight when the tab remounts and re-fetches
// outlines — without this, the remount fetch can race the save and load the
// pre-save content. Keyed by outline id; lives at module scope so it survives
// the component unmounting.
const pendingOutlineSaves = new Map<string, Promise<unknown>>()

// Local backups around this save are handled by the caller (useEditorBackup's
// beforeSave/afterSave).
function saveOutline(id: string, content: Record<string, unknown>) {
  const promise = settle(updateOutline(id, content)).finally(() => {
    if (pendingOutlineSaves.get(id) === promise) {
      pendingOutlineSaves.delete(id)
    }
  })
  pendingOutlineSaves.set(id, promise)
  // Also tracked globally, so sign-out can wait for it.
  return trackSave(promise, (result) => !('error' in result))
}

interface OutlineEditorProps {
  projectId: string
}

export function OutlineEditor({ projectId }: OutlineEditorProps) {
  const [loading, setLoading] = useState(true)
  const [outlines, setOutlines] = useState<Outline[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  // Lives here rather than in OutlineSidebar so both the sidebar's File menu
  // and the top bar's Export button open the same dialog — and the button
  // keeps working while the sidebar is collapsed.
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Flush any save still in flight from the previous mount of this tab
      // before trusting a fresh fetch — otherwise this can race an unmount
      // save and load stale (pre-save) content.
      if (pendingOutlineSaves.size > 0) {
        await Promise.allSettled(pendingOutlineSaves.values())
      }
      const data = await getOutlines(projectId)
      if (cancelled) return
      // Only after a successful load: getOutlines returns [] on error (and a
      // successful load always has at least one outline), and pruning against
      // an empty list would wipe this project's backups exactly when they're needed.
      if (data.length > 0) pruneBackups('outline', projectId, data.map((o) => o.id))
      setOutlines(data)
      setActiveId(data[0]?.id ?? null)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  async function handleAdd() {
    const created = await settle(createOutline(projectId, 'Untitled'))
    if (!reportResult(created, "Couldn't create the outline.")) return
    setOutlines((prev) => [...prev, created])
    setActiveId(created.id)
  }

  async function handleRename(id: string, name: string) {
    const previous = outlines.find((o) => o.id === id)?.name
    setOutlines((prev) => prev.map((o) => (o.id === id ? { ...o, name } : o)))
    const result = await settle(renameOutline(id, name))
    // Put the old name back so the sidebar shows what's saved, unless it was
    // renamed again in the meantime.
    if (!reportResult(result, "Couldn't rename the outline.") && previous !== undefined) {
      setOutlines((prev) => prev.map((o) => (o.id === id && o.name === name ? { ...o, name: previous } : o)))
    }
  }

  async function handleDelete(id: string) {
    const result = await settle(deleteOutline(id, projectId))
    if (!reportResult(result, "Couldn't delete the outline.")) return
    clearBackup('outline', id)
    const remaining = outlines.filter((o) => o.id !== id)

    if (remaining.length === 0) {
      const created = await settle(createOutline(projectId, 'Outline'))
      if (reportResult(created, "Couldn't create a new outline.")) {
        setOutlines([created])
        setActiveId(created.id)
        return
      }
    }

    setOutlines(remaining)
    setActiveId((current) => (current === id ? (remaining[0]?.id ?? null) : current))
  }

  if (loading) {
    return (
      <div className="flex h-full overflow-hidden">
        {/* OutlineSidebar */}
        <div className="hidden md:flex w-52 flex-col border-r border-border shrink-0">
          <div className="h-10 border-b border-border flex items-center px-2">
            <Skeleton className="h-3 w-10" />
          </div>
          <div className="flex-1 py-1 space-y-0.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <SidebarRowSkeleton key={i} dot="none" />
            ))}
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Formatting toolbar */}
          <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-6 rounded-md" />
            ))}
          </div>

          {/* Document page — reuses the real page wrapper's own classes so
              its width/position is already correct at first paint. */}
          <div className="flex-1 min-h-0 overflow-hidden bg-secondary/10">
            <div className="mx-auto max-w-3xl bg-card px-16 py-12 space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const activeOutline = outlines.find((o) => o.id === activeId) ?? null

  return (
    <div className="flex h-full overflow-hidden">
      <OutlineSidebar
        outlines={outlines}
        activeId={activeId}
        onSelect={setActiveId}
        onAdd={handleAdd}
        onRename={handleRename}
        onDelete={handleDelete}
        onExport={() => setExportOpen(true)}
      />
      <div className="min-w-0 flex-1 overflow-hidden">
        {activeOutline && (
          <OutlineDocumentEditor
            key={activeOutline.id}
            outline={activeOutline}
            onExport={() => setExportOpen(true)}
          />
        )}
      </div>

      <ExportOutlinesDialog
        projectId={projectId}
        outlines={outlines}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />
    </div>
  )
}

function OutlineDocumentEditor({ outline, onExport }: { outline: Outline; onExport: () => void }) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [wordCount, setWordCount] = useState(0)
  const initialSerialized = JSON.stringify(outline.content ?? '')
  const lastSavedJson = useRef(initialSerialized)
  const latestJson = useRef(initialSerialized)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { backup, banner } = useEditorBackup({
    kind: 'outline',
    id: outline.id,
    projectId: outline.project_id,
    savedContent: outline.content,
    latestJson,
    lastSavedJson,
  })
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        underline: false,
        strike: false,
        blockquote: false,
      }),
      Underline,
      Strike,
      Blockquote,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      ResizableImage,
      ImageTrailingParagraph,
      Placeholder.configure({
        placeholder: 'Start writing your story outline...',
      }),
    ],
    content: outline.content ?? '',
    editorProps: {
      attributes: {
        class: 'outline-none text-base leading-relaxed min-h-full',
      },
    },
  })

  // useEditor doesn't re-render on selection-only changes, so the bubble
  // menu's highlight reads the selected image's alignment through this.
  const selectedImageAlign = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor?.isActive('image') ? ((editor.getAttributes('image').imageAlign as ImageAlign) ?? null) : null,
  })

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!editor) return true
    const json = getEditorJson(editor)
    const serialized = JSON.stringify(json)
    if (serialized === lastSavedJson.current) {
      // Edited back to what's already saved after a failed save: nothing is
      // unsaved any more.
      setSaveStatus((s) => (s === 'error' ? 'saved' : s))
      dismissError(SAVE_TOAST_ID)
      return true
    }

    setSaveStatus('saving')
    // Backed up before the request, so the edits survive even if it never
    // finishes (tab closed, crash), not only if it fails.
    backup.beforeSave(json)
    const result = await saveOutline(outline.id, json)
    // lastSavedJson stays as it was on failure, so the next interval or blur
    // tries again.
    if (!reportResult(result, "Couldn't save the outline. It will retry automatically.", { id: SAVE_TOAST_ID })) {
      setSaveStatus('error')
      return false
    }
    backup.afterSave(json)
    lastSavedJson.current = serialized
    setSaveStatus('saved')
    dismissError(SAVE_TOAST_ID)
    return true
  }, [editor, outline.id, backup])

  // Sign-out saves this editor first (see flushAllEdits).
  useEffect(() => registerFlusher(handleSave), [handleSave])

  useEffect(() => {
    const interval = setInterval(handleSave, AUTOSAVE_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [handleSave])

  useEffect(() => {
    if (!editor) return
    editor.on('blur', handleSave)
    return () => {
      editor.off('blur', handleSave)
    }
  }, [editor, handleSave])

  useEffect(() => {
    if (!editor) return
    function handleUpdate() {
      latestJson.current = JSON.stringify(editor!.getJSON())
      setWordCount(countWords(editor!.getText()))
    }
    function handleEdit() {
      handleUpdate()
      backup.noteEdit()
    }
    handleUpdate() // set the initial count on mount, not just on the first edit
    editor.on('update', handleEdit)
    return () => {
      editor.off('update', handleEdit)
    }
  }, [editor, backup])

  useEffect(() => {
    return () => {
      // Signing out was confirmed with these edits unsaved; saving now would
      // only fail.
      if (isSigningOut()) return
      // isUnsaved ignores key order, so opening and leaving an outline
      // doesn't re-save it.
      if (backup.isUnsaved()) {
        // Parsed from the serialized snapshot, so already plain JSON (see
        // getEditorJson) — and safe to read after the editor is torn down.
        // The editor is gone, so there's no retry — the toast (from the root
        // Toaster) is the only sign the last edits didn't make it.
        const content = JSON.parse(latestJson.current)
        backup.beforeSave(content)
        saveOutline(outline.id, content).then((result) => {
          if (reportResult(result, "Couldn't save the outline.", { id: SAVE_TOAST_ID })) backup.afterSave(content)
        })
      }
    }
  }, [outline.id, backup])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !editor) return

    setImageError(null)
    setUploadingImage(true)

    try {
      const supabase = createClient()
      const safeName = file.name.replace(/\s+/g, '-')
      const path = `outlines/${outline.project_id}/${Date.now()}-${safeName}`

      const { error: uploadErr } = await supabase.storage.from('attachments').upload(path, file)
      if (uploadErr) throw uploadErr

      // 'attachments' is a private bucket, so a public URL would 403 — use a
      // long-lived signed URL instead (10 years) since the image is embedded
      // directly in saved outline content.
      const { data, error: signError } = await supabase.storage
        .from('attachments')
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10)
      if (signError || !data) throw signError ?? new Error('Failed to create signed URL')

      // New images start wrapped left, so the natural flow is insert, shrink,
      // type beside it. Existing images keep whatever alignment they have.
      editor
        .chain()
        .focus()
        .insertContent({ type: 'image', attrs: { src: data.signedUrl, imageAlign: 'left' } })
        .run()
    } catch (error) {
      console.error('Image upload error:', error)
      setImageError('Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  function setAlign(align: 'left' | 'center' | 'right' | 'justify') {
    if (!editor) return
    if (editor.isActive('image')) {
      editor.chain().focus().setImageAlign(align).run()
    } else {
      editor.chain().focus().setTextAlign(align).run()
    }
  }

  function isAlignActive(align: 'left' | 'center' | 'right' | 'justify') {
    if (!editor) return false
    return editor.isActive('image')
      ? editor.isActive('image', { imageAlign: align })
      : editor.isActive({ textAlign: align })
  }

  if (!editor) return null

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4 py-2">
        <div className="flex flex-wrap items-center gap-0.5">
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Underline"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </ToolbarBtn>

          <Separator orientation="vertical" className="h-4 mx-2" />

          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </ToolbarBtn>

          <Separator orientation="vertical" className="h-4 mx-2" />

          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet list"
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Numbered list"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Blockquote"
          >
            <Quote className="h-3.5 w-3.5" />
          </ToolbarBtn>

          <Separator orientation="vertical" className="h-4 mx-2" />

          <ToolbarBtn onClick={() => setAlign('left')} active={isAlignActive('left')} title="Align left">
            <AlignLeft className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => setAlign('center')}
            active={isAlignActive('center')}
            title="Align center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => setAlign('right')} active={isAlignActive('right')} title="Align right">
            <AlignRight className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => setAlign('justify')} active={isAlignActive('justify')} title="Justify">
            <AlignJustify className="h-3.5 w-3.5" />
          </ToolbarBtn>

          <Separator orientation="vertical" className="h-4 mx-2" />

          <ToolbarBtn
            onClick={() => fileInputRef.current?.click()}
            title="Insert image"
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5" />
            )}
          </ToolbarBtn>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        <div className="flex shrink-0 items-center gap-3 text-xs">
          {imageError && <span className="text-destructive">{imageError}</span>}
          <span className="text-muted-foreground">
            {wordCount} word{wordCount === 1 ? '' : 's'}
          </span>
          {saveStatus === 'saving' ? (
            <span className="text-muted-foreground">Saving...</span>
          ) : saveStatus === 'error' ? (
            <span className="text-destructive">Not saved</span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-500">Saved ✓</span>
          )}
          {/* Same button as the Timeline and Panels tabs' Export, so every tab
              puts its export in the same place. Also in the sidebar's File
              menu, but this one stays visible when the sidebar is collapsed. */}
          <button
            onClick={onExport}
            aria-label="Export manuscript"
            className="relative ml-auto flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground after:absolute after:-inset-1 md:px-2.5"
          >
            <Download className="h-3 w-3" />
            <span className="hidden md:inline">Export</span>
          </button>
        </div>
      </div>

      <RestoreBackupBanner
        banner={banner}
        onApply={(content) => {
          editor?.commands.setContent(content, { emitUpdate: true })
          void handleSave()
        }}
      />

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin bg-secondary/10">
        <div className="mx-auto max-w-3xl bg-card px-16 py-12 min-h-full">
          <BubbleMenu
            editor={editor}
            shouldShow={({ editor }) => editor.isActive('image')}
            options={{ placement: 'top', offset: 8 }}
          >
            <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-1 shadow-md">
              {IMAGE_LAYOUTS.map(({ align, label, icon: Icon }) => {
                // Anything that isn't a wrap (center, justify, unset) reads as "In line".
                const active =
                  align === 'center'
                    ? selectedImageAlign !== 'left' && selectedImageAlign !== 'right'
                    : selectedImageAlign === align
                return (
                  <button
                    key={align}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      editor.chain().focus().setImageAlign(align).run()
                    }}
                    className={cn(
                      'flex h-7 items-center gap-1.5 rounded-md px-2 text-xs transition-colors',
                      active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                )
              })}
            </div>
          </BubbleMenu>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}

function ToolbarBtn({
  onClick,
  title,
  active,
  disabled,
  children,
}: {
  onClick: () => void
  title: string
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault()
        if (!disabled) onClick()
      }}
      className={cn(
        'relative h-7 w-7 flex items-center justify-center rounded-md transition-colors after:absolute after:-inset-1',
        disabled
          ? 'text-muted-foreground opacity-50 cursor-not-allowed'
          : active
            ? 'bg-secondary text-foreground'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

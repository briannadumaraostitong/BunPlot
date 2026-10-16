'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
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
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { SidebarRowSkeleton } from '@/components/ui/sidebar-skeleton-row'
import { LoadError } from '@/components/ui/load-error'
import { createClient } from '@/lib/supabase/client'
import { getEditorJson } from '@/lib/editorJson'
import { dismissError, notifyError, reportResult, settle } from '@/lib/notify'
import { ACCEPTED_IMAGE_ACCEPT, isAcceptedImage } from '@/lib/imageTypes'
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

// The document page's padding, shared by the real page and its loading
// skeleton so the skeleton lines up at first paint. Phones get a narrower
// margin; md and up keep the original px-16 py-12.
const PAGE_PADDING = 'px-5 py-6 sm:px-10 md:px-16 md:py-12'

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

function hasTextContent(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false
  const obj = node as Record<string, unknown>
  if (typeof obj.text === 'string' && obj.text.trim().length > 0) return true
  if (Array.isArray(obj.content)) return obj.content.some(hasTextContent)
  return false
}

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
// beforeSave/afterSave). `onSaved` runs before the save leaves
// pendingOutlineSaves, so a document waiting on it (see OutlineDocument) opens
// with this content.
function saveOutline(id: string, content: Record<string, unknown>, onSaved: () => void) {
  const promise = settle(updateOutline(id, content))
    .then((result) => {
      if (!('error' in result)) onSaved()
      return result
    })
    .finally(() => {
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
  const [loadFailed, setLoadFailed] = useState(false)
  // Bumped by Retry to re-run the load effect.
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [outlines, setOutlines] = useState<Outline[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  // Lives here rather than in OutlineSidebar so both the sidebar's File menu
  // and the top bar's Export button open the same dialog — and the button
  // keeps working while the sidebar is collapsed.
  const [exportOpen, setExportOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  // The open document's current text, set by OutlineDocumentEditor. `outlines`
  // only has the content each document loaded with, so it can't tell whether
  // the open one has been written in since.
  const activeTextRef = useRef<(() => string) | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Flush any save still in flight from the previous mount of this tab
      // before trusting a fresh fetch — otherwise this can race an unmount
      // save and load stale (pre-save) content.
      if (pendingOutlineSaves.size > 0) {
        await Promise.allSettled(pendingOutlineSaves.values())
      }
      const result = await settle(getOutlines(projectId))
      if (cancelled) return
      // Bail before pruning: against a list that isn't real, it would wipe
      // this project's backups exactly when they're needed.
      if ('error' in result) {
        console.error('Load outlines error:', result.error)
        setLoadFailed(true)
        setLoading(false)
        return
      }
      const data = result
      // A successful load always has at least one outline (getOutlines
      // creates a default), so this guard never skips a real load.
      if (data.length > 0) pruneBackups('outline', projectId, data.map((o) => o.id))
      setOutlines(data)
      setActiveId(data[0]?.id ?? null)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, loadAttempt])

  function retryLoad() {
    setLoadFailed(false)
    setLoading(true)
    setLoadAttempt((n) => n + 1)
  }

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

  // Keeps `outlines` holding what's saved. Each document's editor starts from
  // it when the document is reopened, and an older copy there would be saved
  // over the newer version as soon as anything was typed.
  // Stable, so the editor's save callbacks (and its autosave interval) aren't
  // rebuilt each time this re-renders.
  const handleSaved = useCallback((id: string, content: Record<string, unknown>) => {
    setOutlines((prev) => prev.map((o) => (o.id === id ? { ...o, content } : o)))
  }, [])

  // Documents with text ask first; empty ones are deleted straight away.
  function requestDelete(id: string) {
    const outline = outlines.find((o) => o.id === id)
    if (!outline) return
    const getActiveText = id === activeId ? activeTextRef.current : null
    const hasText = getActiveText ? getActiveText().trim().length > 0 : hasTextContent(outline.content)
    if (hasText) {
      setPendingDeleteId(id)
    } else {
      void handleDelete(id)
    }
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

        <DocumentSkeleton className="flex-1 min-w-0" />
      </div>
    )
  }

  if (loadFailed) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <LoadError thing="the outline" onRetry={retryLoad} />
      </div>
    )
  }

  const activeOutline = outlines.find((o) => o.id === activeId) ?? null
  const pendingDeleteOutline = outlines.find((o) => o.id === pendingDeleteId) ?? null

  return (
    <div className="flex h-full overflow-hidden">
      <OutlineSidebar
        outlines={outlines}
        activeId={activeId}
        onSelect={setActiveId}
        onAdd={handleAdd}
        onRename={handleRename}
        onDelete={requestDelete}
        onExport={() => setExportOpen(true)}
      />
      <div className="min-w-0 flex-1 overflow-hidden">
        {activeOutline && (
          <OutlineDocument
            key={activeOutline.id}
            outline={activeOutline}
            textRef={activeTextRef}
            onSaved={handleSaved}
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
                if (pendingDeleteId) void handleDelete(pendingDeleteId)
                setPendingDeleteId(null)
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DocumentSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col overflow-hidden', className)}>
      {/* Formatting toolbar */}
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-6 rounded-md" />
        ))}
      </div>

      {/* Document page — reuses the real page wrapper's own classes so
          its width/position is already correct at first paint. */}
      <div className="flex-1 min-h-0 overflow-hidden bg-secondary/10">
        <div className={cn('mx-auto max-w-3xl bg-card space-y-3', PAGE_PADDING)}>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </div>
    </div>
  )
}

interface OutlineDocumentProps {
  outline: Outline
  textRef: React.RefObject<(() => string) | null>
  onSaved: (id: string, content: Record<string, unknown>) => void
  onExport: () => void
}

// Opens a document only after any save of it still in flight has finished
// (the save made when switching away from it, typically). Until then
// `outline.content` is the version before that save, and an editor started
// from it would save that older version back over it on the next edit.
function OutlineDocument(props: OutlineDocumentProps) {
  const [pending, setPending] = useState(() => pendingOutlineSaves.get(props.outline.id) ?? null)

  useEffect(() => {
    if (!pending) return
    let cancelled = false
    void pending.then(() => {
      if (!cancelled) setPending(null)
    })
    return () => {
      cancelled = true
    }
  }, [pending])

  if (pending) return <DocumentSkeleton className="h-full" />
  return <OutlineDocumentEditor {...props} />
}

function OutlineDocumentEditor({ outline, textRef, onSaved, onExport }: OutlineDocumentProps) {
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
  // Phones only: whether the second row of toolbar tools is showing.
  const [moreTools, setMoreTools] = useState(false)
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
    const result = await saveOutline(outline.id, json, () => onSaved(outline.id, json))
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
  }, [editor, outline.id, backup, onSaved])

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
    if (!editor) return
    textRef.current = () => editor.getText()
    return () => {
      textRef.current = null
    }
  }, [editor, textRef])

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
        saveOutline(outline.id, content, () => onSaved(outline.id, content)).then((result) => {
          if (reportResult(result, "Couldn't save the outline.", { id: SAVE_TOAST_ID })) backup.afterSave(content)
        })
      }
    }
  }, [outline.id, backup, onSaved])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !editor) return

    setImageError(null)
    if (!isAcceptedImage(file)) {
      notifyError("Couldn't add that file. Use a JPG, PNG, GIF or WebP image.")
      return
    }
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

  // One list drives both toolbar layouts. md and up shows every tool in this
  // order, wrapping as before. Phones show the `primary` ones plus a toggle
  // that reveals the rest in a second, wrapping row. A change of `group`
  // puts a separator between tools.
  const tools: ToolbarTool[] = [
    { id: 'bold', group: 0, primary: true, title: 'Bold', icon: Bold, active: editor.isActive('bold'), onClick: () => editor.chain().focus().toggleBold().run() },
    { id: 'italic', group: 0, primary: true, title: 'Italic', icon: Italic, active: editor.isActive('italic'), onClick: () => editor.chain().focus().toggleItalic().run() },
    { id: 'underline', group: 0, primary: true, title: 'Underline', icon: UnderlineIcon, active: editor.isActive('underline'), onClick: () => editor.chain().focus().toggleUnderline().run() },
    { id: 'strike', group: 0, title: 'Strikethrough', icon: Strikethrough, active: editor.isActive('strike'), onClick: () => editor.chain().focus().toggleStrike().run() },
    { id: 'h1', group: 1, title: 'Heading 1', icon: Heading1, active: editor.isActive('heading', { level: 1 }), onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { id: 'h2', group: 1, title: 'Heading 2', icon: Heading2, active: editor.isActive('heading', { level: 2 }), onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { id: 'h3', group: 1, title: 'Heading 3', icon: Heading3, active: editor.isActive('heading', { level: 3 }), onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { id: 'bullet', group: 2, primary: true, title: 'Bullet list', icon: List, active: editor.isActive('bulletList'), onClick: () => editor.chain().focus().toggleBulletList().run() },
    { id: 'ordered', group: 2, title: 'Numbered list', icon: ListOrdered, active: editor.isActive('orderedList'), onClick: () => editor.chain().focus().toggleOrderedList().run() },
    { id: 'quote', group: 2, title: 'Blockquote', icon: Quote, active: editor.isActive('blockquote'), onClick: () => editor.chain().focus().toggleBlockquote().run() },
    { id: 'align-left', group: 3, title: 'Align left', icon: AlignLeft, active: isAlignActive('left'), onClick: () => setAlign('left') },
    { id: 'align-center', group: 3, title: 'Align center', icon: AlignCenter, active: isAlignActive('center'), onClick: () => setAlign('center') },
    { id: 'align-right', group: 3, title: 'Align right', icon: AlignRight, active: isAlignActive('right'), onClick: () => setAlign('right') },
    { id: 'align-justify', group: 3, title: 'Justify', icon: AlignJustify, active: isAlignActive('justify'), onClick: () => setAlign('justify') },
    { id: 'image', group: 4, primary: true, title: 'Insert image', icon: uploadingImage ? Loader2 : ImageIcon, iconClassName: uploadingImage ? 'animate-spin' : undefined, disabled: uploadingImage, onClick: () => fileInputRef.current?.click() },
  ]

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between gap-2 px-4 py-2">
          {/* md and up: every tool, wrapping, exactly as before. */}
          <div className="hidden flex-wrap items-center gap-0.5 md:flex">
            <ToolbarTools tools={tools} />
          </div>
          {/* Phones: the most-used tools and a toggle for the rest. */}
          <div className="flex min-w-0 flex-wrap items-center gap-0.5 md:hidden">
            <ToolbarTools tools={tools} show="primary" separators={false} />
            <ToolbarBtn
              onClick={() => setMoreTools((v) => !v)}
              active={moreTools}
              title={moreTools ? 'Fewer tools' : 'More tools'}
              expanded={moreTools}
            >
              {moreTools ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </ToolbarBtn>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_ACCEPT}
            className="hidden"
            onChange={handleImageUpload}
          />

          <div className="flex shrink-0 items-center gap-3 text-xs">
            {imageError && <span className="text-destructive">{imageError}</span>}
            <span className="hidden text-muted-foreground sm:inline">
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
        {moreTools && (
          <div className="flex flex-wrap items-center gap-0.5 px-4 pb-2 md:hidden">
            <ToolbarTools tools={tools} show="more" />
          </div>
        )}
      </div>

      <RestoreBackupBanner
        banner={banner}
        onApply={(content) => {
          editor?.commands.setContent(content, { emitUpdate: true })
          void handleSave()
        }}
      />

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin bg-secondary/10">
        <div className={cn('mx-auto max-w-3xl bg-card min-h-full', PAGE_PADDING)}>
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

interface ToolbarTool {
  id: string
  group: number
  primary?: boolean
  title: string
  icon: LucideIcon
  iconClassName?: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}

// Filters here rather than in the parent's render: the list holds the image
// button's handler, which uses a ref, and React's lint rule rejects passing a
// ref-holding value to a function (like .filter) during render.
function ToolbarTools({
  tools,
  show = 'all',
  separators = true,
}: {
  tools: ToolbarTool[]
  show?: 'all' | 'primary' | 'more'
  separators?: boolean
}) {
  const shown = show === 'all' ? tools : tools.filter((t) => (show === 'primary') === Boolean(t.primary))
  return shown.map((tool, i) => (
    <Fragment key={tool.id}>
      {separators && i > 0 && tool.group !== shown[i - 1].group && (
        <Separator orientation="vertical" className="h-4 mx-2" />
      )}
      <ToolbarBtn onClick={tool.onClick} active={tool.active} title={tool.title} disabled={tool.disabled}>
        <tool.icon className={cn('h-3.5 w-3.5', tool.iconClassName)} />
      </ToolbarBtn>
    </Fragment>
  ))
}

function ToolbarBtn({
  onClick,
  title,
  active,
  disabled,
  expanded,
  children,
}: {
  onClick: () => void
  title: string
  active?: boolean
  disabled?: boolean
  expanded?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-expanded={expanded}
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

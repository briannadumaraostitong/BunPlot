'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import Blockquote from '@tiptap/extension-blockquote'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { ResizableImage, ImageTrailingParagraph } from '@/components/outline/ResizableImage'
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
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import {
  getOutlines,
  createOutline,
  updateOutline,
  renameOutline,
  deleteOutline,
} from '@/actions/outline'
import { OutlineTabBar } from '@/components/outline/OutlineTabBar'
import { cn } from '@/lib/utils'
import type { Outline } from '@/types/database'

const AUTOSAVE_INTERVAL_MS = 30000

type SaveStatus = 'saved' | 'saving'

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

function saveOutline(id: string, content: Record<string, unknown>) {
  const promise = updateOutline(id, content).finally(() => {
    if (pendingOutlineSaves.get(id) === promise) {
      pendingOutlineSaves.delete(id)
    }
  })
  pendingOutlineSaves.set(id, promise)
  return promise
}

interface OutlineEditorProps {
  projectId: string
}

export function OutlineEditor({ projectId }: OutlineEditorProps) {
  const [loading, setLoading] = useState(true)
  const [outlines, setOutlines] = useState<Outline[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

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
      setOutlines(data)
      setActiveId(data[0]?.id ?? null)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  async function handleAdd() {
    const created = await createOutline(projectId, 'Untitled')
    if ('error' in created) return
    setOutlines((prev) => [...prev, created])
    setActiveId(created.id)
  }

  function handleRename(id: string, name: string) {
    setOutlines((prev) => prev.map((o) => (o.id === id ? { ...o, name } : o)))
    renameOutline(id, name)
  }

  async function handleDelete(id: string) {
    await deleteOutline(id, projectId)
    const remaining = outlines.filter((o) => o.id !== id)

    if (remaining.length === 0) {
      const created = await createOutline(projectId, 'Outline')
      if (!('error' in created)) {
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
      <div className="flex flex-col h-full">
        {/* OutlineTabBar */}
        <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-border px-2">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>

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
    )
  }

  const activeOutline = outlines.find((o) => o.id === activeId) ?? null

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <OutlineTabBar
        outlines={outlines}
        activeId={activeId}
        onSelect={setActiveId}
        onAdd={handleAdd}
        onRename={handleRename}
        onDelete={handleDelete}
      />
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeOutline && <OutlineDocumentEditor key={activeOutline.id} outline={activeOutline} />}
      </div>
    </div>
  )
}

function OutlineDocumentEditor({ outline }: { outline: Outline }) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [wordCount, setWordCount] = useState(0)
  const initialSerialized = JSON.stringify(outline.content ?? '')
  const lastSavedJson = useRef(initialSerialized)
  const latestJson = useRef(initialSerialized)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const handleSave = useCallback(async () => {
    if (!editor) return
    const json = editor.getJSON()
    const serialized = JSON.stringify(json)
    if (serialized === lastSavedJson.current) return

    setSaveStatus('saving')
    await saveOutline(outline.id, json)
    lastSavedJson.current = serialized
    setSaveStatus('saved')
  }, [editor, outline.id])

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
    handleUpdate() // set the initial count on mount, not just on the first edit
    editor.on('update', handleUpdate)
    return () => {
      editor.off('update', handleUpdate)
    }
  }, [editor])

  useEffect(() => {
    return () => {
      if (latestJson.current !== lastSavedJson.current) {
        saveOutline(outline.id, JSON.parse(latestJson.current))
      }
    }
  }, [outline.id])

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

      editor.chain().focus().setImage({ src: data.signedUrl }).run()
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
          ) : (
            <span className="text-emerald-600 dark:text-emerald-500">Saved ✓</span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin bg-secondary/10">
        <div className="mx-auto max-w-3xl bg-card px-16 py-12 min-h-full">
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

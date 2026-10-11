'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import Blockquote from '@tiptap/extension-blockquote'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
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
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { getEditorJson } from '@/lib/editorJson'
import { cn } from '@/lib/utils'

interface PlaceRichTextEditorProps {
  content: Record<string, unknown>
  placeholder: string
  onSave: (json: Record<string, unknown>) => Promise<void>
}

// New places store the column default '{}', which isn't a valid document and
// would trip enableContentCheck below. Only genuinely absent content (null,
// undefined, or an object with no keys) counts as empty — anything else, even
// an unexpected shape, still goes through the content check, so real text in a
// bad shape pauses editing instead of being treated as blank and overwritten.
const EMPTY_DOC: Record<string, unknown> = { type: 'doc', content: [{ type: 'paragraph' }] }

function normalizeContent(content: Record<string, unknown> | null | undefined) {
  const isEmpty = !content || Object.keys(content).length === 0
  return { doc: isEmpty ? EMPTY_DOC : content, isEmpty }
}

export function PlaceRichTextEditor({
  content,
  placeholder,
  onSave,
}: PlaceRichTextEditorProps) {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved')
  // Only the first render's content matters (the editor reads it once), so
  // normalize it once.
  const [initial] = useState(() => normalizeContent(content))
  const initialSerialized = JSON.stringify(initial.doc)
  const lastSavedJson = useRef(initialSerialized)
  const latestJson = useRef(initialSerialized)
  // Set when the stored content doesn't fit this editor's schema. State drives
  // the message; the ref is what the save paths check, since the unmount flush
  // only ever sees its first render's closure.
  const [loadFailed, setLoadFailed] = useState(false)
  const loadFailedRef = useRef(false)

  const editor = useEditor({
    immediatelyRender: false,
    // Without this, content that doesn't fit the schema (e.g. an image node,
    // now that images aren't supported here) silently loads as an empty
    // document — and the next blur would save that empty document over the
    // real text. With it, Tiptap still loads an empty fallback but reports
    // the problem here (during construction, before mount), so saving can be
    // switched off before anything is written.
    enableContentCheck: true,
    onContentError: ({ error }) => {
      console.error('Place rich text failed to load:', error)
      loadFailedRef.current = true
      setLoadFailed(true)
    },
    // For empty content, re-baseline from the editor's own JSON: getJSON()
    // adds default attrs (textAlign: null) that EMPTY_DOC doesn't spell out,
    // so comparing against EMPTY_DOC would make the first blur save a blank
    // document for nothing. Runs right after setup, before any interaction.
    onCreate: ({ editor }) => {
      if (!initial.isEmpty) return
      const serialized = JSON.stringify(editor.getJSON())
      lastSavedJson.current = serialized
      latestJson.current = serialized
    },
    // No image extension (unlike the Outline editor): place description/notes
    // are text-only. Content containing an image node fails the check above.
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
      Placeholder.configure({ placeholder }),
    ],
    content: initial.doc,
    editorProps: {
      attributes: {
        class: 'outline-none text-sm leading-relaxed min-h-full',
      },
    },
  })

  const handleSave = useCallback(async () => {
    if (!editor || loadFailedRef.current) return
    const json = getEditorJson(editor)
    const serialized = JSON.stringify(json)
    if (serialized === lastSavedJson.current) return

    setSaveStatus('saving')
    await onSave(json)
    lastSavedJson.current = serialized
    setSaveStatus('saved')
  }, [editor, onSave])

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
    }
    editor.on('update', handleUpdate)
    return () => {
      editor.off('update', handleUpdate)
    }
  }, [editor])

  useEffect(() => {
    return () => {
      if (!loadFailedRef.current && latestJson.current !== lastSavedJson.current) {
        // Parsed from the serialized snapshot, so already plain JSON (see
        // getEditorJson) — and safe to read after the editor is torn down.
        onSave(JSON.parse(latestJson.current))
      }
    }
    // Flush-on-unmount only; content/onSave intentionally excluded so this
    // doesn't re-run mid-session, only when the editor instance goes away.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setAlign(align: 'left' | 'center' | 'right' | 'justify') {
    editor?.chain().focus().setTextAlign(align).run()
  }

  function isAlignActive(align: 'left' | 'center' | 'right' | 'justify') {
    return editor?.isActive({ textAlign: align }) ?? false
  }

  // Checked before `editor`: the empty fallback document Tiptap loaded in
  // place of the real content is never shown or mounted, so it can't be
  // edited, focused or blurred into a save.
  if (loadFailed) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-border px-4 text-center">
        <p className="text-xs text-muted-foreground">
          This text couldn&apos;t be loaded, so editing is paused to protect it.
        </p>
      </div>
    )
  }

  if (!editor) return null

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/20 px-2 py-1.5">
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

          <Separator orientation="vertical" className="h-4 mx-1" />

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

          <Separator orientation="vertical" className="h-4 mx-1" />

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

          <Separator orientation="vertical" className="h-4 mx-1" />

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
        </div>

        <div className="flex shrink-0 items-center gap-2 text-[10px]">
          {saveStatus === 'saving' ? (
            <span className="text-muted-foreground">Saving...</span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-500">Saved ✓</span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin bg-background px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function ToolbarBtn({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void
  title: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      className={cn(
        'relative h-6 w-6 flex items-center justify-center rounded-md transition-colors after:absolute after:-inset-1',
        active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

'use client'

import { useCallback, useRef, useState } from 'react'
import { Extension } from '@tiptap/core'
import TiptapImage from '@tiptap/extension-image'
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { cn } from '@/lib/utils'

const MIN_WIDTH = 80
const CORNERS = ['nw', 'ne', 'sw', 'se'] as const
type Corner = (typeof CORNERS)[number]

export type ImageAlign = 'left' | 'center' | 'right' | 'justify' | null

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      setImageAlign: (align: ImageAlign) => ReturnType
    }
  }
}

// Named `imageAlign` (not `textAlign`) so it doesn't collide with the global
// `textAlign` attribute TextAlign injects into every node type listed in its
// `types` option — two extensions defining an attribute with the same name on
// the same node silently fight over which parseHTML/renderHTML wins.
export const ResizableImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const styleWidth = element.style.width
          if (styleWidth) return parseInt(styleWidth, 10) || null
          const attr = element.getAttribute('width')
          return attr ? parseInt(attr, 10) || null : null
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {}
          return { style: `width: ${attributes.width}px` }
        },
      },
      imageAlign: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-text-align') || null,
        renderHTML: (attributes) => {
          if (!attributes.imageAlign) return {}
          return { 'data-text-align': attributes.imageAlign }
        },
      },
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setImageAlign:
        (align: ImageAlign) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { imageAlign: align })
        },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },
})

// Ensures every top-level image is followed by a paragraph — so there's
// always somewhere to type beside a wrapped image (headings clear floats, so
// a heading straight after one would start below it) and somewhere for the
// cursor to land below a trailing image. Re-checked on every doc-changing
// transaction so it self-heals if images are moved, pasted or the paragraph
// is deleted.
export const ImageTrailingParagraph = Extension.create({
  name: 'imageTrailingParagraph',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('imageTrailingParagraph'),
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null

          const { doc, schema } = newState
          const paragraphType = schema.nodes.paragraph
          if (!paragraphType) return null

          const insertAt: number[] = []
          doc.forEach((node, offset, index) => {
            if (node.type.name !== 'image') return
            const next = index + 1 < doc.childCount ? doc.child(index + 1) : null
            if (next?.type !== paragraphType) insertAt.push(offset + node.nodeSize)
          })
          if (insertAt.length === 0) return null

          // Back to front, so earlier insert positions stay valid.
          const tr = newState.tr
          for (const pos of insertAt.reverse()) tr.insert(pos, paragraphType.create())
          return tr
        },
      }),
    ]
  },
})

// Alignment lives on the wrapper (the actual node-view root Tiptap tracks),
// never on the <img> itself. A `selected`-driven `inline-block` wrapper
// shrink-wraps to the image's own size, so float/margin-auto applied to the
// image would just resolve inside that same-sized box and produce no visible
// shift — the misalignment only "resolves" once deselecting drops the
// wrapper back to `display: contents`. Driving float/margin from the wrapper
// (whose containing block is the surrounding paragraph, not itself) sidesteps
// that trap entirely, independent of selection state.
//
// Left/right mean "wrap": the wrapper floats so the following paragraphs flow
// beside it. No width cap — the space beside the image comes from its own
// width. Classes rather than inline styles so the float can switch off below
// sm, where wrapped text next to an image is unreadable: there the image sits
// on its own line, aligned to the same side. Images that aren't top-level (in
// a list item or quote) never float, for the same own-line result.
const WRAPPER_ALIGN_CLASS = {
  left: 'block w-fit mt-1 mb-4 sm:float-left sm:mr-6',
  right: 'block w-fit ml-auto mt-1 mb-4 sm:float-right sm:ml-6',
  center: 'block w-fit mx-auto',
} as const

const OWN_LINE_ALIGN_CLASS = {
  left: 'block w-fit',
  right: 'block w-fit ml-auto',
  center: 'block w-fit mx-auto',
} as const

function getWrapperAlignClass(align: ImageAlign, isTopLevel: boolean): string | undefined {
  if (align !== 'left' && align !== 'right' && align !== 'center') return undefined
  return (isTopLevel ? WRAPPER_ALIGN_CLASS : OWN_LINE_ALIGN_CLASS)[align]
}

function ResizableImageView({ node, selected, updateAttributes, editor, getPos }: ReactNodeViewProps<HTMLDivElement>) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [resizing, setResizing] = useState(false)

  const { src, alt, title, width, imageAlign } = node.attrs as {
    src: string
    alt: string | null
    title: string | null
    width: number | null
    imageAlign: ImageAlign
  }

  const pos = getPos()
  const isTopLevel = typeof pos === 'number' && editor.state.doc.resolve(pos).depth === 0

  const startResize = useCallback(
    (corner: Corner) => (e: React.PointerEvent) => {
      if (e.button !== 0) return // primary button only (touch and pen report 0)
      e.preventDefault()
      e.stopPropagation()
      const img = wrapperRef.current?.querySelector('img')
      if (!img) return

      const startX = e.clientX
      const startWidth = img.getBoundingClientRect().width
      // The <img> is capped at max-width: 100% of its container, so a width
      // past that would move the handle with no visible change — clamp to it.
      const maxWidth = Math.floor(
        wrapperRef.current?.parentElement?.getBoundingClientRect().width ?? editor.view.dom.clientWidth
      )
      const growsRight = corner === 'ne' || corner === 'se'
      setResizing(true)

      function onMove(ev: PointerEvent) {
        const delta = ev.clientX - startX
        const next = Math.round(startWidth + (growsRight ? delta : -delta))
        updateAttributes({ width: Math.min(maxWidth, Math.max(MIN_WIDTH, next)) })
      }
      // pointercancel too: if a touch is ever taken over by the browser, no
      // pointerup follows, and resizing would stay on with listeners attached.
      function onUp() {
        setResizing(false)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    },
    [updateAttributes, editor]
  )

  const showOverlay = selected || resizing

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      as="div"
      data-drag-handle
      className={cn(
        'relative',
        !imageAlign && (showOverlay ? 'inline-block' : 'contents'),
        getWrapperAlignClass(imageAlign, isTopLevel)
      )}
    >
      <img
        src={src ?? ''}
        alt={alt ?? ''}
        title={title ?? undefined}
        draggable={false}
        style={width ? { width: `${width}px` } : undefined}
        className={cn('block', showOverlay && 'ring-2 ring-offset-1 shadow-lg')}
      />

      {showOverlay &&
        CORNERS.map((corner) => (
          <ResizeHandle key={corner} corner={corner} onPointerDown={startResize(corner)} />
        ))}
    </NodeViewWrapper>
  )
}

function ResizeHandle({
  corner,
  onPointerDown,
}: {
  corner: Corner
  onPointerDown: (e: React.PointerEvent) => void
}) {
  const positionClass = {
    nw: '-top-1 -left-1 cursor-nwse-resize',
    ne: '-top-1 -right-1 cursor-nesw-resize',
    sw: '-bottom-1 -left-1 cursor-nesw-resize',
    se: '-bottom-1 -right-1 cursor-nwse-resize',
  }[corner]

  return (
    <div
      onPointerDown={onPointerDown}
      className={cn(
        'absolute z-10 h-2.5 w-2.5 touch-none rounded-full border border-border bg-card shadow-md after:absolute after:-inset-2.5',
        positionClass
      )}
    />
  )
}

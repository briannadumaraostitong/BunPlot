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

// Ensures a trailing empty paragraph exists after a trailing image so there's
// always somewhere for the cursor to land when clicking below it. Re-checked
// on every doc-changing transaction so it self-heals if images get moved or
// pasted to the end.
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
          const lastNode = doc.lastChild
          if (!paragraphType || !lastNode || lastNode.type.name !== 'image') return null

          return newState.tr.insert(doc.content.size, paragraphType.create())
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
const WRAPPER_ALIGN_STYLE: Record<'left' | 'right' | 'center', React.CSSProperties> = {
  left: { float: 'left', maxWidth: '50%', margin: '0.25rem 1.5rem 1rem 0' },
  right: { float: 'right', maxWidth: '50%', margin: '0.25rem 0 1rem 1.5rem' },
  center: { display: 'block', width: 'fit-content', marginInline: 'auto' },
}

function getWrapperAlignStyle(align: ImageAlign): React.CSSProperties | undefined {
  if (align === 'left' || align === 'right' || align === 'center') return WRAPPER_ALIGN_STYLE[align]
  return undefined
}

function ResizableImageView({ node, selected, updateAttributes }: ReactNodeViewProps<HTMLDivElement>) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [resizing, setResizing] = useState(false)

  const { src, alt, title, width, imageAlign } = node.attrs as {
    src: string
    alt: string | null
    title: string | null
    width: number | null
    imageAlign: ImageAlign
  }

  const startResize = useCallback(
    (corner: Corner) => (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const img = wrapperRef.current?.querySelector('img')
      if (!img) return

      const startX = e.clientX
      const startWidth = img.getBoundingClientRect().width
      const growsRight = corner === 'ne' || corner === 'se'
      setResizing(true)

      function onMove(ev: PointerEvent) {
        const delta = ev.clientX - startX
        const next = Math.round(startWidth + (growsRight ? delta : -delta))
        updateAttributes({ width: Math.max(MIN_WIDTH, next) })
      }
      function onUp() {
        setResizing(false)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [updateAttributes]
  )

  const showOverlay = selected || resizing

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      as="div"
      data-drag-handle
      className={cn('relative', !imageAlign && (showOverlay ? 'inline-block' : 'contents'))}
      style={getWrapperAlignStyle(imageAlign)}
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
        'absolute z-10 h-2.5 w-2.5 rounded-full border border-border bg-card shadow-md',
        positionClass
      )}
    />
  )
}

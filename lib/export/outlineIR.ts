// Walks a Tiptap JSON document into a small, format-agnostic intermediate
// representation that both the DOCX and PDF renderers build from. Written
// against Outline's actual, confirmed extension list (OutlineEditor.tsx):
// StarterKit (paragraph, heading, bulletList/orderedList/listItem, hardBreak),
// Underline, Strike, Blockquote, TextAlign (paragraph/heading only), and the
// local ResizableImage extension — which extends the stock @tiptap/extension-image
// without renaming its node type, so images are plain `type: 'image'` nodes
// with `attrs: { src, width, imageAlign }` on top of the standard src/alt/title.
//
// Node types outside this list (horizontalRule, codeBlock, etc. — none
// reachable from Outline's own toolbar today) are skipped rather than
// erroring, so an export never hard-fails on content this walker doesn't yet
// cover.

export type Align = 'left' | 'center' | 'right' | 'justify'

export interface InlineRun {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
}

export type BlockNode =
  | { type: 'heading'; level: number; align: Align | null; runs: InlineRun[] }
  | { type: 'paragraph'; align: Align | null; runs: InlineRun[] }
  | { type: 'blockquote'; children: BlockNode[] }
  | { type: 'bulletList'; items: BlockNode[][] }
  | { type: 'orderedList'; items: BlockNode[][] }
  | { type: 'image'; src: string; width: number | null; align: Align | null }

interface TiptapNode {
  type?: string
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
  text?: string
  marks?: { type: string }[]
}

function readAlign(attrs: Record<string, unknown> | undefined): Align | null {
  const value = attrs?.textAlign
  return value === 'left' || value === 'center' || value === 'right' || value === 'justify' ? value : null
}

function walkInline(nodes: TiptapNode[] | undefined): InlineRun[] {
  if (!nodes) return []
  const runs: InlineRun[] = []
  for (const node of nodes) {
    if (node.type === 'text') {
      const markTypes = new Set((node.marks ?? []).map((m) => m.type))
      runs.push({
        text: node.text ?? '',
        bold: markTypes.has('bold') || undefined,
        italic: markTypes.has('italic') || undefined,
        underline: markTypes.has('underline') || undefined,
        strike: markTypes.has('strike') || undefined,
      })
    } else if (node.type === 'hardBreak') {
      runs.push({ text: '\n' })
    }
    // Other inline node types are silently skipped — same convention as
    // walkBlock below.
  }
  return runs
}

function walkListItem(node: TiptapNode): BlockNode[] {
  return walkBlocks(node.content)
}

function walkBlock(node: TiptapNode): BlockNode | null {
  const align = readAlign(node.attrs)
  switch (node.type) {
    case 'paragraph':
      return { type: 'paragraph', align, runs: walkInline(node.content) }
    case 'heading':
      return {
        type: 'heading',
        level: Math.min(6, Math.max(1, Number(node.attrs?.level) || 1)),
        align,
        runs: walkInline(node.content),
      }
    case 'blockquote':
      return { type: 'blockquote', children: walkBlocks(node.content) }
    case 'bulletList':
      return { type: 'bulletList', items: (node.content ?? []).map(walkListItem) }
    case 'orderedList':
      return { type: 'orderedList', items: (node.content ?? []).map(walkListItem) }
    case 'image': {
      const attrs = node.attrs ?? {}
      const src = attrs.src
      if (typeof src !== 'string' || !src) return null
      const width = typeof attrs.width === 'number' ? attrs.width : null
      const imageAlign = attrs.imageAlign
      return {
        type: 'image',
        src,
        width,
        align: imageAlign === 'left' || imageAlign === 'center' || imageAlign === 'right' ? imageAlign : null,
      }
    }
    default:
      return null
  }
}

function walkBlocks(nodes: TiptapNode[] | undefined): BlockNode[] {
  if (!nodes) return []
  const result: BlockNode[] = []
  for (const node of nodes) {
    const block = walkBlock(node)
    if (block) result.push(block)
  }
  return result
}

export function tiptapToBlocks(doc: Record<string, unknown>): BlockNode[] {
  return walkBlocks((doc as TiptapNode).content)
}

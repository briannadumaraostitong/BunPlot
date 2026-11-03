import { DOWNLOAD_CONCURRENCY, forEachWithConcurrency } from './concurrency'
import { prepareInlineImage } from './prepareImage'
import type { BlockNode } from './outlineIR'

// Every image in some rich text (outlines, place descriptions and notes),
// scaled down for print (prepareInlineImage) before either renderer embeds
// it, so a full-size upload doesn't bloat the file. Each image keeps the
// width it's shown at. One that can't be prepared is left as it was, and
// the renderers treat it as they always have. Server-only (sharp).

type ImageBlock = Extract<BlockNode, { type: 'image' }>

function collectImages(blocks: BlockNode[], out: ImageBlock[]) {
  for (const block of blocks) {
    switch (block.type) {
      case 'image':
        out.push(block)
        break
      case 'blockquote':
        collectImages(block.children, out)
        break
      case 'bulletList':
      case 'orderedList':
        for (const item of block.items) collectImages(item, out)
        break
    }
  }
}

function replaceImages(blocks: BlockNode[], prepared: Map<ImageBlock, ImageBlock>): BlockNode[] {
  return blocks.map((block) => {
    switch (block.type) {
      case 'image':
        return prepared.get(block) ?? block
      case 'blockquote':
        return { ...block, children: replaceImages(block.children, prepared) }
      case 'bulletList':
      case 'orderedList':
        return { ...block, items: block.items.map((item) => replaceImages(item, prepared)) }
      default:
        return block
    }
  })
}

// documents: each piece of rich text, returned in the same order.
// textWidthPt: the widest an image is printed (the page's, or a card's, text
// width).
export async function prepareBlockImages(documents: BlockNode[][], textWidthPt: number): Promise<BlockNode[][]> {
  const images: ImageBlock[] = []
  for (const blocks of documents) collectImages(blocks, images)
  if (images.length === 0) return documents

  const prepared = new Map<ImageBlock, ImageBlock>()
  await forEachWithConcurrency(images, DOWNLOAD_CONCURRENCY, async (block) => {
    const result = await prepareInlineImage(block.src, block.width, textWidthPt)
    if ('url' in result) prepared.set(block, { ...block, src: result.url, width: result.width })
    else console.warn('Export image left at full size:', result.error)
  })
  return documents.map((blocks) => replaceImages(blocks, prepared))
}

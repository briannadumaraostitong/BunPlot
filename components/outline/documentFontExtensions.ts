import { TextStyle, FontFamily } from '@tiptap/extension-text-style'
import type { Editor } from '@tiptap/core'
import {
  DEFAULT_DOCUMENT_FONT,
  documentFontStack,
  hasItalic,
  toDocumentFont,
  type DocumentFont,
} from '@/lib/documentFonts'

// Tiptap's TextStyle and FontFamily, limited to the outline's fonts
// (lib/documentFonts.ts). Stock, they'd keep anything pasted from Word or
// Docs: every styled span becomes a mark, and any font-family (Arial,
// Calibri) is saved with the document.

// Only a span whose font is one of ours becomes a textStyle mark.
export const DocumentTextStyle = TextStyle.extend({
  parseHTML() {
    return [
      {
        tag: 'span',
        consuming: false,
        getAttrs: (element) => (toDocumentFont(element.style.fontFamily) ? {} : false),
      },
    ]
  },
})

// Stores the font's plain name ('EB Garamond'), and renders it with a system
// fallback. Comfortaa also turns off the browser's slanted stand-in for the
// italic it doesn't have, so italic Comfortaa stays upright, as in exports.
export const DocumentFontFamily = FontFamily.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (element) => toDocumentFont(element.style.fontFamily),
            renderHTML: (attributes) => {
              const font = toDocumentFont(attributes.fontFamily)
              if (!font) return {}
              const synthesis = hasItalic(font) ? '' : '; font-synthesis: none'
              return { style: `font-family: ${documentFontStack(font)}${synthesis}` }
            },
          },
        },
      },
    ]
  },
})

// The selection's font for the picker: the font at the cursor (or of what's
// typed next), or of all the selected text, or null when that's mixed.
export function selectionFont(editor: Editor): DocumentFont | null {
  const { from, to, empty } = editor.state.selection
  if (empty) return toDocumentFont(editor.getAttributes('textStyle').fontFamily) ?? DEFAULT_DOCUMENT_FONT

  let found: DocumentFont | null | undefined
  editor.state.doc.nodesBetween(from, to, (node) => {
    if (found === null) return false
    if (!node.isText) return
    const mark = node.marks.find((m) => m.type.name === 'textStyle')
    const font = toDocumentFont(mark?.attrs.fontFamily) ?? DEFAULT_DOCUMENT_FONT
    found = found === undefined || found === font ? font : null
  })
  return found === undefined ? DEFAULT_DOCUMENT_FONT : found
}

// Picking the default removes the font rather than storing it (see documentFonts).
export function applyFont(editor: Editor, font: DocumentFont) {
  if (font === DEFAULT_DOCUMENT_FONT) editor.chain().focus().unsetFontFamily().run()
  else editor.chain().focus().setFontFamily(font).run()
}

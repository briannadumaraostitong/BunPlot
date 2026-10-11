import type { Editor } from '@tiptap/core'

// Editor content as plain JSON, safe to pass to a server action. Don't send
// editor.getJSON() directly: ProseMirror builds every node's `attrs` with
// Object.create(null), and React's server-action serializer can't send
// null-prototype objects — it swaps them for temporary references, which
// arrive on the server as functions and are silently dropped when the
// content is JSON-stringified for Supabase. Every image src/width, heading
// level and textAlign would be lost, with no error. A JSON round-trip
// rebuilds them as ordinary objects.
export function getEditorJson(editor: Editor): Record<string, unknown> {
  return JSON.parse(JSON.stringify(editor.getJSON()))
}

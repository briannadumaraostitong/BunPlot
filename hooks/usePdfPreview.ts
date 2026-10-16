'use client'

import { useEffect, useRef, useState } from 'react'

export interface PdfPreviewFile {
  blob: Blob
  // Object URL for `blob`, owned by usePdfPreview: released on clear or unmount.
  url: string
  filename: string
}

// null: nothing to preview, and nothing to report as an error (the dialog
// has already said why, e.g. the storyboard's "no panels yet" notice).
type BuildResult = { blob: Blob; filename: string } | { error: string } | null

// State for an export dialog's PDF preview, shared by the manuscript, story
// bible and storyboard dialogs. The previewed file is the one Download saves,
// so the PDF is only built once. clear() drops the preview, and also any
// build still running, so a result for options that have since changed never
// shows up.
export function usePdfPreview() {
  const [file, setFile] = useState<PdfPreviewFile | null>(null)
  const [building, setBuilding] = useState(false)
  // `run` is bumped by clear(); a build whose number no longer matches is
  // dropped. `url` is the object URL to release. One object for the life of
  // the component, so the unmount cleanup below reads its latest values.
  const live = useRef({ run: 0, url: null as string | null })

  useEffect(() => {
    const state = live.current
    return () => {
      // Also drops a build still running, so it can't create a URL nothing releases.
      state.run++
      if (state.url) URL.revokeObjectURL(state.url)
    }
  }, [])

  function clear() {
    const state = live.current
    state.run++
    if (state.url) URL.revokeObjectURL(state.url)
    state.url = null
    setFile(null)
    setBuilding(false)
  }

  // Builds the preview with `make`. Returns the error to show, or null when
  // it worked or was dropped.
  async function build(make: () => Promise<BuildResult>): Promise<string | null> {
    clear()
    const id = live.current.run
    setBuilding(true)
    let result: BuildResult
    try {
      result = await make()
    } catch (err) {
      console.error('PDF preview error:', err)
      result = { error: "Couldn't build the preview." }
    }
    if (id !== live.current.run) return null
    setBuilding(false)
    if (result === null) return null
    if ('error' in result) return result.error
    const url = URL.createObjectURL(result.blob)
    live.current.url = url
    setFile({ blob: result.blob, url, filename: result.filename })
    return null
  }

  return { file, building, build, clear }
}

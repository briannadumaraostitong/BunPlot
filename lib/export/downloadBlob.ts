// Same <a download> mechanism as downloadBase64, for files built in the
// browser (e.g. the storyboard ZIP) rather than returned by a server action.
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  // Deferred rather than immediate: click() only starts the download, and
  // revoking the URL right away can cancel a large one in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

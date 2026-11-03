// Saves a Blob through an <a download> link: files built in the browser (the
// storyboard ZIP and PDF), and exports downloaded by fetchExport.
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

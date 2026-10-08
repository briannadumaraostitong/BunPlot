// Shared by the storyboard ZIP and PDF exports: both download every panel
// image from the browser, a few at a time.
export const DOWNLOAD_CONCURRENCY = 4

// A fixed pool of workers pulling from a shared index, so at most `limit`
// calls are in flight. `fn` must handle its own errors — one rejection
// rejects the whole run, which the exports avoid by skipping failed images.
export async function forEachWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>
): Promise<void> {
  let next = 0
  async function worker() {
    while (next < items.length) {
      const index = next++
      await fn(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

import { base64ToBlob } from '@/lib/export/base64ToBlob'
import { downloadBlob } from '@/lib/export/downloadBlob'

// Client-side download for export server actions, which return the generated
// file as base64 rather than a Storage URL (see actions/export.ts).
export function downloadBase64(base64: string, mimeType: string, filename: string) {
  downloadBlob(base64ToBlob(base64, mimeType), filename)
}

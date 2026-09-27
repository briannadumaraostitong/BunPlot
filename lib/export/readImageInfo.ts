// Minimal, dependency-free image header parser — deliberately scoped to only
// the four formats OutlineEditor's own upload accepts (image/jpeg,png,gif,webp:
// see the accept attribute in OutlineEditor.tsx). Written in place of the
// `image-size` package after finding it carries two disclosed, unpatched
// high-severity DoS advisories (infinite loops parsing malformed ICNS/JXL/HEIF
// — formats this app never produces or accepts). Every loop here advances the
// offset by a strictly positive amount on each iteration, so none of these
// parsers can loop indefinitely regardless of malformed input.

export interface ImageInfo {
  format: 'png' | 'jpeg' | 'gif' | 'webp' | null
  width: number | null
  height: number | null
}

export function readImageInfo(bytes: Uint8Array): ImageInfo {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  // PNG: fixed 8-byte signature, then the IHDR chunk's width/height as
  // big-endian uint32 at fixed offsets. https://www.w3.org/TR/png/#5PNG-file-signature
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { format: 'png', width: view.getUint32(16), height: view.getUint32(20) }
  }

  // GIF: 6-byte "GIF87a"/"GIF89a" signature, then width/height as
  // little-endian uint16 immediately after. https://www.w3.org/Graphics/GIF/spec-gif89a.txt
  if (bytes.length >= 10 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return { format: 'gif', width: view.getUint16(6, true), height: view.getUint16(8, true) }
  }

  // WEBP: RIFF container with a "WEBP" fourCC at byte 8. Detected but not
  // dimension-parsed — neither docx's ImageRun nor react-pdf's Image can
  // embed this format, so callers skip it regardless of size.
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { format: 'webp', width: null, height: null }
  }

  // JPEG: walk marker segments (each starts with 0xFF) looking for an SOFn
  // frame marker, which carries height/width as big-endian uint16 right
  // after its own 2-byte length. ITU-T T.81, Annex B. Every segment's
  // length field includes itself, so it's always >= 2 in a conforming file —
  // but even a malformed length of 0 still advances offset by 2, so this
  // loop cannot stall regardless of input.
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1
        continue
      }
      const marker = bytes[offset + 1]
      const segmentLength = view.getUint16(offset + 2)
      const isFrameMarker =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
      if (isFrameMarker) {
        return { format: 'jpeg', height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) }
      }
      offset += 2 + segmentLength
    }
  }

  return { format: null, width: null, height: null }
}

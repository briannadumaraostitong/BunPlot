// Flattens the HTML that EventModal's contentEditable editor saves (via
// document.execCommand — so <div>/<p> lines, <br>, <b>/<i>/<u>, <h3>, and
// <ul>/<ol><li>) into plain-text paragraphs. Inline formatting is dropped on
// purpose: the story bible's timeline section is a reference list, not a
// faithful render, so this avoids pulling in an HTML parser dependency.
// Unlike the one-line stripHtml helpers in LayerRow/TimelineCanvas, this keeps
// paragraph breaks.

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  amp: '&',
}

function decodeEntities(text: string): string {
  // Single pass, so an encoded "&amp;lt;" correctly becomes "&lt;" rather
  // than being decoded twice into "<".
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1] === 'x' || entity[1] === 'X' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match
  })
}

export function htmlToParagraphs(html: string | null): string[] {
  if (!html) return []
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')

  return decodeEntities(text)
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
    .filter((line) => line.length > 0 && line !== '•')
}

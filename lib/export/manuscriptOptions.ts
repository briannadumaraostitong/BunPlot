// Options for the manuscript (outline) export, shared by the export dialog and
// the export action. Plain data, so both the browser and the server import it.

// Standard: the plain layout. Book: a typeset book (title page, chapters,
// justified and indented text, running headers and page numbers).
export type ManuscriptStyle = 'standard' | 'book'

// A4, or a 6×9 in trade paperback.
export type ManuscriptPageSize = 'a4' | '6x9'

export interface ManuscriptOptions {
  style: ManuscriptStyle
  pageSize: ManuscriptPageSize
  // Book only: a full-page cover before the title page, when the project has one.
  includeCover: boolean
}

// Each style's usual page size; picking a style switches to it.
export const DEFAULT_PAGE_SIZE: Record<ManuscriptStyle, ManuscriptPageSize> = {
  standard: 'a4',
  book: '6x9',
}

export const DEFAULT_MANUSCRIPT_OPTIONS: ManuscriptOptions = {
  style: 'standard',
  pageSize: DEFAULT_PAGE_SIZE.standard,
  includeCover: true,
}

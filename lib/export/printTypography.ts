// Type sizes, colours and spacing the manuscript and story bible exports
// share, so their title pages, headings and page furniture match in PDF and
// DOCX. Points and #rrggbb colours; each renderer builds its own styles from
// them (outlineToPdf, outlineToDocx).

// A centred title page: the title this share of the text height down, with a
// smaller line below it (the author, or "Story Bible").
export const TITLE_PAGE = {
  top: 0.3,
  titleSize: 30,
  subtitleSize: 14,
  subtitleGap: 18,
  subtitleColor: '#444444',
}

// Headings in the text, bold and black. Levels past 3 look like level 3.
export const HEADINGS = {
  1: { size: 18, before: 16, after: 8 },
  2: { size: 15, before: 14, after: 6 },
  3: { size: 13, before: 12, after: 6 },
}

// The running header and page number, centred in the top and bottom margins.
export const RUNNING_HEADER = { size: 8.5, color: '#666666' }
export const PAGE_NUMBER = { size: 9, color: '#444444' }

// How far a header or page number sits from the page's edge: centred in a
// margin this tall (pt), allowing for the line's own height.
export function marginLineOffset(marginY: number): number {
  return marginY / 2 - 6
}

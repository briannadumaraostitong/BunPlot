// Type sizes, colours and spacing the manuscript and story bible exports
// share, so their title pages, headings and page furniture match in PDF and
// DOCX. Points and #rrggbb colours; each renderer builds its own styles from
// them (outlineToPdf, outlineToDocx).

// A centred title page: the title this share of the text height down, with a
// smaller line below it (the Book's author, or "Story Bible"), and then a
// byline (the story bible's author).
export const TITLE_PAGE = {
  top: 0.3,
  titleSize: 30,
  subtitleSize: 14,
  subtitleGap: 18,
  subtitleColor: '#444444',
  bylineSize: 11,
  bylineGap: 12,
  bylineColor: '#666666',
}

// Story bible body text, a little smaller and tighter than the manuscript's
// Standard style, for a reference document.
export const BIBLE_BODY = { fontSize: 10.5, lineHeight: 1.4, paragraphGap: 6 }

// A story bible section's opening: its title over a hairline rule, then a
// count line ("12 characters").
export const SECTION_TITLE = {
  size: 22,
  ruleWidth: 0.5,
  ruleColor: '#cccccc',
  ruleGap: 6,
  countSize: 9.5,
  countGap: 6,
  after: 18,
}

// Secondary text: labelled details ("Role: …") and empty-section notes.
export const META_TEXT = { size: 10, color: '#444444' }
export const MUTED_COLOR = '#666666'

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

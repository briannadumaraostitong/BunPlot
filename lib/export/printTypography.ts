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

// The story bible's cover: a label in small capitals, the title between two
// short hairline rules, the project's description in italic, the author, and
// at the foot of the page a line of counts in small capitals. top: the label
// sits this share of the text height down; countsBottom: the counts line sits
// this far (pt) above the bottom of the text area.
export const BIBLE_COVER = {
  top: 0.26,
  labelSize: 9,
  labelTracking: 2.2,
  labelColor: '#555555',
  ruleLength: 96,
  ruleWidth: 0.5,
  ruleColor: '#999999',
  ruleGap: 16,
  titleSize: 34,
  titleLineHeight: 1.2,
  descriptionSize: 11.5,
  descriptionLineHeight: 1.45,
  descriptionWidthShare: 0.7,
  descriptionColor: '#444444',
  descriptionGap: 22,
  authorSize: 10.5,
  authorColor: '#444444',
  authorGap: 18,
  countsSize: 8,
  countsTracking: 1.2,
  countsColor: '#666666',
  countsBottom: 24,
}

// The story bible's entries (characters, places, events), set as a printed
// appendix: no boxes, a small square swatch of the entry's colour before its
// name, labels in small capitals (FIELD_LABEL), and characters and places
// divided by a hairline rule with this much space either side. An entry
// estimated to fit in keepTogetherShare of the page's text height isn't split
// across pages; a taller one is, rather than leave a large gap.
export const BIBLE_ENTRY = { ruleWidth: 0.5, ruleColor: '#d0d0d0', gap: 12, keepTogetherShare: 0.5 }

// The swatch before a name: a square this size, this far from the name.
// A colour too pale to see on the page gets a grey outline (printColors).
export const SWATCH = { size: 7, gap: 7, outlineWidth: 0.5, outlineColor: '#999999' }

// What follows an entry's name (its description, notes, relationships, an
// event's plain line) is indented past the swatch, to line up with the name.
export const ENTRY_INDENT = SWATCH.size + SWATCH.gap

// A character or place name, with its role or type after it in small
// capitals; an entry with no details is one line, the name a little smaller.
export const ENTRY_NAME = { size: 14, lineHeight: 1.25, slimSize: 11, slimLineHeight: 1.3, gap: 4, detailGap: 8 }

// A character's relationships: two columns, the other character's name in the
// first nameShare of the indented width, then the relation in italic.
export const RELATIONS = { size: 10, lineHeight: 1.4, rowGap: 2, nameShare: 0.4, columnGap: 8, relationColor: '#444444' }

// A place: its image across the text width at the app's 16:9 (aspect-video),
// then the name as a caption under it and the description and notes as
// caption text, a little smaller than the body. An image gets
// coverSpaceAbove more room after the rule above it than BIBLE_ENTRY.gap, so
// it reads as the start of its own entry, not the end of the one before.
export const PLACE_ENTRY = {
  coverAspect: 16 / 9,
  coverGap: 7,
  coverSpaceAbove: 12,
  textSize: 9.5,
  textLineHeight: 1.4,
  textColor: '#333333',
}

// A timeline event: the swatch and title, the dates at the right; under it a
// line of plain small text (status · layer · who · where); then the
// description and notes, all indented (ENTRY_INDENT). Events are separated by
// space alone.
export const EVENT_ENTRY = {
  titleSize: 11,
  titleLineHeight: 1.3,
  datesSize: 9,
  datesGap: 8,
  metaSize: 9,
  metaLineHeight: 1.4,
  metaColor: '#555555',
  metaGap: 2,
  gap: 12,
}

// A story bible section's opening: its title over a hairline rule, then a
// count line ("12 characters") in small capitals (FIELD_LABEL).
export const SECTION_TITLE = {
  size: 22,
  ruleWidth: 0.5,
  ruleColor: '#cccccc',
  ruleGap: 6,
  countGap: 6,
  after: 18,
}

// The story bible's contents: sections, and their parts indented and
// smaller, each with its page number in the PDF.
export const CONTENTS = { size: 11, gap: 8, subSize: 10, subGap: 3, subIndent: 14, subColor: '#444444', numberWidth: 36 }

// A timeline chapter's heading: its title over a hairline rule, with the
// event count at the right (in small capitals, FIELD_LABEL).
export const EVENT_GROUP = { size: 13, ruleWidth: 0.5, ruleColor: '#cccccc', ruleGap: 4, before: 16, after: 10 }

// A field heading ("NOTES", "RELATIONSHIPS"), a role or type after a name,
// and count lines: small capitals, tracked. The PDF sets them as capitals at
// size (react-pdf has no small capitals); the DOCX as Word's small capitals of
// lowercased text at docxSize, which Word draws at about the same height.
export const FIELD_LABEL = { size: 8, docxSize: 10.5, lineHeight: 1.25, tracking: 0.8, color: '#666666', before: 8, after: 2 }

// Secondary text: count lines and empty-section notes.
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

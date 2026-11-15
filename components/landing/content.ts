// The landing page's words and example data, shared by every theme's landing
// (components/landing/<theme>/). Each theme decides how to show them: its
// own layout, decoration, numbering style ("01" or "I"), case and arrows.
// Copy that only one theme has stays in that theme's components.

// The page's anchors, in order. Nav and footer links point at these.
export const SECTIONS = [
  { href: '#why', label: 'Why BunPlot' },
  { href: '#features', label: 'Features' },
  { href: '#about', label: 'About' },
] as const

export const HERO = {
  eyebrow: 'For writers who need to organize',
  // The heading, with the word each theme highlights kept apart.
  title: { lead: 'Plot every', highlight: 'thread' },
  body: 'Your timeline, outline, characters and places, organized in one workspace and connected to each other, from the first idea to the finished book.',
  primary: 'Start organizing',
  secondary: 'See how it works',
}

// The example project the mock UI shows.
export const PROJECT = {
  title: 'The Drowned Bridge',
  chapters: 12,
  events: 48,
  characters: 9,
  // Drafted chapters out of the total, for the hero panel's progress marks.
  draft: { done: 10, of: 16 },
}

// The hero's mock timeline: one row per storyline, one cell per chapter
// (null for an empty cell). `tone` picks the theme's accent: 1, 2 or 3.
export const TIMELINE = {
  chapters: 4,
  lanes: [
    { label: 'Main', tone: 1, cells: ['The flood', null, 'Bridge falls', 'Return'] },
    { label: 'Ilsa', tone: 2, cells: [null, 'Finds the map', 'Meets Tobin', null] },
    { label: 'Letters', tone: 3, cells: ['First letter', null, null, 'The reply'] },
  ],
} as const satisfies { chapters: number; lanes: readonly { label: string; tone: 1 | 2 | 3; cells: readonly (string | null)[] }[] }

// The six parts of the app, for the banner.
export const APP_PARTS = ['Timeline', 'Outline', 'Characters', 'Places', 'Storyboard', 'Exports'] as const

// The chapter the examples come from.
export const CHAPTER = { number: 3, title: 'The Flood' }

export const WHY = {
  number: 1,
  label: 'Why BunPlot',
  title: 'Your story is everywhere',
  body: [
    'Character notes in one doc. The timeline in a spreadsheet. Places in your head. Chapter plans on sticky notes.',
    'BunPlot puts it all in one place and links it together: every event knows its chapter, who is in it and where it happens.',
  ],
  // The mock event dialog.
  event: {
    title: 'Bridge falls',
    characters: 'Ilsa Varn, Tobin Hale',
    place: 'Merrow Docks',
    status: 'Drafted',
    close: 'Close',
    open: 'Open in timeline',
  },
}

// Each feature row's label is its parts; each theme joins them in its own
// style ("Timeline + Outline", "Timeline & Outline").
export const FEATURES = {
  number: 2,
  label: 'Features',
  title: 'Everything in its place',
  rows: {
    outline: {
      label: ['Timeline', 'Outline'],
      title: 'See the plot, then write it',
      body: 'Lay out events by chapter and storyline on the timeline grid, then draft in an outline editor with real book fonts and images that wrap around your text.',
      points: ['Grid and flow views', 'Filter by character, place or storyline', 'Edits backed up as you type'],
    },
    characters: {
      label: ['Characters', 'Places'],
      title: 'Know who everyone is to everyone',
      body: "Give each character a color, a role and notes, and map how they're related on family tree canvases. Keep every place with its cover image and description.",
      points: ['Relationship maps and family trees', 'Places with cover images', 'Linked to every event they appear in'],
    },
    exports: {
      label: ['Exports'],
      title: 'Take it with you',
      body: 'Export your manuscript as a book-style PDF or Word file, or a story bible with every character, place and event in one reference document. Preview it before you download.',
      points: ['Book style at A4 or 6×9', 'Story bible with a contents page', 'Storyboard as PDF or images'],
    },
  },
}

// The outline excerpt in the first feature row.
export const OUTLINE = {
  text: 'The river took the old bridge at dawn. Tobin was on it, halfway across, when the first plank gave.',
  words: '2,481',
}

// The character in the second feature row, and who she is to everyone.
export const CHARACTER = {
  name: 'Ilsa Varn',
  initials: 'IV',
  role: 'Protagonist',
  relations: [
    { name: 'Mira Varn', kind: 'Parent' },
    { name: 'Kit Varn', kind: 'Sibling' },
    { name: 'Tobin Hale', kind: 'Mentor' },
  ],
  hometown: 'Merrow Docks',
}

// The three exports in the third feature row.
export const EXPORTS = [
  { name: 'Manuscript', meta: 'Book · 6×9 · PDF' },
  { name: 'Story bible', meta: 'Cast · Places · Events' },
  { name: 'Storyboard', meta: 'PDF · Images' },
] as const

export const ALSO = {
  label: 'Also in BunPlot',
  items: [
    { title: 'Storyboard', body: 'Sketch panels for each chapter with a built-in drawing tool.' },
    { title: 'Search', body: 'Find any event, character, place or line across every project.' },
    { title: 'Folders and projects', body: 'Keep separate books and series apart, each with its own cover.' },
    { title: 'On your phone', body: 'Drag, rename and write on a touch screen when an idea hits.' },
  ],
}

export const ABOUT = {
  number: 3,
  label: 'About',
  title: 'Made for people who organize',
  // Placeholder text, kept visible until the owner replaces it.
  body: "I built BunPlot because I need to see how everything in a story fits together, and I couldn't find a tool that kept it all in one place. If you organize the way I do, it's for you too.",
  signature: 'Brianna Titong',
  status: 'everything in its place',
}

export const SIGN_UP = {
  eyebrow: 'Ready when you are',
  title: 'Start your first project',
  primary: 'Create account',
  secondary: 'Log in',
}

export const NAV = { logIn: 'Log in', getStarted: 'Get started' }

export const COPYRIGHT = '© 2026 Brianna Titong'

// The names the New project dialog starts with, so it never opens on an
// empty field: a writer can keep one, or type over it (it's selected).
export const EXAMPLE_PROJECT_TITLES = [
  'The Drowned Bridge',
  'Untitled Thriller',
  'Letters from Ilsa',
  'The Salt Road',
  'A House of Tides',
  'Book Two',
  'Winter at Merrow',
  'The Quiet Heir',
] as const

let lastPick: string | null = null

// A random example, never the one picked last time (in this tab).
export function pickExampleTitle(): string {
  const choices = EXAMPLE_PROJECT_TITLES.filter((title) => title !== lastPick)
  lastPick = choices[Math.floor(Math.random() * choices.length)]
  return lastPick
}

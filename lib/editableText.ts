// Hover cue for text that's always an input (place/character names, event
// title, panel caption) so it reads as editable before it's clicked. Callers
// add their own padding and negative margin so the tint has room around the text.
export const EDITABLE_TEXT_CLASS =
  'cursor-text rounded-sm transition-colors hover:bg-secondary/30 focus:bg-transparent'

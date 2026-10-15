// Grid for 2:3 project covers and 3:4 storyboard panels. Phones get two
// columns: there, minmax(160px) leaves room for only one, which makes every
// cover taller than the screen. From sm up it's the original auto-fill grid.
export const COVER_GRID_CLASS =
  'grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:gap-4'

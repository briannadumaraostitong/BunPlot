// A title page for a card without a cover image: the name with a small
// fleuron beneath. Hidden unless a theme's stylesheet shows it (Manuscript,
// keyed on the title-page hooks), so other themes keep their own
// placeholder. Decorative: the card names itself elsewhere.
export function CoverTitlePage({ title }: { title: string }) {
  return (
    <div data-slot="title-page" aria-hidden="true" className="hidden">
      <span data-slot="title-page-title">{title}</span>
      <svg data-slot="title-page-fleuron" width="56" height="10" viewBox="0 0 56 10">
        <path d="M0 5H20M36 5H56" />
        <path d="M28 0.5l4.5 4.5-4.5 4.5-4.5-4.5z" />
      </svg>
    </div>
  )
}

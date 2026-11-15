import { APP_PARTS } from '../content'
import { CONTAINER } from '../layout'

// Each part's hint and its icon, drawn on a 24px grid. In APP_PARTS order.
const PARTS: Record<(typeof APP_PARTS)[number], { hint: string; icon: React.ReactNode }> = {
  Timeline: { hint: 'Events by chapter', icon: <path d="M4 6h9M8 12h12M4 18h7" /> },
  Outline: { hint: 'Draft in book fonts', icon: <path d="M5 5h14M5 10h14M5 15h9M5 20h6" /> },
  Characters: {
    hint: 'Roles and family trees',
    icon: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M16 14.6c2.3.2 3.9 1.6 4.5 4.4" />
      </>
    ),
  },
  Places: {
    hint: 'Covers and notes',
    icon: (
      <>
        <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
        <circle cx="12" cy="10" r="2.3" />
      </>
    ),
  },
  Storyboard: {
    hint: 'Sketch each scene',
    icon: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  Exports: { hint: 'PDF, Word, images', icon: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" /> },
}

// The full-bleed strip under the hero: the six parts of the app in the
// mockup's equal grid columns, each an icon tile, its name and a hint.
export function PartsStrip() {
  return (
    <section aria-label="Parts of BunPlot" className="bg-[hsl(var(--strip))]">
      <div className={`${CONTAINER} grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-x-6 gap-y-5 py-[26px]`}>
        {APP_PARTS.map((part) => (
          <div key={part} className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-[38px] flex-none items-center justify-center rounded-[9px] bg-[hsl(var(--strip-icon-bg))] text-[hsl(var(--strip-icon))]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {PARTS[part].icon}
              </svg>
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[16px] font-bold text-[hsl(var(--strip-ink))]">{part}</span>
              <span className="text-[13px] text-[hsl(var(--strip-hint))]">{PARTS[part].hint}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

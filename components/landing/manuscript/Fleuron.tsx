// The ornament under a centered heading: two rules and an oxblood diamond.
export function Fleuron({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" width="140" height="14" viewBox="0 0 140 14" className={className}>
      <path d="M0 7H58M82 7H140" className="stroke-[hsl(var(--rule))]" strokeWidth="1" />
      <path d="M70 1l6 6-6 6-6-6z" className="fill-accent" />
    </svg>
  )
}

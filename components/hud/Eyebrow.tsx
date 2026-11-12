import { cn } from '@/lib/utils'

const TONES = {
  cyan: 'text-accent-2',
  pink: 'text-(--hud-pink-soft)',
} as const

// The small mono label above a heading, like "01 — FEATURES". With a
// `number` it reads "01 — <children>"; without one, just <children>. No "//"
// prefix (CLAUDE.md). Uppercase is CSS only, so the text stays as written for
// screen readers.
export function Eyebrow({
  number,
  tone = 'cyan',
  className,
  children,
}: {
  number?: string
  tone?: keyof typeof TONES
  className?: string
  children: React.ReactNode
}) {
  return (
    <p className={cn('font-mono text-[13px] uppercase tracking-[1px]', TONES[tone], className)}>
      {number && `${number} — `}
      {children}
    </p>
  )
}

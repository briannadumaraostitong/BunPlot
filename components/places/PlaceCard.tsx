'use client'

import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { playClickSound } from '@/lib/sound'
import { PLACE_TYPE_LABELS } from '@/lib/places.config'
import type { Chapter } from '@/types/database'
import type { PlaceWithCover } from '@/actions/places'

// Mirrors the stripHtml/previewText helpers in LayerRow.tsx and
// ProjectCard.tsx, adapted for Tiptap JSON (place description/notes) instead
// of the HTML strings events use.
function tiptapNodeText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const obj = node as Record<string, unknown>
  let text = typeof obj.text === 'string' ? obj.text : ''
  if (Array.isArray(obj.content)) {
    text += ' ' + obj.content.map(tiptapNodeText).join(' ')
  }
  return text
}

function previewText(content: Record<string, unknown> | null | undefined, max = 80) {
  if (!content) return ''
  const text = tiptapNodeText(content).replace(/\s+/g, ' ').trim()
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}

interface PlaceCardProps {
  place: PlaceWithCover
  chapters: Chapter[]
  selected: boolean
  onSelect: () => void
}

export function PlaceCard({ place, chapters, selected, onSelect }: PlaceCardProps) {
  const description = previewText(place.description)
  const color = place.color ?? '#6366F1'

  return (
    <div
      onClick={() => {
        playClickSound()
        onSelect()
      }}
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border border-border bg-card cursor-pointer transition-all hover:shadow-md hover:brightness-105',
        selected && 'ring-2 ring-offset-1 shadow-lg'
      )}
    >
      <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-secondary/20">
        {place.cover_url ? (
          <img
            src={place.cover_url}
            alt={place.name}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${color}33, ${color}66)` }}
          >
            <MapPin className="h-7 w-7" style={{ color }} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 p-3">
        <p className="text-sm font-semibold truncate">{place.name}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {PLACE_TYPE_LABELS[place.type]}
        </p>

        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{description}</p>
        )}

        {chapters.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {chapters.map((chapter) => (
              <span
                key={chapter.id}
                className="rounded-full bg-secondary/50 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground truncate max-w-32"
              >
                {chapter.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

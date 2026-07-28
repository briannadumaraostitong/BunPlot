'use client'

import { useState, type ComponentType } from 'react'
import { Search, ListFilter, Layers, Users, MapPin, Check, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { EventStatus, Layer, Character } from '@/types/database'
import type { PlaceWithCover } from '@/actions/places'

const STATUS_OPTIONS: { value: EventStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: '#71717a' },
  { value: 'outline', label: 'Outline', color: '#3b82f6' },
  { value: 'written', label: 'Written', color: '#f59e0b' },
  { value: 'revised', label: 'Revised', color: '#8b5cf6' },
  { value: 'final', label: 'Final', color: '#10b981' },
]

interface TimelineToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  layers: Layer[]
  characters: Character[]
  places: PlaceWithCover[]
  statusFilter: Set<EventStatus>
  onStatusFilterChange: (next: Set<EventStatus>) => void
  layerFilter: Set<string>
  onLayerFilterChange: (next: Set<string>) => void
  characterFilter: Set<string>
  onCharacterFilterChange: (next: Set<string>) => void
  placeFilter: Set<string>
  onPlaceFilterChange: (next: Set<string>) => void
}

export function TimelineToolbar({
  search,
  onSearchChange,
  layers,
  characters,
  places,
  statusFilter,
  onStatusFilterChange,
  layerFilter,
  onLayerFilterChange,
  characterFilter,
  onCharacterFilterChange,
  placeFilter,
  onPlaceFilterChange,
}: TimelineToolbarProps) {
  return (
    <div className="flex h-10 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background px-3">
      <div className="relative w-52 shrink-0">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search events..."
          className="h-7 bg-background pl-6 text-xs"
        />
      </div>

      <MultiSelectFilter
        label="Status"
        icon={ListFilter}
        options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label, color: s.color }))}
        selected={statusFilter}
        onChange={(next) => onStatusFilterChange(next as Set<EventStatus>)}
      />
      <MultiSelectFilter
        label="Layer"
        icon={Layers}
        options={layers.map((l) => ({ value: l.id, label: l.name, color: l.color }))}
        selected={layerFilter}
        onChange={onLayerFilterChange}
      />
      <MultiSelectFilter
        label="Character"
        icon={Users}
        options={characters.map((c) => ({ value: c.id, label: c.name, color: c.color }))}
        selected={characterFilter}
        onChange={onCharacterFilterChange}
      />
      <MultiSelectFilter
        label="Place"
        icon={MapPin}
        options={places.map((p) => ({ value: p.id, label: p.name, color: p.color }))}
        selected={placeFilter}
        onChange={onPlaceFilterChange}
      />
    </div>
  )
}

interface MultiSelectOption {
  value: string
  label: string
  color?: string | null
}

function MultiSelectFilter({
  label,
  icon: Icon,
  options,
  selected,
  onChange,
}: {
  label: string
  icon: ComponentType<{ className?: string }>
  options: MultiSelectOption[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const [open, setOpen] = useState(false)

  function toggle(value: string) {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange(next)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs transition-colors hover:bg-secondary',
            selected.size > 0 ? 'bg-secondary/60 text-foreground' : 'text-muted-foreground'
          )}
        >
          <Icon className="h-3 w-3" />
          {label}
          {selected.size > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {selected.size}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 gap-0 p-1">
        {options.length === 0 ? (
          <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">
            Nothing to filter by yet
          </p>
        ) : (
          <div className="max-h-56 overflow-y-auto scrollbar-thin">
            {options.map((opt) => {
              const active = selected.has(opt.value)
              return (
                <button
                  key={opt.value}
                  onClick={() => toggle(opt.value)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-secondary/50"
                >
                  {opt.color && (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: opt.color }}
                    />
                  )}
                  <span className="flex-1 truncate">{opt.label}</span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
              )
            })}
          </div>
        )}
        {selected.size > 0 && (
          <>
            <div className="my-1 h-px bg-border" />
            <button
              onClick={() => onChange(new Set())}
              className="flex w-full items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

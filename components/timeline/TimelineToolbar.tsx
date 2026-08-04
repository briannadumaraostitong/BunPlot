'use client'

import { useState, type ComponentType } from 'react'
import { Search, ListFilter, Layers, Users, MapPin, Check, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Layer, Character, Status } from '@/types/database'
import type { PlaceWithCover } from '@/actions/places'

interface TimelineToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  layers: Layer[]
  characters: Character[]
  places: PlaceWithCover[]
  statuses: Status[]
  statusFilter: Set<string>
  onStatusFilterChange: (next: Set<string>) => void
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
  statuses,
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
    <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background px-3">
      <div className="relative min-w-0 flex-1 md:w-52 md:flex-none">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search events..."
          className="h-7 bg-background pl-6 text-xs"
        />
      </div>

      {/* Mobile: all 4 filters collapse into one overflow popover with an active-count badge */}
      <div className="md:hidden">
        <FiltersOverflow
          statuses={statuses}
          layers={layers}
          characters={characters}
          places={places}
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
          layerFilter={layerFilter}
          onLayerFilterChange={onLayerFilterChange}
          characterFilter={characterFilter}
          onCharacterFilterChange={onCharacterFilterChange}
          placeFilter={placeFilter}
          onPlaceFilterChange={onPlaceFilterChange}
        />
      </div>

      {/* Desktop: unchanged individual filter buttons */}
      <div className="hidden items-center gap-2 md:flex">
        <MultiSelectFilter
          label="Status"
          icon={ListFilter}
          options={statuses.map((s) => ({ value: s.id, label: s.name, color: s.color }))}
          selected={statusFilter}
          onChange={onStatusFilterChange}
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
    </div>
  )
}

interface MultiSelectOption {
  value: string
  label: string
  color?: string | null
}

// Shared option-list rendering, reused by both the desktop per-filter
// popovers and the mobile combined overflow popover below — keeps the
// toggle/list markup from drifting between the two entry points.
function FilterOptionsList({
  options,
  selected,
  onToggle,
}: {
  options: MultiSelectOption[]
  selected: Set<string>
  onToggle: (value: string) => void
}) {
  if (options.length === 0) {
    return (
      <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">
        Nothing to filter by yet
      </p>
    )
  }

  return (
    <div className="max-h-56 overflow-y-auto scrollbar-thin">
      {options.map((opt) => {
        const active = selected.has(opt.value)
        return (
          <button
            key={opt.value}
            onClick={() => onToggle(opt.value)}
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
  )
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
        <FilterOptionsList options={options} selected={selected} onToggle={toggle} />
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

// One section within the mobile overflow popover — same option list as
// MultiSelectFilter, but stacked under a label instead of behind its own
// trigger, since all 4 dimensions now share a single entry point.
function FilterSection({
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
  function toggle(value: string) {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange(next)
  }

  return (
    <div className="border-b border-border py-1.5 last:border-b-0">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3 w-3" />
          {label}
        </span>
        {selected.size > 0 && (
          <button
            onClick={() => onChange(new Set())}
            className="text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
      <FilterOptionsList options={options} selected={selected} onToggle={toggle} />
    </div>
  )
}

function FiltersOverflow({
  statuses,
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
}: {
  statuses: Status[]
  layers: Layer[]
  characters: Character[]
  places: PlaceWithCover[]
  statusFilter: Set<string>
  onStatusFilterChange: (next: Set<string>) => void
  layerFilter: Set<string>
  onLayerFilterChange: (next: Set<string>) => void
  characterFilter: Set<string>
  onCharacterFilterChange: (next: Set<string>) => void
  placeFilter: Set<string>
  onPlaceFilterChange: (next: Set<string>) => void
}) {
  const [open, setOpen] = useState(false)
  const totalActive =
    statusFilter.size + layerFilter.size + characterFilter.size + placeFilter.size

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Filters"
          className={cn(
            'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary after:absolute after:-inset-1',
            totalActive > 0 && 'bg-secondary/60 text-foreground'
          )}
        >
          <ListFilter className="h-3.5 w-3.5" />
          {totalActive > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {totalActive}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-64 gap-0 overflow-y-auto p-1">
        <FilterSection
          label="Status"
          icon={ListFilter}
          options={statuses.map((s) => ({ value: s.id, label: s.name, color: s.color }))}
          selected={statusFilter}
          onChange={onStatusFilterChange}
        />
        <FilterSection
          label="Layer"
          icon={Layers}
          options={layers.map((l) => ({ value: l.id, label: l.name, color: l.color }))}
          selected={layerFilter}
          onChange={onLayerFilterChange}
        />
        <FilterSection
          label="Character"
          icon={Users}
          options={characters.map((c) => ({ value: c.id, label: c.name, color: c.color }))}
          selected={characterFilter}
          onChange={onCharacterFilterChange}
        />
        <FilterSection
          label="Place"
          icon={MapPin}
          options={places.map((p) => ({ value: p.id, label: p.name, color: p.color }))}
          selected={placeFilter}
          onChange={onPlaceFilterChange}
        />
      </PopoverContent>
    </Popover>
  )
}

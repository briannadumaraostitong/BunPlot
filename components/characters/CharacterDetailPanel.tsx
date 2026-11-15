'use client'

import { useRef, useState } from 'react'
import { X, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EDITABLE_TEXT_CLASS } from '@/lib/editableText'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { updateCharacter } from '@/actions/characters'
import { reportResult, settle } from '@/lib/notify'
import { getInitials } from './CharacterRow'
import { initialsInk, sealShare } from '@/lib/initialsInk'
import { ThemeFrame, ThemeFrameSlot } from '@/components/hud/ThemeFrame'
import type { Character, CharacterRelationship } from '@/types/database'

interface CharacterDetailPanelProps {
  character: Character | null
  characters: Character[]
  relationships: CharacterRelationship[]
  open: boolean
  pending: boolean
  onClose: () => void
  onUpdated: (id: string, updates: Partial<Character>) => void
  onSelectRelated: (id: string) => void
  onStartConnect: () => void
  onCancelConnect: () => void
}

function describeRelationship(rel: CharacterRelationship, currentId: string) {
  const isSource = rel.source_character_id === currentId
  const otherId = isSource ? rel.target_character_id : rel.source_character_id
  if (rel.relationship_label) return { otherId, roleLabel: rel.relationship_label }

  const ASYMMETRIC_LABELS: Record<string, [string, string]> = {
    parent: ['Parent', 'Child'],
    mentor: ['Mentor', 'Mentee'],
  }
  const pair = ASYMMETRIC_LABELS[rel.relationship_type]
  const roleLabel = pair
    ? isSource
      ? pair[0]
      : pair[1]
    : rel.relationship_type.charAt(0).toUpperCase() + rel.relationship_type.slice(1)
  return { otherId, roleLabel }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label data-slot="field-label" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

export function CharacterDetailPanel({
  character,
  characters,
  relationships,
  open,
  pending,
  onClose,
  onUpdated,
  onSelectRelated,
  onStartConnect,
  onCancelConnect,
}: CharacterDetailPanelProps) {
  return (
    <div
      className={cn(
        'absolute right-0 top-0 bottom-0 z-30 w-full md:w-72 border-l border-border bg-card shadow-lg flex flex-col transition-transform duration-200',
        open ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {character && (
        <CharacterDetailContent
          key={character.id}
          character={character}
          characters={characters}
          relationships={relationships}
          pending={pending}
          onClose={onClose}
          onUpdated={onUpdated}
          onSelectRelated={onSelectRelated}
          onStartConnect={onStartConnect}
          onCancelConnect={onCancelConnect}
        />
      )}
    </div>
  )
}

function CharacterDetailContent({
  character,
  characters,
  relationships,
  pending,
  onClose,
  onUpdated,
  onSelectRelated,
  onStartConnect,
  onCancelConnect,
}: {
  character: Character
  characters: Character[]
  relationships: CharacterRelationship[]
  pending: boolean
  onClose: () => void
  onUpdated: (id: string, updates: Partial<Character>) => void
  onSelectRelated: (id: string) => void
  onStartConnect: () => void
  onCancelConnect: () => void
}) {
  const [name, setName] = useState(character.name)
  const [role, setRole] = useState(character.role ?? '')
  const [description, setDescription] = useState(character.description ?? '')
  const [notes, setNotes] = useState(character.notes ?? '')
  const colorInputRef = useRef<HTMLInputElement>(null)

  async function saveField(
    updates: Partial<{ name: string; role: string | null; description: string | null; notes: string | null }>
  ) {
    onUpdated(character.id, updates)
    const result = await settle(updateCharacter(character.id, character.project_id, updates))
    reportResult(result, "Couldn't save the character.")
  }

  async function handleColorChange(color: string) {
    onUpdated(character.id, { color })
    const result = await settle(updateCharacter(character.id, character.project_id, { color }))
    reportResult(result, "Couldn't change the character color.")
  }

  const characterRelationships = relationships.filter(
    (r) => r.source_character_id === character.id || r.target_character_id === character.id
  )
  const charactersById = new Map(characters.map((c) => [c.id, c]))

  return (
    <>
      <div className="flex items-center justify-between px-4 h-10 border-b border-border shrink-0">
        <span data-slot="panel-heading" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Character
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="relative after:absolute after:-inset-2"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-5">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            {/* The portrait frame under a frame set (Cyberpunk), with square
                initials; today's round avatar otherwise. The color dot and
                input below are shared by both, so there's one of each. */}
            <ThemeFrame
              name="portrait"
              plain="none"
              className="size-28"
              fallback={
                <div
                  data-slot="character-portrait"
                  className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-semibold text-white bg-(--character-color)"
                  style={{ '--character-color': character.color ?? '#6366F1', '--initials-ink': initialsInk(character.color), '--seal-share': `${sealShare(character.color)}%` } as React.CSSProperties}
                >
                  {getInitials(character.name)}
                </div>
              }
            >
              <ThemeFrameSlot frame="portrait" className="flex items-center justify-center">
                <div
                  data-slot="character-avatar"
                  className="flex size-12 items-center justify-center text-sm font-semibold text-white"
                  style={{ backgroundColor: character.color ?? '#6366F1', '--initials-ink': initialsInk(character.color) } as React.CSSProperties}
                >
                  {getInitials(character.name)}
                </div>
              </ThemeFrameSlot>
            </ThemeFrame>
            {/* Under the frame, at the corner of the initials: centered in the
                slot, they span 32–80px of the 112px frame across and 33–81px
                down. */}
            <button
              onClick={() => colorInputRef.current?.click()}
              className="absolute -bottom-0.5 -right-0.5 frames:bottom-7.25 frames:right-7.5 h-4 w-4 rounded-full border-2 border-card transition-transform hover:scale-125 after:absolute after:-inset-3.5"
              style={{ backgroundColor: character.color ?? '#6366F1' }}
              title="Click to change color"
            />
            <input
              ref={colorInputRef}
              type="color"
              value={character.color ?? '#6366F1'}
              onChange={(e) => handleColorChange(e.target.value)}
              className="absolute opacity-0 w-0 h-0 pointer-events-none"
              tabIndex={-1}
            />
          </div>
          <div className="min-w-0 flex-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() && name !== character.name && saveField({ name: name.trim() })}
              className={cn(EDITABLE_TEXT_CLASS, 'w-full -mx-1.5 px-1.5 text-sm font-semibold bg-transparent outline-none border-b border-transparent focus:border-border pb-0.5')}
              placeholder="Character name"
            />
          </div>
        </div>

        {pending ? (
          <Button variant="outline" size="sm" className="w-full" onClick={onCancelConnect}>
            <X className="h-3.5 w-3.5" />
            Cancel connecting…
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="w-full" onClick={onStartConnect}>
            <Link2 className="h-3.5 w-3.5" />
            Connect to…
          </Button>
        )}

        <Field label="Role">
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onBlur={() => role !== (character.role ?? '') && saveField({ role: role.trim() || null })}
            placeholder="e.g. protagonist, antagonist"
            className="w-full h-8 text-xs bg-background border border-border rounded-lg px-2.5 outline-none focus:border-primary"
          />
        </Field>

        <Field label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() =>
              description !== (character.description ?? '') &&
              saveField({ description: description.trim() || null })
            }
            placeholder="Who are they? What drives them?"
            className="text-xs min-h-24 bg-background"
          />
        </Field>

        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== (character.notes ?? '') && saveField({ notes: notes.trim() || null })}
            placeholder="Private notes, backstory, ideas..."
            className="text-xs min-h-24 bg-background"
          />
        </Field>

        <Field
          label={`Relationships${characterRelationships.length ? ` (${characterRelationships.length})` : ''}`}
        >
          {characterRelationships.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              Connect this character on the canvas to add relationships.
            </p>
          ) : (
            <div className="space-y-1">
              {characterRelationships.map((rel) => {
                const { otherId, roleLabel } = describeRelationship(rel, character.id)
                const other = charactersById.get(otherId)
                if (!other) return null
                return (
                  <button
                    key={rel.id}
                    onClick={() => onSelectRelated(other.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div
                      data-slot="character-avatar"
                      className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
                      style={{ backgroundColor: other.color ?? '#6366F1', '--initials-ink': initialsInk(other.color) } as React.CSSProperties}
                    >
                      {getInitials(other.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs truncate">{other.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate capitalize">
                        {roleLabel}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </Field>
      </div>
    </>
  )
}

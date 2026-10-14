'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createRelationship } from '@/actions/characters'
import { settle } from '@/lib/notify'
import type { Character, RelationshipType } from '@/types/database'

const RELATIONSHIP_TYPES: { value: RelationshipType; label: string; symmetric: boolean }[] = [
  { value: 'parent', label: 'Parent', symmetric: false },
  { value: 'sibling', label: 'Sibling', symmetric: true },
  { value: 'spouse', label: 'Spouse', symmetric: true },
  { value: 'friend', label: 'Friend', symmetric: true },
  { value: 'enemy', label: 'Enemy', symmetric: true },
  { value: 'mentor', label: 'Mentor', symmetric: false },
  { value: 'rival', label: 'Rival', symmetric: true },
  { value: 'other', label: 'Other', symmetric: true },
]

interface RelationshipModalProps {
  projectId: string
  source: Character | null
  target: Character | null
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function RelationshipModal({
  projectId,
  source,
  target,
  open,
  onClose,
  onCreated,
}: RelationshipModalProps) {
  const [type, setType] = useState<RelationshipType>('friend')
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setType('friend')
      setLabel('')
      setError(null)
      onClose()
    }
  }

  async function handleSave() {
    if (!source || !target) return
    setSaving(true)
    setError(null)
    const result = await settle(createRelationship(projectId, source.id, target.id, type, label.trim() || null))
    setSaving(false)
    if (result && 'error' in result) {
      setError(result.error)
      return
    }
    setType('friend')
    setLabel('')
    onCreated()
  }

  const selected = RELATIONSHIP_TYPES.find((t) => t.value === type)!
  const directionHint =
    source && target
      ? selected.symmetric
        ? `${source.name} and ${target.name} are ${selected.label.toLowerCase()}s`
        : `${source.name} is the ${selected.label.toLowerCase()} of ${target.name}`
      : ''

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect characters</DialogTitle>
          <DialogDescription>
            {source && target ? `${source.name} → ${target.name}` : 'Choose a relationship type'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Relationship type
            </label>
            <Select value={type} onValueChange={(v) => setType(v as RelationshipType)}>
              <SelectTrigger className="h-8 text-xs bg-background w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {directionHint && (
              <p className="text-[11px] text-muted-foreground">{directionHint}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Label (optional)
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. estranged father, childhood rival"
              className="h-8 md:text-xs bg-background"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !source || !target}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Connect'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

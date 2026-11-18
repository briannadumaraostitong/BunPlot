'use client'

import { useRef, useState } from 'react'
import { X, MapPin, Loader2, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EDITABLE_TEXT_CLASS } from '@/lib/editableText'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { updatePlace } from '@/actions/places'
import { savePlaceFields } from './pendingPlaceSaves'
import { dismissError, reportResult, settle } from '@/lib/notify'
import { PLACE_TYPES } from '@/lib/places.config'
import { ACCEPTED_IMAGE_ACCEPT, isAcceptedImage } from '@/lib/imageTypes'
import { PlaceRichTextEditor } from './PlaceRichTextEditor'
import { PhoneSheet, blurFocused } from '@/components/ui/phone-sheet'
import { usePhoneSurface } from '@/hooks/usePhoneSurface'
import type { Chapter, Event, PlaceType } from '@/types/database'
import type { PlaceWithCover } from '@/actions/places'

interface ConnectedEvent {
  event: Event
  chapter: Chapter | null
}

interface PlaceDetailPanelProps {
  place: PlaceWithCover | null
  connectedEvents: ConnectedEvent[]
  open: boolean
  onClose: () => void
  onUpdated: (id: string, updates: Partial<PlaceWithCover>) => void
  onSelectEvent: (event: Event) => void
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

export function PlaceDetailPanel({
  place,
  connectedEvents,
  open,
  onClose,
  onUpdated,
  onSelectEvent,
}: PlaceDetailPanelProps) {
  // A bottom drawer below md, chosen when it opens and kept until it closes
  // (usePhoneSurface); the side panel from md up.
  const isPhone = usePhoneSurface(open)
  // The drawer keeps showing the last place while it slides away.
  const [shown, setShown] = useState(place)
  if (place && place !== shown) setShown(place)

  if (isPhone) {
    return (
      <PhoneSheet
        open={open}
        onOpenChange={(next) => {
          if (next) return
          // The name and the rich text save on blur: blur the focused field
          // first, so an Escape mid-edit still saves it.
          blurFocused()
          onClose()
        }}
        title={shown?.name || 'Place'}
        description="Edit the place's details, description and notes"
        bodySlot="place-panel-body"
      >
        {shown && (
          <PlaceDetailContent
            key={shown.id}
            place={shown}
            connectedEvents={connectedEvents}
            inSheet
            onClose={onClose}
            onUpdated={onUpdated}
            onSelectEvent={onSelectEvent}
          />
        )}
      </PhoneSheet>
    )
  }

  return (
    <div
      className={cn(
        'absolute right-0 top-0 bottom-0 w-full md:w-96 border-l border-border bg-card shadow-lg flex flex-col transition-transform duration-200',
        open ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {place && (
        <PlaceDetailContent
          key={place.id}
          place={place}
          connectedEvents={connectedEvents}
          onClose={onClose}
          onUpdated={onUpdated}
          onSelectEvent={onSelectEvent}
        />
      )}
    </div>
  )
}

function PlaceDetailContent({
  place,
  connectedEvents,
  inSheet = false,
  onClose,
  onUpdated,
  onSelectEvent,
}: {
  place: PlaceWithCover
  connectedEvents: ConnectedEvent[]
  // In the phone drawer, whose height comes from its content up to 92dvh:
  // the body may shrink to scroll, and scrolling stops at its ends.
  inSheet?: boolean
  onClose: () => void
  onUpdated: (id: string, updates: Partial<PlaceWithCover>) => void
  onSelectEvent: (event: Event) => void
}) {
  const [name, setName] = useState(place.name)
  const [activeTab, setActiveTab] = useState<'description' | 'notes'>('description')
  const colorInputRef = useRef<HTMLInputElement>(null)

  async function saveField(updates: Partial<{ name: string; type: PlaceType; color: string }>) {
    onUpdated(place.id, updates)
    const result = await savePlaceFields(place.id, place.project_id, updates)
    reportResult(result, "Couldn't save the place.")
  }

  // Returns whether it saved, so the editor can show an honest status and
  // retry on the next blur. One toast id per place and field, so repeat
  // failures don't stack.
  async function handleDescriptionSave(json: Record<string, unknown>) {
    onUpdated(place.id, { description: json })
    return reportSave(
      await savePlaceFields(place.id, place.project_id, { description: json }),
      "Couldn't save the description.",
      `place-save:${place.id}:description`
    )
  }

  async function handleNotesSave(json: Record<string, unknown>) {
    onUpdated(place.id, { notes: json })
    return reportSave(
      await savePlaceFields(place.id, place.project_id, { notes: json }),
      "Couldn't save the notes.",
      `place-save:${place.id}:notes`
    )
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 h-10 border-b border-border shrink-0">
        <span data-slot="panel-heading" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Place
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close"
          className="relative after:absolute after:-inset-2"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div
        data-slot="place-panel-body"
        className={cn('flex-1 overflow-y-auto scrollbar-thin p-4 space-y-5', inSheet && 'min-h-0 overscroll-contain')}
      >
        <CoverImageField place={place} onUpdated={onUpdated} />

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== place.name && saveField({ name: name.trim() })}
          className={cn(EDITABLE_TEXT_CLASS, 'w-full -mx-1.5 px-1.5 text-sm font-semibold bg-transparent outline-none border-b border-transparent focus:border-border pb-0.5')}
          placeholder="Place name"
        />

        <Field label="Type">
          <Select value={place.type} onValueChange={(v) => saveField({ type: v as PlaceType })}>
            <SelectTrigger className="h-8 text-xs bg-background w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLACE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-xs">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Color">
          <div className="flex items-center gap-2">
            <button
              onClick={() => colorInputRef.current?.click()}
              className="relative h-6 w-6 shrink-0 rounded-full ring-1 ring-inset ring-black/15 dark:ring-white/15 transition-transform hover:scale-110 after:absolute after:-inset-2.5"
              style={{ backgroundColor: place.color ?? '#6366F1' }}
              title="Click to change color"
            />
            <span className="text-xs text-muted-foreground font-mono">{place.color ?? '#6366F1'}</span>
            <input
              ref={colorInputRef}
              type="color"
              value={place.color ?? '#6366F1'}
              onChange={(e) => saveField({ color: e.target.value })}
              className="absolute opacity-0 w-0 h-0 pointer-events-none"
              tabIndex={-1}
            />
          </div>
        </Field>

        <div className="space-y-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'description' | 'notes')}>
            <TabsList className="w-full">
              <TabsTrigger value="description" className="flex-1">
                Description
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex-1">
                Notes
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="h-56">
            {activeTab === 'description' ? (
              <PlaceRichTextEditor
                key="description"
                content={place.description ?? {}}
                placeholder="What does this place look and feel like?"
                onSave={handleDescriptionSave}
                backupKind="place-description"
                placeId={place.id}
                projectId={place.project_id}
              />
            ) : (
              <PlaceRichTextEditor
                key="notes"
                content={place.notes ?? {}}
                placeholder="Private notes, worldbuilding details, ideas..."
                onSave={handleNotesSave}
                backupKind="place-notes"
                placeId={place.id}
                projectId={place.project_id}
              />
            )}
          </div>
        </div>

        <Field
          label={`Connected Events${connectedEvents.length ? ` (${connectedEvents.length})` : ''}`}
        >
          {connectedEvents.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Not linked to any events yet.</p>
          ) : (
            <div className="space-y-1">
              {connectedEvents.map(({ event, chapter }) => (
                <button
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-secondary/50 transition-colors text-left"
                >
                  <span className="text-xs truncate">{event.title}</span>
                  <span className="text-[10px] text-muted-foreground truncate shrink-0">
                    {chapter?.title ?? 'No chapter'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Field>
      </div>
    </>
  )
}

function reportSave<T>(result: T, message: string, toastId: string) {
  if (!reportResult(result, message, { id: toastId })) return false
  dismissError(toastId)
  return true
}

function CoverImageField({
  place,
  onUpdated,
}: {
  place: PlaceWithCover
  onUpdated: (id: string, updates: Partial<PlaceWithCover>) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function uploadFile(file: File) {
    setError(null)
    if (!isAcceptedImage(file)) {
      setError('Use a JPG, PNG, GIF or WebP image.')
      return
    }
    setUploading(true)
    try {
      const supabase = createClient()
      const safeName = file.name.replace(/\s+/g, '-')
      const path = `places/${place.project_id}/${place.id}/${Date.now()}-${safeName}`

      const { error: uploadErr } = await supabase.storage.from('attachments').upload(path, file)
      if (uploadErr) throw uploadErr

      const { data, error: signError } = await supabase.storage
        .from('attachments')
        .createSignedUrl(path, 60 * 60 * 24)
      if (signError || !data) throw signError ?? new Error('Failed to create signed URL')

      const previousPath = place.image_url
      // Row first, as in ProjectDetailModal's cover field.
      const result = await settle(updatePlace(place.id, place.project_id, { image_url: path }))
      if ('error' in result) {
        supabase.storage.from('attachments').remove([path]).catch(() => {})
        throw new Error(result.error)
      }
      onUpdated(place.id, { image_url: path, cover_url: data.signedUrl })

      if (previousPath) {
        supabase.storage.from('attachments').remove([previousPath]).catch(() => {})
      }
    } catch (err) {
      console.error('Cover image upload error:', err)
      setError('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    if (!place.image_url) return
    const path = place.image_url
    setError(null)
    const result = await settle(updatePlace(place.id, place.project_id, { image_url: null }))
    if ('error' in result) {
      setError('Failed to remove image')
      return
    }
    onUpdated(place.id, { image_url: null, cover_url: null })
    createClient().storage.from('attachments').remove([path]).catch(() => {})
  }

  return (
    <div
      className="group relative aspect-video w-full overflow-hidden rounded-lg border border-border cursor-pointer"
      onClick={() => !uploading && fileInputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const file = e.dataTransfer.files?.[0]
        if (file) uploadFile(file)
      }}
    >
      {place.cover_url ? (
        <img src={place.cover_url} alt={place.name} className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${place.color ?? '#6366F1'}33, ${place.color ?? '#6366F1'}66)`,
          }}
        >
          <MapPin className="h-8 w-8" style={{ color: place.color ?? '#6366F1' }} />
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center bg-background/70 opacity-0 transition-opacity group-hover:opacity-100">
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-foreground" />
        ) : (
          <span className="text-xs font-medium text-foreground px-2 text-center">
            {place.cover_url ? 'Click or drag to replace' : 'Click or drag to upload'}
          </span>
        )}
      </div>

      {/* Mobile has no hover to discover the overlay above, so this corner badge
          stays persistently visible below md instead — desktop keeps the hover
          overlay unchanged. */}
      <div
        className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm md:hidden"
        title={place.cover_url ? 'Replace image' : 'Upload image'}
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Camera className="h-3.5 w-3.5" />
        )}
      </div>

      {place.cover_url && !uploading && (
        <button
          onClick={handleRemove}
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-100 md:can-hover:opacity-0 shadow-sm transition-opacity hover:text-destructive md:group-hover:opacity-100 after:absolute after:-inset-2.5"
          title="Remove image"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) uploadFile(file)
        }}
      />

      {error && (
        <p className="absolute bottom-1 left-1.5 right-1.5 text-[10px] text-destructive bg-card/90 rounded px-1">
          {error}
        </p>
      )}
    </div>
  )
}

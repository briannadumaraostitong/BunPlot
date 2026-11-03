"use client";

import { useEffect, useState, useRef } from "react";
import {
  Trash2,
  Loader2,
  Copy,
  MoreHorizontal,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { updateEvent, deleteEvent, duplicateEvent } from "@/actions/events";
import {
  getCharactersForEvent,
  linkEventToCharacter,
  unlinkEventFromCharacter,
  getSuggestedCharactersForChapter,
} from "@/actions/characters";
import {
  getPlacesForEvent,
  linkEventToPlace,
  unlinkEventFromPlace,
} from "@/actions/places";
import { EventCharactersField } from "@/components/events/EventCharactersField";
import { EventPlacesField } from "@/components/events/EventPlacesField";
import { StatusPicker } from "@/components/events/StatusPicker";
import type { Event, Layer, Chapter, Place, Character, Status } from "@/types/database";
import { cn } from "@/lib/utils";
import { EDITABLE_TEXT_CLASS } from "@/lib/editableText";
import { reportResult, settle } from "@/lib/notify";

interface EventModalProps {
  event: Event | null;
  layer: Layer | null;
  chapters: Chapter[];
  layers: Layer[];
  statuses: Status[];
  onStatusReorder?: (from: number, to: number) => void;
  allPlaces: Place[];
  allCharacters: Character[];
  allPlacesFailed?: boolean;
  onRetryAllPlaces?: () => void;
  allCharactersFailed?: boolean;
  onRetryAllCharacters?: () => void;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onPlaceLinked?: (eventId: string, placeId: string) => void;
  onPlaceUnlinked?: (eventId: string, placeId: string) => void;
  onCharacterLinked?: (eventId: string, characterId: string) => void;
  onCharacterUnlinked?: (eventId: string, characterId: string) => void;
}

function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  function exec(command: string, val?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
  }

  return (
    <div className="flex flex-col h-full border border-border rounded-xl overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border bg-secondary/20 shrink-0 flex-wrap">
        {/* Text style */}
        <ToolbarBtn onClick={() => exec("bold")} title="Bold">
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec("italic")} title="Italic">
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec("underline")} title="Underline">
          <Underline className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <Separator orientation="vertical" className="h-4 mx-2" />

        {/* Alignment */}
        <ToolbarBtn onClick={() => exec("justifyLeft")} title="Align left">
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec("justifyCenter")} title="Align center">
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec("justifyRight")} title="Align right">
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec("justifyFull")} title="Justify">
          <AlignJustify className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <Separator orientation="vertical" className="h-4 mx-2" />

        {/* Lists */}
        <ToolbarBtn
          onClick={() => exec("insertUnorderedList")}
          title="Bullet list"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => exec("insertOrderedList")}
          title="Numbered list"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <Separator orientation="vertical" className="h-4 mx-2" />

        {/* Block format */}
        <ToolbarBtn
          onClick={() => {
            editorRef.current?.focus();
            const sel = window.getSelection();
            if (sel && sel.rangeCount === 0 && editorRef.current) {
              const range = document.createRange();
              range.selectNodeContents(editorRef.current);
              sel.removeAllRanges();
              sel.addRange(range);
            }
            document.execCommand("formatBlock", false, "h3");
          }}
          title="Heading"
        >
          <span className="text-[11px] font-bold">H</span>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec("formatBlock", "p")} title="Paragraph">
          <span className="text-[11px]">¶</span>
        </ToolbarBtn>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className={cn(
          "flex-1 min-h-64 md:min-h-0 p-4 overflow-y-auto scrollbar-thin text-sm leading-relaxed outline-none",
          "empty:before:content-[attr(data-placeholder)]",
          "           empty:before:text-muted-foreground",
          "empty:before:pointer-events-none",
        )}
        data-placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: value }}
        onBlur={(e) => onChange(e.currentTarget.innerHTML)}
      />
    </div>
  );
}

function ToolbarBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="relative h-7 w-7 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors after:absolute after:-inset-1"
    >
      {children}
    </button>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      data-slot="view-toggle-item"
      data-active={active || undefined}
      className={cn(
        "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
        active
          ? "bg-background shadow-sm text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function EventForm({
  event,
  layer,
  chapters,
  layers,
  statuses,
  onStatusReorder,
  allPlaces,
  allCharacters,
  allPlacesFailed,
  onRetryAllPlaces,
  allCharactersFailed,
  onRetryAllCharacters,
  onPlaceLinked,
  onPlaceUnlinked,
  onCharacterLinked,
  onCharacterUnlinked,
  onClose,
  onUpdated,
}: {
  event: Event;
  layer: Layer;
  chapters: Chapter[];
  layers: Layer[];
  statuses: Status[];
  onStatusReorder?: (from: number, to: number) => void;
  allPlaces: Place[];
  allCharacters: Character[];
  allPlacesFailed?: boolean;
  onRetryAllPlaces?: () => void;
  allCharactersFailed?: boolean;
  onRetryAllCharacters?: () => void;
  onPlaceLinked?: (eventId: string, placeId: string) => void;
  onPlaceUnlinked?: (eventId: string, placeId: string) => void;
  onCharacterLinked?: (eventId: string, characterId: string) => void;
  onCharacterUnlinked?: (eventId: string, characterId: string) => void;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [notes, setNotes] = useState(event.notes ?? "");
  const [activeTab, setActiveTab] = useState<"description" | "notes">(
    "description",
  );
  const [statusId, setStatusId] = useState(event.status_id);
  const [layerId, setLayerId] = useState(event.layer_id);
  const [chapterId, setChapterId] = useState(event.chapter_id ?? "");
  const [color, setColor] = useState(event.color ?? layer.color);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [linkedDataLoading, setLinkedDataLoading] = useState(true);
  const [linkedDataFailed, setLinkedDataFailed] = useState(false);
  // Bumped by Retry to re-run the linked-data effect.
  const [linkedDataAttempt, setLinkedDataAttempt] = useState(0);
  const [suggestedCharacters, setSuggestedCharacters] = useState<Character[]>([]);

  // Places/characters are each a single fast lookup by event id — fetched
  // together so their loading state is shared. Suggestions run separately
  // (below) since they're a nice-to-have that can involve a second, slower
  // round trip (chapter_links, then events/event_characters) and shouldn't
  // hold up the core linked data from appearing.
  useEffect(() => {
    let cancelled = false;
    // No loading reset here: the content is keyed by event.id (see the
    // EventModal wrapper), so this only runs on mount, when
    // linkedDataLoading already starts as true.
    (async () => {
      const [placesResult, charactersResult] = await Promise.all([
        settle(getPlacesForEvent(event.id)),
        settle(getCharactersForEvent(event.id)),
      ]);
      if (cancelled) return;
      // Both or neither, since they share one loading state. Showing them as
      // empty would invite re-adding links that already exist.
      if ("error" in placesResult || "error" in charactersResult) {
        console.error("Load event links error:", placesResult, charactersResult);
        setLinkedDataFailed(true);
        setLinkedDataLoading(false);
        return;
      }
      setPlaces(placesResult);
      setCharacters(charactersResult);
      setLinkedDataLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [event.id, linkedDataAttempt]);

  function retryLinkedData() {
    setLinkedDataFailed(false);
    setLinkedDataLoading(true);
    setLinkedDataAttempt((n) => n + 1);
  }

  useEffect(() => {
    const chapterId = event.chapter_id;
    // No chapter means no suggestions; that's handled during render below,
    // so there's nothing to clear here.
    if (!chapterId) return;
    let cancelled = false;
    (async () => {
      // Optional extras: on failure there are simply no suggestions. Settled
      // only so an offline request doesn't go unhandled.
      const suggested = await settle(getSuggestedCharactersForChapter(chapterId));
      if (!cancelled && !("error" in suggested)) setSuggestedCharacters(suggested);
    })();
    return () => {
      cancelled = true;
    };
  }, [event.chapter_id]);

  const visibleSuggestions = event.chapter_id ? suggestedCharacters : [];

  async function handleAddPlace(place: Place) {
    setPlaces((prev) => [...prev, place]);
    onPlaceLinked?.(event.id, place.id);
    const result = await settle(linkEventToPlace(event.id, place.id, event.project_id));
    if (!reportResult(result, "Couldn't add the place to this event.")) {
      setPlaces((prev) => prev.filter((p) => p.id !== place.id));
      onPlaceUnlinked?.(event.id, place.id);
    }
  }

  async function handleRemovePlace(placeId: string) {
    const removed = places.find((p) => p.id === placeId);
    setPlaces((prev) => prev.filter((p) => p.id !== placeId));
    onPlaceUnlinked?.(event.id, placeId);
    const result = await settle(unlinkEventFromPlace(event.id, placeId, event.project_id));
    if (!reportResult(result, "Couldn't remove the place from this event.") && removed) {
      setPlaces((prev) => [...prev, removed]);
      onPlaceLinked?.(event.id, placeId);
    }
  }

  async function handleAddCharacter(character: Character) {
    setCharacters((prev) => [...prev, character]);
    onCharacterLinked?.(event.id, character.id);
    const result = await settle(linkEventToCharacter(event.id, character.id, event.project_id));
    if (!reportResult(result, "Couldn't add the character to this event.")) {
      setCharacters((prev) => prev.filter((c) => c.id !== character.id));
      onCharacterUnlinked?.(event.id, character.id);
    }
  }

  async function handleRemoveCharacter(characterId: string) {
    const removed = characters.find((c) => c.id === characterId);
    setCharacters((prev) => prev.filter((c) => c.id !== characterId));
    onCharacterUnlinked?.(event.id, characterId);
    const result = await settle(unlinkEventFromCharacter(event.id, characterId, event.project_id));
    if (!reportResult(result, "Couldn't remove the character from this event.") && removed) {
      setCharacters((prev) => [...prev, removed]);
      onCharacterLinked?.(event.id, characterId);
    }
  }

  async function handleSave() {
    setLoading(true);
    const result = await settle(updateEvent(event.id, event.project_id, {
      title,
      description,
      notes,
      status_id: statusId,
      layer_id: layerId,
      chapter_id: chapterId || null,
      color,
    }));
    setLoading(false);
    // Stay open on failure so the edits aren't lost.
    if (!reportResult(result, "Couldn't save the event.")) return;
    onUpdated();
    onClose();
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await settle(deleteEvent(event.id, event.project_id));
    setDeleting(false);
    if (!reportResult(result, "Couldn't delete the event.")) return;
    onUpdated();
    onClose();
  }

  async function handleDuplicate() {
    setDuplicating(true);
    const result = await settle(duplicateEvent(event.id, event.project_id));
    setDuplicating(false);
    if (!reportResult(result, "Couldn't duplicate the event.")) return;
    onUpdated();
    onClose();
  }

  return (
    <div
      data-slot="event-form"
      className="flex flex-col max-h-dvh overflow-y-auto w-full md:h-160 md:max-h-none md:flex-row"
      style={{ '--event-color': color } as React.CSSProperties}
    >
      {/* Left metadata sidebar */}
      <div className="grid grid-cols-2 content-start gap-4 border-b border-border p-5 shrink-0 bg-secondary/20 md:grid-cols-1 md:gap-6 md:w-56 md:border-b-0 md:border-r md:overflow-y-auto md:scrollbar-thin">
        <Field label="Layer">
          <Select value={layerId} onValueChange={setLayerId}>
            <SelectTrigger className="h-8 text-xs bg-background w-full md:w-fit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {layers.map((l) => (
                <SelectItem key={l.id} value={l.id} className="text-xs">
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Chapter">
          <Select value={chapterId} onValueChange={setChapterId}>
            <SelectTrigger className="h-8 text-xs bg-background w-full md:w-fit">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {chapters.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Status">
          <StatusPicker
            statuses={statuses}
            projectId={event.project_id}
            value={statusId}
            onChange={setStatusId}
            onReorder={onStatusReorder}
          />
        </Field>

        <Field label="Color">
          <div className="flex items-center gap-2">
            {/* A swatch with the real color input stretched invisibly over it,
                so a tap lands on the input itself (same as StatusPicker). The
                native input isn't shown: its look varies by browser, and
                ::after hit-slop doesn't render on it. */}
            <label
              className="relative h-7 w-7 shrink-0 cursor-pointer rounded-full ring-1 ring-inset ring-black/15 dark:ring-white/15 has-focus-visible:ring-2 has-focus-visible:ring-ring after:absolute after:-inset-2"
              style={{ backgroundColor: color }}
              title="Change color"
            >
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Event color"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <span className="text-xs text-muted-foreground font-mono">
              {color}
            </span>
          </div>
        </Field>
      </div>

      {/* Right content area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Title */}
        <div data-slot="event-modal-header" className="border-b border-border px-5 py-3 shrink-0">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className={cn(EDITABLE_TEXT_CLASS, "text-lg font-semibold border-none shadow-none -mx-1.5 px-1.5 h-auto focus-visible:ring-0 dark:bg-transparent")}
          />
        </div>

        {/* Tab bar */}
        <div className="px-5 pt-3 shrink-0">
          <div data-slot="view-toggle" className="inline-flex items-center bg-secondary/50 rounded-lg p-1 gap-1">
            <TabButton
              active={activeTab === "description"}
              onClick={() => setActiveTab("description")}
            >
              Description
            </TabButton>
            <TabButton
              active={activeTab === "notes"}
              onClick={() => setActiveTab("notes")}
            >
              Notes
            </TabButton>
          </div>
        </div>

        {/* Tab content + places */}
        <div className="flex-1 min-h-0 flex flex-col gap-4 p-5 pt-3">
          <div className="flex-1 min-h-0">
            {activeTab === "description" ? (
              <RichTextEditor
                key="description"
                value={description}
                onChange={setDescription}
                placeholder="What happens in this scene?"
              />
            ) : (
              <RichTextEditor
                key="notes"
                value={notes}
                onChange={setNotes}
                placeholder="Private notes, reminders, ideas..."
              />
            )}
          </div>

          <EventCharactersField
            characters={characters}
            allCharacters={allCharacters}
            allCharactersFailed={allCharactersFailed}
            onRetryAllCharacters={onRetryAllCharacters}
            suggestedCharacters={visibleSuggestions}
            loading={linkedDataLoading}
            loadFailed={linkedDataFailed}
            onRetry={retryLinkedData}
            onAdd={handleAddCharacter}
            onRemove={handleRemoveCharacter}
          />

          <EventPlacesField
            places={places}
            allPlaces={allPlaces}
            allPlacesFailed={allPlacesFailed}
            onRetryAllPlaces={onRetryAllPlaces}
            loading={linkedDataLoading}
            loadFailed={linkedDataFailed}
            onRetry={retryLinkedData}
            onAdd={handleAddPlace}
            onRemove={handleRemovePlace}
          />
        </div>

        {/* Bottom bar */}
        <div className="sticky bottom-0 bg-background border-t border-border px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex gap-1">
            {/* Mobile: Delete/Duplicate collapse into an overflow menu, same DropdownMenu pattern as ProjectCard */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative md:hidden after:absolute after:-inset-2"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handleDuplicate} disabled={duplicating}>
                  {duplicating ? (
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 mr-2" />
                  )}
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-destructive focus:text-destructive"
                >
                  {deleting ? (
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                  )}
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Desktop: inline buttons, unchanged */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="hidden md:inline-flex text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              )}
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDuplicate}
              disabled={duplicating}
              className="hidden md:inline-flex"
            >
              {duplicating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1.5" />
              )}
              Duplicate
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={loading}>
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label data-slot="field-label" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

export function EventModal({
  event,
  layer,
  chapters,
  layers,
  statuses,
  onStatusReorder,
  allPlaces,
  allCharacters,
  allPlacesFailed,
  onRetryAllPlaces,
  allCharactersFailed,
  onRetryAllCharacters,
  onPlaceLinked,
  onPlaceUnlinked,
  onCharacterLinked,
  onCharacterUnlinked,
  open,
  onClose,
  onUpdated,
}: EventModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden gap-0 bg-card">
        <DialogTitle className="sr-only">{event?.title ?? "Event"}</DialogTitle>
        <DialogDescription className="sr-only">
          Edit event details, status, and notes
        </DialogDescription>
        {event && layer && (
          <EventForm
            key={event.id}
            event={event}
            layer={layer}
            chapters={chapters}
            layers={layers}
            statuses={statuses}
            onStatusReorder={onStatusReorder}
            allPlaces={allPlaces}
            allCharacters={allCharacters}
            allPlacesFailed={allPlacesFailed}
            onRetryAllPlaces={onRetryAllPlaces}
            allCharactersFailed={allCharactersFailed}
            onRetryAllCharacters={onRetryAllCharacters}
            onPlaceLinked={onPlaceLinked}
            onPlaceUnlinked={onPlaceUnlinked}
            onCharacterLinked={onCharacterLinked}
            onCharacterUnlinked={onCharacterUnlinked}
            onClose={onClose}
            onUpdated={onUpdated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

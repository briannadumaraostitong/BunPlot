"use client";

import { useEffect, useState, useRef } from "react";
import {
  Trash2,
  Loader2,
  Copy,
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
import type { Event, Layer, EventStatus, Chapter, Place, Character } from "@/types/database";
import { cn } from "@/lib/utils";

interface EventModalProps {
  event: Event | null;
  layer: Layer | null;
  chapters: Chapter[];
  layers: Layer[];
  allPlaces: Place[];
  allCharacters: Character[];
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onPlaceLinked?: (eventId: string, placeId: string) => void;
  onPlaceUnlinked?: (eventId: string, placeId: string) => void;
  onCharacterLinked?: (eventId: string, characterId: string) => void;
  onCharacterUnlinked?: (eventId: string, characterId: string) => void;
}

const STATUS_OPTIONS: EventStatus[] = [
  "draft",
  "outline",
  "written",
  "revised",
  "final",
];

const STATUS_COLORS: Record<EventStatus, string> = {
  draft: "bg-zinc-100 dark:bg-zinc-800 text-foreground",
  outline: "bg-blue-100 dark:bg-blue-900 text-foreground",
  written: "bg-amber-100 dark:bg-amber-900 text-foreground",
  revised: "bg-violet-100 dark:bg-violet-900 text-foreground",
  final: "bg-emerald-100 dark:bg-emerald-900 text-foreground",
};

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
          "flex-1 p-4 overflow-y-auto scrollbar-thin text-sm leading-relaxed outline-none",
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
      className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
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
  allPlaces,
  allCharacters,
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
  allPlaces: Place[];
  allCharacters: Character[];
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
  const [status, setStatus] = useState<EventStatus>(event.status);
  const [layerId, setLayerId] = useState(event.layer_id);
  const [chapterId, setChapterId] = useState(event.chapter_id ?? "");
  const [color, setColor] = useState(event.color ?? layer.color);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [linkedDataLoading, setLinkedDataLoading] = useState(true);
  const [suggestedCharacters, setSuggestedCharacters] = useState<Character[]>([]);

  // An event is "new" (never saved since creation) when created_at and
  // updated_at are still identical — Postgres's NOW() resolves once per
  // transaction, so INSERT sets both columns to the same value, and only the
  // set_updated_at_events trigger (which only fires on UPDATE) ever changes
  // updated_at afterward. EventForm has no autosave — updateEvent only runs
  // from the explicit Save button — so this stays true for as long as the
  // user is looking at a freshly created event, however long that takes.
  const isNewEvent = event.created_at === event.updated_at;

  // Places/characters are each a single fast lookup by event id — fetched
  // together so their loading state is shared. Suggestions run separately
  // (below) since they're a nice-to-have that can involve a second, slower
  // round trip (chapter_links, then events/event_characters) and shouldn't
  // hold up the core linked data from appearing.
  useEffect(() => {
    let cancelled = false;
    setLinkedDataLoading(true);
    (async () => {
      const [linkedPlaces, linkedCharacters] = await Promise.all([
        getPlacesForEvent(event.id),
        getCharactersForEvent(event.id),
      ]);
      if (cancelled) return;
      setPlaces(linkedPlaces);
      setCharacters(linkedCharacters);
      setLinkedDataLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [event.id]);

  useEffect(() => {
    const chapterId = event.chapter_id;
    if (!isNewEvent || !chapterId) {
      setSuggestedCharacters([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const suggested = await getSuggestedCharactersForChapter(chapterId);
      if (!cancelled) setSuggestedCharacters(suggested);
    })();
    return () => {
      cancelled = true;
    };
  }, [isNewEvent, event.chapter_id]);

  async function handleAddPlace(place: Place) {
    setPlaces((prev) => [...prev, place]);
    onPlaceLinked?.(event.id, place.id);
    await linkEventToPlace(event.id, place.id, event.project_id);
  }

  async function handleRemovePlace(placeId: string) {
    setPlaces((prev) => prev.filter((p) => p.id !== placeId));
    onPlaceUnlinked?.(event.id, placeId);
    await unlinkEventFromPlace(event.id, placeId, event.project_id);
  }

  async function handleAddCharacter(character: Character) {
    setCharacters((prev) => [...prev, character]);
    onCharacterLinked?.(event.id, character.id);
    await linkEventToCharacter(event.id, character.id, event.project_id);
  }

  async function handleRemoveCharacter(characterId: string) {
    setCharacters((prev) => prev.filter((c) => c.id !== characterId));
    onCharacterUnlinked?.(event.id, characterId);
    await unlinkEventFromCharacter(event.id, characterId, event.project_id);
  }

  async function handleSave() {
    setLoading(true);
    await updateEvent(event.id, event.project_id, {
      title,
      description,
      notes,
      status,
      layer_id: layerId,
      chapter_id: chapterId || null,
      color,
    });
    setLoading(false);
    onUpdated();
    onClose();
  }

  async function handleDelete() {
    setDeleting(true);
    await deleteEvent(event.id, event.project_id);
    setDeleting(false);
    onUpdated();
    onClose();
  }

  async function handleDuplicate() {
    setDuplicating(true);
    await duplicateEvent(event.id, event.project_id);
    setDuplicating(false);
    onUpdated();
    onClose();
  }

  return (
    <div className="flex h-160 w-full">
      {/* Left metadata sidebar */}
      <div className="w-56 border-r border-border p-5 space-y-6 shrink-0 overflow-y-auto scrollbar-thin bg-secondary/20">
        <Field label="Layer">
          <Select value={layerId} onValueChange={setLayerId}>
            <SelectTrigger className="h-8 text-xs bg-background">
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
            <SelectTrigger className="h-8 text-xs bg-background">
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
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize transition-all",
                  STATUS_COLORS[s],
                  status === s
                    ? "ring-2 ring-offset-1 ring-primary scale-105 opacity-100"
                    : "opacity-50 hover:opacity-80",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Color">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-10 rounded border border-border cursor-pointer bg-background p-0.5"
            />
            <span className="text-xs text-muted-foreground font-mono">
              {color}
            </span>
          </div>
        </Field>
      </div>

      {/* Right content area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Title */}
        <div className="border-b border-border px-5 py-3 shrink-0">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="text-lg font-semibold border-none shadow-none px-0 h-auto focus-visible:ring-0"
          />
        </div>

        {/* Tab bar */}
        <div className="px-5 pt-3 shrink-0">
          <div className="inline-flex items-center bg-secondary/50 rounded-lg p-1 gap-1">
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
            suggestedCharacters={suggestedCharacters}
            loading={linkedDataLoading}
            onAdd={handleAddCharacter}
            onRemove={handleRemoveCharacter}
          />

          <EventPlacesField
            places={places}
            allPlaces={allPlaces}
            loading={linkedDataLoading}
            onAdd={handleAddPlace}
            onRemove={handleRemovePlace}
          />
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
  allPlaces,
  allCharacters,
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
            allPlaces={allPlaces}
            allCharacters={allCharacters}
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

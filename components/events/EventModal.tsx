"use client";

import { useState, useRef } from "react";
import {
  Trash2,
  Loader2,
  Copy,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
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
import type { Event, Layer, EventStatus, Chapter } from "@/types/database";
import { cn } from "@/lib/utils";

interface EventModalProps {
  event: Event | null;
  layer: Layer | null;
  chapters: Chapter[];
  layers: Layer[];
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_OPTIONS: EventStatus[] = [
  "draft",
  "outline",
  "written",
  "revised",
  "final",
];

const STATUS_COLORS: Record<EventStatus, string> = {
  draft: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  outline: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  written:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  revised:
    "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  final: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
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
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border bg-secondary/20 shrink-0">
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
        <ToolbarBtn
          onClick={() => {
            editorRef.current?.focus();
            document.execCommand("formatBlock", false, "p");
          }}
          title="Paragraph"
        >
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
          "prose prose-sm dark:prose-invert max-w-none",
          "[&:empty]:before:content-[attr(data-placeholder)]",
          "[&:empty]:before:text-muted-foreground",
          "[&:empty]:before:pointer-events-none",
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
        e.preventDefault(); // keep editor focus
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
  onClose,
  onUpdated,
}: {
  event: Event;
  layer: Layer;
  chapters: Chapter[];
  layers: Layer[];
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
      <div className="w-56 border-r border-border p-4 space-y-5 shrink-0 overflow-y-auto scrollbar-thin bg-secondary/20">
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

        {/* Custom tab bar */}
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

        {/* Tab content */}
        <div className="flex-1 p-5 pt-3 min-h-0">
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
            onClose={onClose}
            onUpdated={onUpdated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

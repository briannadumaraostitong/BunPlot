'use client'

import { useEffect, useState } from 'react'
import { Link2, Search, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { getChapterLinks, addChapterLink, removeChapterLink } from '@/actions/chapters'
import { reportResult, settle } from '@/lib/notify'
import type { Chapter } from '@/types/database'
import type { ChapterLinkWithSource } from '@/actions/chapters'

interface ChapterLinkPickerProps {
  chapter: Chapter
  allChapters: Chapter[]
  projectId: string
}

export function ChapterLinkPicker({ chapter, allChapters, projectId }: ChapterLinkPickerProps) {
  const [links, setLinks] = useState<ChapterLinkWithSource[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = await getChapterLinks(chapter.id)
      if (!cancelled) setLinks(data)
    })()
    return () => {
      cancelled = true
    }
  }, [chapter.id])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setSearch('')
  }

  async function handleAdd(source: Chapter) {
    setSearch('')
    const created = await settle(addChapterLink(chapter.id, source.id, projectId))
    if (!reportResult(created, "Couldn't link the chapter.")) return
    setLinks((prev) => [...prev, { id: created.id, continues_from: source }])
  }

  async function handleRemove(linkId: string) {
    setLinks((prev) => prev.filter((l) => l.id !== linkId))
    await removeChapterLink(linkId, projectId)
  }

  const linkedIds = new Set(links.map((l) => l.continues_from.id))
  const q = search.trim().toLowerCase()
  const available = allChapters.filter(
    (c) => c.id !== chapter.id && !linkedIds.has(c.id) && (!q || c.title.toLowerCase().includes(q))
  )
  const hasLinks = links.length > 0

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          title={
            hasLinks
              ? `Continues from ${links.length} chapter${links.length > 1 ? 's' : ''}`
              : 'Add "continues from" link'
          }
          className={cn(
            'relative flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors hover:bg-secondary after:absolute after:-inset-y-2.5 after:-inset-x-1.5',
            hasLinks ? 'text-foreground' : 'text-muted-foreground/40 hover:text-muted-foreground'
          )}
        >
          <Link2 className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 gap-0 p-0">
        <div className="space-y-1.5 border-b border-border p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Continues from
          </p>
          {links.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No links yet</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="group flex items-center gap-1 rounded-full border border-border bg-secondary/30 py-0.5 pl-2 pr-1.5 text-xs"
                >
                  <span className="max-w-28 truncate">{link.continues_from.title}</span>
                  <button
                    onClick={() => handleRemove(link.id)}
                    title={`Remove link to ${link.continues_from.title}`}
                    className="relative shrink-0 text-muted-foreground opacity-100 md:opacity-0 transition-opacity hover:text-destructive md:group-hover:opacity-100 after:absolute after:-inset-1.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative border-b border-border p-1.5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chapters..."
            className="h-7 bg-background pl-6 text-xs"
          />
        </div>
        <div className="max-h-40 overflow-y-auto scrollbar-thin p-1">
          {available.length === 0 ? (
            <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">
              {allChapters.length <= 1 ? 'No other chapters yet' : 'No matches'}
            </p>
          ) : (
            available.map((source) => (
              <button
                key={source.id}
                onClick={() => handleAdd(source)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-secondary/50"
              >
                <span className="truncate">{source.title}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

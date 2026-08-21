'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Check, X, GanttChartSquare, List, Users, MapPin, Search, type LucideIcon } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TimelineCanvas } from './TimelineCanvas'
import { OutlineEditor } from '@/components/outline/OutlineEditor'
import { CharactersPanel } from '@/components/characters/CharactersPanel'
import { PlacesPanel } from '@/components/places/PlacesPanel'
import { updateProject } from '@/actions/projects'
import type { Project, Layer, Event, Chapter, Status } from '@/types/database'

interface ProjectViewProps {
  project: Project
  initialLayers: Layer[]
  initialEvents: Event[]
  initialChapters: Chapter[]
  initialStatuses: Status[]
}

type TabId = 'timeline' | 'outline' | 'characters' | 'places'

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'timeline', label: 'Timeline', icon: GanttChartSquare },
  { id: 'outline', label: 'Outline', icon: List },
  { id: 'characters', label: 'Characters', icon: Users },
  { id: 'places', label: 'Places', icon: MapPin },
]

const VALID_TAB_IDS: TabId[] = ['timeline', 'outline', 'characters', 'places']

export function ProjectView({ project, initialLayers, initialEvents, initialChapters, initialStatuses }: ProjectViewProps) {
  const searchParams = useSearchParams()

  // Read once on first render — these drive the initial deep-linked
  // tab/entity from a /search result click, not a live-synced URL state.
  // Switching tabs afterward is still plain client state, same as before.
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const tabParam = searchParams.get('tab')
    return VALID_TAB_IDS.includes(tabParam as TabId) ? (tabParam as TabId) : 'timeline'
  })
  const [initialEntityId] = useState(() => searchParams.get('entity') ?? undefined)

  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(project.title)

  async function handleRenameTitle() {
    if (!title.trim() || title === project.title) {
      setTitle(project.title)
      setEditingTitle(false)
      return
    }
    await updateProject(project.id, { title: title.trim() })
    setTitle(title.trim())
    setEditingTitle(false)
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleRenameTitle()
    if (e.key === 'Escape') {
      setTitle(project.title)
      setEditingTitle(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-10 border-b border-border flex items-center px-3 shrink-0 bg-background">
        {editingTitle ? (
          <div className="flex items-center gap-1 max-w-xs flex-1 min-w-0">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleRenameTitle}
              className="min-w-0 flex-1 text-sm font-medium bg-background border border-border rounded px-1.5 py-0.5 outline-none focus:border-primary"
            />
            <button
              onClick={handleRenameTitle}
              className="relative text-primary shrink-0 after:absolute after:-inset-y-1.5 after:-inset-x-0.5"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { setTitle(project.title); setEditingTitle(false) }}
              className="relative text-muted-foreground shrink-0 after:absolute after:-inset-y-1.5 after:-inset-x-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <span
            className="text-sm font-medium truncate cursor-pointer"
            title={`${title} — double-click to rename`}
            onDoubleClick={() => setEditingTitle(true)}
          >
            {title}
          </span>
        )}
      </div>

      <div className="border-b border-border px-3 shrink-0 bg-background flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
          <TabsList variant="line" className="h-11 md:h-8">
            {TABS.map(({ id, label, icon: Icon }) => (
              <TabsTrigger
                key={id}
                value={id}
                aria-label={label}
                className="gap-1.5 px-3.5 md:px-1.5"
              >
                <Icon className="h-4 w-4 md:h-3.5 md:w-3.5" />
                <span className="hidden md:inline">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Link
          href={`/search?project=${project.id}`}
          aria-label="Search this project"
          className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <Search className="h-4 w-4" />
        </Link>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'timeline' ? (
          <TimelineCanvas
            project={project}
            initialLayers={initialLayers}
            initialEvents={initialEvents}
            initialChapters={initialChapters}
            initialStatuses={initialStatuses}
            initialSelectedEventId={initialEntityId}
          />
        ) : activeTab === 'outline' ? (
          <OutlineEditor projectId={project.id} />
        ) : activeTab === 'characters' ? (
          <CharactersPanel
            projectId={project.id}
            initialSelectedCharacterId={initialEntityId}
          />
        ) : (
          <PlacesPanel
            projectId={project.id}
            initialEvents={initialEvents}
            initialLayers={initialLayers}
            initialChapters={initialChapters}
            initialStatuses={initialStatuses}
            initialSelectedPlaceId={initialEntityId}
          />
        )}
      </div>
    </div>
  )
}

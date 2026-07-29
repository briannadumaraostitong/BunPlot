'use client'

import { useState } from 'react'
import { GanttChartSquare, List, Users, MapPin, type LucideIcon } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TimelineCanvas } from './TimelineCanvas'
import { OutlineEditor } from '@/components/outline/OutlineEditor'
import { CharactersPanel } from '@/components/characters/CharactersPanel'
import { PlacesPanel } from '@/components/places/PlacesPanel'
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

export function ProjectView({ project, initialLayers, initialEvents, initialChapters, initialStatuses }: ProjectViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('timeline')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-10 border-b border-border flex items-center px-3 shrink-0 bg-background">
        <span className="text-sm font-medium truncate">{project.title}</span>
      </div>

      <div className="border-b border-border px-3 shrink-0 bg-background">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
          <TabsList variant="line">
            {TABS.map(({ id, label, icon: Icon }) => (
              <TabsTrigger key={id} value={id} className="gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'timeline' ? (
          <TimelineCanvas
            project={project}
            initialLayers={initialLayers}
            initialEvents={initialEvents}
            initialChapters={initialChapters}
            initialStatuses={initialStatuses}
          />
        ) : activeTab === 'outline' ? (
          <OutlineEditor projectId={project.id} />
        ) : activeTab === 'characters' ? (
          <CharactersPanel projectId={project.id} />
        ) : (
          <PlacesPanel
            projectId={project.id}
            initialEvents={initialEvents}
            initialLayers={initialLayers}
            initialChapters={initialChapters}
            initialStatuses={initialStatuses}
          />
        )}
      </div>
    </div>
  )
}

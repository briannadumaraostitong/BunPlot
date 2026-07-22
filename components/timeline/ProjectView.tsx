'use client'

import { useState } from 'react'
import { GanttChartSquare, List, Users, MapPin, type LucideIcon } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TimelineCanvas } from './TimelineCanvas'
import { OutlineEditor } from '@/components/outline/OutlineEditor'
import type { Project, Layer, Event, Chapter } from '@/types/database'

interface ProjectViewProps {
  project: Project
  initialLayers: Layer[]
  initialEvents: Event[]
  initialChapters: Chapter[]
}

type TabId = 'timeline' | 'outline' | 'characters' | 'places'

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'timeline', label: 'Timeline', icon: GanttChartSquare },
  { id: 'outline', label: 'Outline', icon: List },
  { id: 'characters', label: 'Characters', icon: Users },
  { id: 'places', label: 'Places', icon: MapPin },
]

const EMPTY_STATES: Record<Exclude<TabId, 'timeline' | 'outline'>, { icon: LucideIcon; title: string; description: string }> = {
  characters: {
    icon: Users,
    title: 'No characters yet',
    description: 'Track your cast, their arcs, and which events they appear in.',
  },
  places: {
    icon: MapPin,
    title: 'No places yet',
    description: 'Keep track of the settings and locations your story visits.',
  },
}

export function ProjectView({ project, initialLayers, initialEvents, initialChapters }: ProjectViewProps) {
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
          />
        ) : activeTab === 'outline' ? (
          <OutlineEditor projectId={project.id} />
        ) : (
          <EmptyTabState tab={activeTab} />
        )}
      </div>
    </div>
  )
}

function EmptyTabState({ tab }: { tab: Exclude<TabId, 'timeline' | 'outline'> }) {
  const { icon: Icon, title, description } = EMPTY_STATES[tab]

  return (
    <div className="flex h-full flex-col items-center justify-center text-center space-y-3 px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/30">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
      </div>
    </div>
  )
}

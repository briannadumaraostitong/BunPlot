'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ProjectDetailModal } from './ProjectDetailModal'
import type { ProjectFolder } from '@/types/database'
import type { ProjectWithCover } from '@/actions/projects'

export interface ProjectStats {
  wordCount: number
  eventCount: number
  chapterCount: number
  characterCount: number
}

interface ProjectCardProps {
  project: ProjectWithCover
  folders?: ProjectFolder[]
  stats: ProjectStats
}

export function ProjectCard({ project: initialProject, folders = [], stats }: ProjectCardProps) {
  const [detailOpen, setDetailOpen] = useState(false)
  // Local mirror of the server-fetched project — updated by
  // ProjectDetailModal's onUpdated so a rename/cover/description edit shows
  // here immediately without waiting on a router.refresh(). Everything else
  // (archive, duplicate, delete, move-to-folder) still refreshes the whole
  // list, same as before the modal existed.
  const [project, setProject] = useState(initialProject)

  return (
    <>
      {/* The whole card is one click target — cover and title both open the
          modal, per the "card previews, modal manages" split. A <button>
          rather than a plain div so this stays keyboard-focusable, matching
          the real <Link> it replaces (which was natively focusable). */}
      <button
        type="button"
        onClick={() => setDetailOpen(true)}
        data-slot="project-card"
        className={cn(
          'group block w-full overflow-hidden rounded-xl corner-cut border border-border bg-card text-left',
          // The cut shape clips the shadow, so the border carries the hover.
          'hover:shadow-md cut:hover:border-accent transition-all duration-150',
          project.archived && 'opacity-60 hover:opacity-100'
        )}
      >
        <div data-slot="project-cover" className="aspect-2/3 w-full bg-primary">
          {project.cover_url ? (
            <img src={project.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            // Without a cover: a title page, for a theme that shows it
            // (Manuscript, in its stylesheet); hidden otherwise. Decorative,
            // since the title below already names the card.
            <div data-slot="project-cover-title-page" aria-hidden="true" className="hidden">
              <span data-slot="project-cover-title">{project.title}</span>
              <svg data-slot="project-cover-fleuron" width="56" height="10" viewBox="0 0 56 10">
                <path d="M0 5H20M36 5H56" />
                <path d="M28 0.5l4.5 4.5-4.5 4.5-4.5-4.5z" />
              </svg>
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="truncate text-sm font-semibold leading-tight">{project.title}</h3>
        </div>
      </button>

      <ProjectDetailModal
        project={project}
        folders={folders}
        stats={stats}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onUpdated={(updates) => setProject((p) => ({ ...p, ...updates }))}
      />
    </>
  )
}

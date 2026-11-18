import type { SearchResult } from '@/types/database'

// Where a search result opens: its project, on the tab that shows it, with
// the entity selected (ProjectView reads ?tab= and ?entity=). Used by the
// search page and the command menu.
export function resultHref(result: Pick<SearchResult, 'entity_type' | 'id' | 'project_id'>): string {
  switch (result.entity_type) {
    case 'character':
      return `/projects/${result.project_id}?tab=characters&entity=${result.id}`
    case 'place':
      return `/projects/${result.project_id}?tab=places&entity=${result.id}`
    case 'event':
      return `/projects/${result.project_id}?tab=timeline&entity=${result.id}`
    case 'chapter':
      // No chapter detail panel exists anywhere to deep-link into —
      // chapters are just grid columns — so this lands on the project's
      // Timeline tab only, same as clicking through would today.
      return `/projects/${result.project_id}`
  }
}

// Whether the sidebar's project list is collapsed, remembered in a cookie
// rather than localStorage so the (app) layout can read it on the server and
// render the sidebar in that state from the start, with no flash. Kept out
// of the 'use client' Sidebar so the server can import the name as a value.
export const PROJECTS_COLLAPSED_COOKIE = 'bunplot-sidebar-projects'
export const PROJECTS_COLLAPSED_VALUE = 'collapsed'

// A year, refreshed whenever it changes.
export function writeProjectsCollapsed(collapsed: boolean) {
  document.cookie = collapsed
    ? `${PROJECTS_COLLAPSED_COOKIE}=${PROJECTS_COLLAPSED_VALUE}; path=/; max-age=31536000; samesite=lax`
    : `${PROJECTS_COLLAPSED_COOKIE}=; path=/; max-age=0; samesite=lax`
}

// types/database.ts
// Auto-generated types matching supabase/schema.sql

import type { ThemeSetting } from '@/lib/themes'

export type AppMode = 'basic' | 'advanced'
export type EventStatus = 'draft' | 'outline' | 'written' | 'revised' | 'final'
export type LayerType = 'main' | 'character' | 'subplot' | 'theme' | 'custom'
export type RelationshipType = 'parent' | 'sibling' | 'spouse' | 'friend' | 'enemy' | 'mentor' | 'rival' | 'other'
export type PlaceType = 'city' | 'town' | 'village' | 'building' | 'room' | 'country' | 'region' | 'world' | 'other'

// ── Tables ──────────────────────────────────────────────────

export interface Profile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  app_mode: AppMode
  theme: ThemeSetting
  sound_enabled: boolean
  sound_volume: number
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  owner_id: string
  folder_id: string | null
  title: string
  description: string | null
  cover_image_url: string | null
  mode: AppMode
  settings: ProjectSettings
  timeline_start: string | null
  timeline_end: string | null
  archived: boolean
  created_at: string
  updated_at: string
}

export interface ProjectFolder {
  id: string
  owner_id: string
  name: string
  position: number
  collapsed: boolean
  created_at: string
}

export interface ProjectSettings {
  defaultView?: 'timeline' | 'outline' | 'board'
  snapToGrid?: boolean
  showDependencies?: boolean
  savedViews?: SavedView[]
}

export interface SavedView {
  id: string
  name: string
  filters: EventFilters
  zoom: number
}

export interface Chapter {
  id: string
  project_id: string
  title: string
  position: number
  created_at: string
}

export interface Outline {
  id: string
  project_id: string
  name: string
  position: number
  content: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface LayerGroup {
  id: string
  project_id: string
  name: string
  color: string | null
  position: number
  collapsed: boolean
  created_at: string
}

export interface Layer {
  id: string
  project_id: string
  group_id: string | null
  name: string
  type: LayerType
  color: string
  position: number
  visible: boolean
  locked: boolean
  metadata: LayerMetadata
  created_at: string
  updated_at: string
}

export interface LayerMetadata {
  opacity?: number
  pattern?: 'solid' | 'dashed' | 'dotted'
}

export interface Status {
  id: string
  project_id: string
  name: string
  color: string
  is_default: boolean
  position: number
  created_at: string
  updated_at: string
}

export interface Character {
  id: string
  project_id: string
  name: string
  role: string | null
  description: string | null
  color: string | null
  avatar_url: string | null
  notes: string | null
  custom_fields: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Place {
  id: string
  project_id: string
  name: string
  type: PlaceType
  color: string | null
  description: Record<string, unknown>
  notes: Record<string, unknown>
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  project_id: string
  layer_id: string
  chapter_id: string | null
  title: string
  description: string | null
  notes: string | null
  start_date: string | null
  end_date: string | null
  position: number
  duration: number
  color: string | null
  icon: string | null
  status: EventStatus
  status_id: string
  tension_level: number | null
  word_count: number | null
  custom_fields: Record<string, unknown>
  attachments: Attachment[]
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Attachment {
  name: string
  url: string
  type: string
}

export interface EventCharacter {
  event_id: string
  character_id: string
  role: string | null
}

export interface EventPlace {
  event_id: string
  place_id: string
}

export interface EventDependency {
  id: string
  project_id: string
  source_id: string
  target_id: string
  label: string | null
  style: 'solid' | 'dashed' | 'dotted'
  color: string | null
  created_at: string
}

export interface CharacterRelationship {
  id: string
  project_id: string
  source_character_id: string
  target_character_id: string
  relationship_type: RelationshipType
  relationship_label: string | null
  created_at: string
}

export interface FamilyTree {
  id: string
  project_id: string
  name: string
  position: number
  created_at: string
  updated_at: string
}

export interface FamilyTreeMember {
  tree_id: string
  character_id: string
  x: number
  y: number
  created_at: string
}

export interface ChapterLink {
  id: string
  project_id: string
  chapter_id: string
  continues_from_chapter_id: string
  created_at: string
}

// ── Extended / Joined Types ─────────────────────────────────

export interface LayerWithEvents extends Layer {
  events: Event[]
}

export interface ProjectWithLayers extends Project {
  layers: LayerWithEvents[]
  layer_groups: LayerGroup[]
  characters: Character[]
  chapters: Chapter[]
}

export interface EventWithCharacters extends Event {
  characters: Character[]
}

// ── Filter Types ─────────────────────────────────────────────

export interface EventFilters {
  status?: EventStatus[]
  tags?: string[]
  character_ids?: string[]
  layer_ids?: string[]
  date_from?: string
  date_to?: string
  tension_min?: number
  tension_max?: number
  search?: string
}

// ── Supabase Database type (for createClient<Database>()) ───

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & Pick<Profile, 'id'>
        Update: Partial<Profile>
      }
      projects: {
        Row: Project
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Omit<Project, 'id' | 'created_at'>>
      }
      project_folders: {
        Row: ProjectFolder
        Insert: Omit<ProjectFolder, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<ProjectFolder, 'id' | 'created_at'>>
      }
      chapters: {
        Row: Chapter
        Insert: Omit<Chapter, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<Chapter, 'id' | 'created_at'>>
      }
      outlines: {
        Row: Outline
        Insert: Omit<Outline, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Omit<Outline, 'id' | 'created_at'>>
      }
      layer_groups: {
        Row: LayerGroup
        Insert: Omit<LayerGroup, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<LayerGroup, 'id' | 'created_at'>>
      }
      layers: {
        Row: Layer
        Insert: Omit<Layer, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Omit<Layer, 'id' | 'created_at'>>
      }
      statuses: {
        Row: Status
        Insert: Omit<Status, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Omit<Status, 'id' | 'created_at'>>
      }
      characters: {
        Row: Character
        Insert: Omit<Character, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Omit<Character, 'id' | 'created_at'>>
      }
      events: {
        Row: Event
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Omit<Event, 'id' | 'created_at'>>
      }
      event_characters: {
        Row: EventCharacter
        Insert: EventCharacter
        Update: Partial<EventCharacter>
      }
      places: {
        Row: Place
        Insert: Omit<Place, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Omit<Place, 'id' | 'created_at'>>
      }
      event_places: {
        Row: EventPlace
        Insert: EventPlace
        Update: Partial<EventPlace>
      }
      event_dependencies: {
        Row: EventDependency
        Insert: Omit<EventDependency, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<EventDependency, 'id' | 'created_at'>>
      }
      character_relationships: {
        Row: CharacterRelationship
        Insert: Omit<CharacterRelationship, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<CharacterRelationship, 'id' | 'created_at'>>
      }
      family_trees: {
        Row: FamilyTree
        Insert: Omit<FamilyTree, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Omit<FamilyTree, 'id' | 'created_at'>>
      }
      family_tree_members: {
        Row: FamilyTreeMember
        Insert: Omit<FamilyTreeMember, 'created_at'>
        Update: Partial<Omit<FamilyTreeMember, 'tree_id' | 'character_id' | 'created_at'>>
      }
      chapter_links: {
        Row: ChapterLink
        Insert: Omit<ChapterLink, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<ChapterLink, 'id' | 'created_at'>>
      }
    }
    Enums: {
      app_mode: AppMode
      event_status: EventStatus
      layer_type: LayerType
      relationship_type: RelationshipType
      place_type: PlaceType
    }
  }
}
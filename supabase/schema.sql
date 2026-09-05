-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS
CREATE TYPE app_mode AS ENUM ('basic', 'advanced');
CREATE TYPE layer_type AS ENUM ('main', 'character', 'subplot', 'theme', 'custom');
CREATE TYPE relationship_type AS ENUM ('parent', 'sibling', 'spouse', 'friend', 'enemy', 'mentor', 'rival', 'other');
CREATE TYPE place_type AS ENUM ('city', 'town', 'village', 'building', 'room', 'country', 'region', 'world', 'other');

-- PROFILES
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT UNIQUE,
  display_name    TEXT,
  avatar_url      TEXT,
  app_mode        app_mode    NOT NULL DEFAULT 'basic',
  theme           TEXT        NOT NULL DEFAULT 'sync',
  sound_enabled   BOOLEAN     NOT NULL DEFAULT TRUE,
  sound_volume    SMALLINT    NOT NULL DEFAULT 70,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- PROJECT FOLDERS
CREATE TABLE project_folders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  collapsed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PROJECTS
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  folder_id       UUID REFERENCES project_folders(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  cover_image_url TEXT,
  mode            app_mode NOT NULL DEFAULT 'basic',
  settings        JSONB NOT NULL DEFAULT '{}',
  timeline_start  DATE,
  timeline_end    DATE,
  archived        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-seed default statuses on project creation, so status_id always
-- has something to attach to (mirrors handle_new_user above).
CREATE OR REPLACE FUNCTION seed_default_statuses()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO statuses (project_id, name, color, is_default, position) VALUES
    (NEW.id, 'Draft',   '#71717a', TRUE,  0),
    (NEW.id, 'Outline', '#6366F1', FALSE, 1),
    (NEW.id, 'Written', '#F59E0B', FALSE, 2),
    (NEW.id, 'Revised', '#8B5CF6', FALSE, 3),
    (NEW.id, 'Final',   '#10B981', FALSE, 4);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_project_created_seed_statuses
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION seed_default_statuses();

-- LAYER GROUPS
CREATE TABLE layer_groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  collapsed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LAYERS
CREATE TABLE layers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  group_id    UUID REFERENCES layer_groups(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  type        layer_type NOT NULL DEFAULT 'custom',
  color       TEXT NOT NULL DEFAULT '#6366F1',
  position    INTEGER NOT NULL DEFAULT 0,
  visible     BOOLEAN NOT NULL DEFAULT TRUE,
  locked      BOOLEAN NOT NULL DEFAULT FALSE,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CHARACTERS
CREATE TABLE characters (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT,
  description TEXT,
  color       TEXT,
  avatar_url  TEXT,
  notes       TEXT,
  custom_fields JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PLACES
CREATE TABLE places (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        place_type NOT NULL DEFAULT 'other',
  color       TEXT,
  description JSONB NOT NULL DEFAULT '{}',
  notes       JSONB NOT NULL DEFAULT '{}',
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STATUSES (per-project customizable, replaces the old event_status enum)
CREATE TABLE statuses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#71717a',
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EVENTS
CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  layer_id        UUID NOT NULL REFERENCES layers(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  notes           TEXT,
  start_date      DATE,
  end_date        DATE,
  position        FLOAT NOT NULL DEFAULT 0,
  duration        FLOAT NOT NULL DEFAULT 0,
  color           TEXT,
  icon            TEXT,
  status_id       UUID NOT NULL REFERENCES statuses(id) ON DELETE RESTRICT,
  tension_level   SMALLINT CHECK (tension_level BETWEEN 0 AND 10),
  word_count      INTEGER,
  custom_fields   JSONB NOT NULL DEFAULT '{}',
  attachments     JSONB NOT NULL DEFAULT '[]',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OUTLINES
CREATE TABLE outlines (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Outline',
  position    FLOAT NOT NULL DEFAULT 0,
  content     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EVENT <-> CHARACTER
CREATE TABLE event_characters (
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  role         TEXT,
  PRIMARY KEY (event_id, character_id)
);

-- EVENT <-> PLACE
CREATE TABLE event_places (
  event_id  UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  place_id  UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, place_id)
);

-- DEPENDENCIES
CREATE TABLE event_dependencies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  target_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label         TEXT,
  style         TEXT NOT NULL DEFAULT 'solid',
  color         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_dependency CHECK (source_id <> target_id),
  UNIQUE (source_id, target_id)
);

-- CHARACTER RELATIONSHIPS
CREATE TABLE character_relationships (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id           UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  target_character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  relationship_type    relationship_type NOT NULL,
  relationship_label   TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_relationship CHECK (source_character_id <> target_character_id)
);

-- FAMILY TREES
CREATE TABLE family_trees (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FAMILY TREE MEMBERS
CREATE TABLE family_tree_members (
  tree_id       UUID NOT NULL REFERENCES family_trees(id) ON DELETE CASCADE,
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  x             FLOAT NOT NULL DEFAULT 0,
  y             FLOAT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tree_id, character_id)
);

-- CHAPTERS (timeline columns; also the grouping unit for panels)
-- Reverse-engineered from the live database — this table was created via the
-- Supabase dashboard and was never tracked here, so schema.sql couldn't
-- recreate it. Columns, RLS and the FK delete rule below were each confirmed
-- against information_schema/pg_catalog rather than inferred. Note there is
-- deliberately no updated_at column and no updated_at trigger, matching live.
CREATE TABLE chapters (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chapter detail fields. Kept as an ALTER rather than folded into the CREATE
-- above so this doubles as the migration for existing databases, where the
-- table already exists without them — running the file top to bottom still
-- produces the same final shape. description matches the Tiptap-document
-- pattern used by outlines.content and places.description/notes;
-- pov_character_id nulls out rather than cascading so deleting a character
-- doesn't take the chapter with it; word_count is manually entered, same as
-- events.word_count.
ALTER TABLE chapters
  ADD COLUMN description      JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN pov_character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  ADD COLUMN word_count       INTEGER;

-- CHAPTER LINKS ("continues from" — chapter_id inherits/continues from
-- continues_from_chapter_id; not restricted to adjacent chapters, and a
-- chapter can have multiple continues_from links for converging storylines)
CREATE TABLE chapter_links (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id                UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id                UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  continues_from_chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_chapter_link CHECK (chapter_id <> continues_from_chapter_id),
  UNIQUE (chapter_id, continues_from_chapter_id)
);

-- PANELS (manga-style storyboard grid, one row per panel within a chapter)
CREATE TABLE panels (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id  UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  position    FLOAT NOT NULL DEFAULT 0,
  image_url   TEXT,
  caption     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_projects_owner     ON projects(owner_id);
CREATE INDEX idx_projects_archived  ON projects(owner_id, archived);
CREATE INDEX idx_projects_folder    ON projects(folder_id);
CREATE INDEX idx_project_folders_owner ON project_folders(owner_id);
CREATE INDEX idx_layers_project     ON layers(project_id);
CREATE INDEX idx_layers_position    ON layers(project_id, position);
CREATE INDEX idx_layers_group       ON layers(group_id);
CREATE INDEX idx_events_project     ON events(project_id);
CREATE INDEX idx_events_layer       ON events(layer_id);
CREATE INDEX idx_events_chapter     ON events(chapter_id);
CREATE INDEX idx_events_position    ON events(layer_id, position);
CREATE INDEX idx_events_dates       ON events(project_id, start_date, end_date);
CREATE INDEX idx_events_tags        ON events USING GIN(tags);
CREATE INDEX idx_events_custom      ON events USING GIN(custom_fields);
CREATE INDEX idx_events_status_id   ON events(project_id, status_id);
CREATE INDEX idx_statuses_project   ON statuses(project_id);
CREATE UNIQUE INDEX idx_statuses_one_default_per_project
  ON statuses(project_id) WHERE is_default;
CREATE INDEX idx_characters_project ON characters(project_id);
CREATE INDEX idx_ec_event           ON event_characters(event_id);
CREATE INDEX idx_ec_character       ON event_characters(character_id);
CREATE INDEX idx_places_project     ON places(project_id);
CREATE INDEX idx_ep_event           ON event_places(event_id);
CREATE INDEX idx_ep_place           ON event_places(place_id);
CREATE INDEX idx_deps_project       ON event_dependencies(project_id);
CREATE INDEX idx_deps_source        ON event_dependencies(source_id);
CREATE INDEX idx_deps_target        ON event_dependencies(target_id);
CREATE INDEX idx_lg_project         ON layer_groups(project_id);
CREATE INDEX idx_cr_project         ON character_relationships(project_id);
CREATE INDEX idx_cr_source          ON character_relationships(source_character_id);
CREATE INDEX idx_cr_target          ON character_relationships(target_character_id);
CREATE INDEX idx_ft_project         ON family_trees(project_id);
CREATE INDEX idx_ftm_tree           ON family_tree_members(tree_id);
CREATE INDEX idx_ftm_character      ON family_tree_members(character_id);
CREATE INDEX idx_cl_project         ON chapter_links(project_id);
CREATE INDEX idx_cl_chapter         ON chapter_links(chapter_id);
CREATE INDEX idx_cl_continues_from  ON chapter_links(continues_from_chapter_id);
CREATE INDEX idx_panels_chapter     ON panels(chapter_id, position);

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_projects
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_layers
  BEFORE UPDATE ON layers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_statuses
  BEFORE UPDATE ON statuses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_events
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_characters
  BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_outlines
  BEFORE UPDATE ON outlines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_family_trees
  BEFORE UPDATE ON family_trees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_places
  BEFORE UPDATE ON places
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_panels
  BEFORE UPDATE ON panels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ROW LEVEL SECURITY
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_folders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE layer_groups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE layers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE statuses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlines              ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters            ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_characters      ENABLE ROW LEVEL SECURITY;
ALTER TABLE places                ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_places          ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_dependencies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_trees          ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_tree_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters              ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_links         ENABLE ROW LEVEL SECURITY;
ALTER TABLE panels                ENABLE ROW LEVEL SECURITY;

-- PROFILES RLS
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- PROJECT FOLDERS RLS
CREATE POLICY "Users can view their own project folders"
  ON project_folders FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own project folders"
  ON project_folders FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own project folders"
  ON project_folders FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own project folders"
  ON project_folders FOR DELETE USING (auth.uid() = owner_id);

-- PROJECTS RLS
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own projects"
  ON projects FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE USING (auth.uid() = owner_id);

-- HELPER FUNCTION
CREATE OR REPLACE FUNCTION owns_project(p_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects WHERE id = p_id AND owner_id = auth.uid()
  );
$$;

-- LAYER GROUPS RLS
CREATE POLICY "layer_groups_select" ON layer_groups FOR SELECT USING (owns_project(project_id));
CREATE POLICY "layer_groups_insert" ON layer_groups FOR INSERT WITH CHECK (owns_project(project_id));
CREATE POLICY "layer_groups_update" ON layer_groups FOR UPDATE USING (owns_project(project_id));
CREATE POLICY "layer_groups_delete" ON layer_groups FOR DELETE USING (owns_project(project_id));

-- LAYERS RLS
CREATE POLICY "layers_select" ON layers FOR SELECT USING (owns_project(project_id));
CREATE POLICY "layers_insert" ON layers FOR INSERT WITH CHECK (owns_project(project_id));
CREATE POLICY "layers_update" ON layers FOR UPDATE USING (owns_project(project_id));
CREATE POLICY "layers_delete" ON layers FOR DELETE USING (owns_project(project_id));

-- STATUSES RLS
CREATE POLICY "statuses_select" ON statuses FOR SELECT USING (owns_project(project_id));
CREATE POLICY "statuses_insert" ON statuses FOR INSERT WITH CHECK (owns_project(project_id));
CREATE POLICY "statuses_update" ON statuses FOR UPDATE USING (owns_project(project_id));
CREATE POLICY "statuses_delete" ON statuses FOR DELETE USING (owns_project(project_id));

-- EVENTS RLS
CREATE POLICY "events_select" ON events FOR SELECT USING (owns_project(project_id));
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (owns_project(project_id));
CREATE POLICY "events_update" ON events FOR UPDATE USING (owns_project(project_id));
CREATE POLICY "events_delete" ON events FOR DELETE USING (owns_project(project_id));

-- OUTLINES RLS
CREATE POLICY "outlines_select" ON outlines FOR SELECT USING (owns_project(project_id));
CREATE POLICY "outlines_insert" ON outlines FOR INSERT WITH CHECK (owns_project(project_id));
CREATE POLICY "outlines_update" ON outlines FOR UPDATE USING (owns_project(project_id));
CREATE POLICY "outlines_delete" ON outlines FOR DELETE USING (owns_project(project_id));

-- CHARACTERS RLS
CREATE POLICY "characters_select" ON characters FOR SELECT USING (owns_project(project_id));
CREATE POLICY "characters_insert" ON characters FOR INSERT WITH CHECK (owns_project(project_id));
CREATE POLICY "characters_update" ON characters FOR UPDATE USING (owns_project(project_id));
CREATE POLICY "characters_delete" ON characters FOR DELETE USING (owns_project(project_id));

-- EVENT_CHARACTERS RLS
CREATE POLICY "ec_select" ON event_characters FOR SELECT
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND owns_project(e.project_id)));
CREATE POLICY "ec_insert" ON event_characters FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND owns_project(e.project_id)));
CREATE POLICY "ec_delete" ON event_characters FOR DELETE
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND owns_project(e.project_id)));

-- PLACES RLS
CREATE POLICY "places_select" ON places FOR SELECT USING (owns_project(project_id));
CREATE POLICY "places_insert" ON places FOR INSERT WITH CHECK (owns_project(project_id));
CREATE POLICY "places_update" ON places FOR UPDATE USING (owns_project(project_id));
CREATE POLICY "places_delete" ON places FOR DELETE USING (owns_project(project_id));

-- EVENT_PLACES RLS
CREATE POLICY "ep_select" ON event_places FOR SELECT
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND owns_project(e.project_id)));
CREATE POLICY "ep_insert" ON event_places FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND owns_project(e.project_id)));
CREATE POLICY "ep_delete" ON event_places FOR DELETE
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND owns_project(e.project_id)));

-- EVENT_DEPENDENCIES RLS
CREATE POLICY "deps_select" ON event_dependencies FOR SELECT USING (owns_project(project_id));
CREATE POLICY "deps_insert" ON event_dependencies FOR INSERT WITH CHECK (owns_project(project_id));
CREATE POLICY "deps_update" ON event_dependencies FOR UPDATE USING (owns_project(project_id));
CREATE POLICY "deps_delete" ON event_dependencies FOR DELETE USING (owns_project(project_id));

-- CHARACTER_RELATIONSHIPS RLS
CREATE POLICY "cr_select" ON character_relationships FOR SELECT USING (owns_project(project_id));
CREATE POLICY "cr_insert" ON character_relationships FOR INSERT WITH CHECK (owns_project(project_id));
CREATE POLICY "cr_update" ON character_relationships FOR UPDATE USING (owns_project(project_id));
CREATE POLICY "cr_delete" ON character_relationships FOR DELETE USING (owns_project(project_id));

-- FAMILY_TREES RLS
CREATE POLICY "family_trees_select" ON family_trees FOR SELECT USING (owns_project(project_id));
CREATE POLICY "family_trees_insert" ON family_trees FOR INSERT WITH CHECK (owns_project(project_id));
CREATE POLICY "family_trees_update" ON family_trees FOR UPDATE USING (owns_project(project_id));
CREATE POLICY "family_trees_delete" ON family_trees FOR DELETE USING (owns_project(project_id));

-- FAMILY_TREE_MEMBERS RLS (ownership via family_trees.project_id)
CREATE POLICY "ftm_select" ON family_tree_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM family_trees ft WHERE ft.id = tree_id AND owns_project(ft.project_id)));
CREATE POLICY "ftm_insert" ON family_tree_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM family_trees ft WHERE ft.id = tree_id AND owns_project(ft.project_id)));
CREATE POLICY "ftm_update" ON family_tree_members FOR UPDATE
  USING (EXISTS (SELECT 1 FROM family_trees ft WHERE ft.id = tree_id AND owns_project(ft.project_id)));
CREATE POLICY "ftm_delete" ON family_tree_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM family_trees ft WHERE ft.id = tree_id AND owns_project(ft.project_id)));

-- CHAPTER_LINKS RLS
CREATE POLICY "chapter_links_select" ON chapter_links FOR SELECT USING (owns_project(project_id));
CREATE POLICY "chapter_links_insert" ON chapter_links FOR INSERT WITH CHECK (owns_project(project_id));
CREATE POLICY "chapter_links_update" ON chapter_links FOR UPDATE USING (owns_project(project_id));
CREATE POLICY "chapter_links_delete" ON chapter_links FOR DELETE USING (owns_project(project_id));

-- CHAPTERS RLS
-- Already live (created via the dashboard alongside the table); recorded here
-- so a from-scratch run reproduces them.
CREATE POLICY "chapters_select" ON chapters FOR SELECT USING (owns_project(project_id));
CREATE POLICY "chapters_insert" ON chapters FOR INSERT WITH CHECK (owns_project(project_id));
CREATE POLICY "chapters_update" ON chapters FOR UPDATE USING (owns_project(project_id));
CREATE POLICY "chapters_delete" ON chapters FOR DELETE USING (owns_project(project_id));

-- PANELS RLS
CREATE POLICY "panels_select" ON panels FOR SELECT USING (owns_project(project_id));
CREATE POLICY "panels_insert" ON panels FOR INSERT WITH CHECK (owns_project(project_id));
CREATE POLICY "panels_update" ON panels FOR UPDATE USING (owns_project(project_id));
CREATE POLICY "panels_delete" ON panels FOR DELETE USING (owns_project(project_id));

-- GRANTS
-- RLS policies control row-level access, but Postgres also requires the
-- underlying table-level privilege to be granted — RLS doesn't substitute
-- for a GRANT. Tables created via the Supabase dashboard get this
-- automatically; these five were added by pasting raw SQL into the SQL
-- editor, which skipped it, causing "permission denied for table X" even
-- though the RLS policies above are correct.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE character_relationships TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE family_trees TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE family_tree_members TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE places TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE event_places TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE chapters TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE chapter_links TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE panels TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE statuses TO anon, authenticated, service_role;

-- REALTIME PUBLICATION
-- panels is the first table whose realtime membership is tracked here in
-- schema.sql rather than added ad hoc via the dashboard/SQL editor (see
-- feedback_supabase_table_grants memory) — usePanels is its first
-- postgres_changes subscriber.
ALTER PUBLICATION supabase_realtime ADD TABLE panels;

-- Under the default replica identity a DELETE only writes the primary key to
-- the WAL, so `old` carries no chapter_id and usePanels' filter
-- (chapter_id=eq.…) can never match — remote deletes were silently never
-- delivered. FULL logs the whole old row so the filter matches and the
-- payload is usable. chapters, events, layers and statuses were already set
-- to FULL out-of-band; panels was missed, and is recorded here so the setting
-- isn't invisible to the tracked schema again.
ALTER TABLE panels REPLICA IDENTITY FULL;

-- DUPLICATE PROJECT
-- Single-transaction deep clone: builds an old-id -> new-id temp table per
-- entity type, then inserts every dependent/junction table joined against
-- those maps. p_mode = 'full' clones everything; 'structure' clones only
-- layers/statuses/chapters (+ chapter_links, since chapter-to-chapter
-- continuation is structural, not content) as a blank-content template.
-- layer_groups is intentionally never cloned — confirmed unused app-wide
-- (no code creates rows there), so cloned layers just get group_id = NULL.
CREATE OR REPLACE FUNCTION duplicate_project(
  p_source_project_id UUID,
  p_new_title TEXT,
  p_mode TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new_project_id UUID;
BEGIN
  IF NOT owns_project(p_source_project_id) THEN
    RAISE EXCEPTION 'Not authorized to duplicate this project';
  END IF;

  IF p_mode NOT IN ('full', 'structure') THEN
    RAISE EXCEPTION 'Invalid mode: %', p_mode;
  END IF;

  -- 1. PROJECT
  INSERT INTO projects (owner_id, folder_id, title, description, cover_image_url, mode, settings, timeline_start, timeline_end, archived)
  SELECT owner_id, folder_id, p_new_title, description, cover_image_url, mode, settings, timeline_start, timeline_end, FALSE
  FROM projects WHERE id = p_source_project_id
  RETURNING id INTO v_new_project_id;

  -- on_project_created_seed_statuses just fired and seeded 5 default
  -- statuses onto v_new_project_id. Undo that before cloning the source
  -- project's real statuses below, otherwise the cloned default collides
  -- with the trigger-seeded one on idx_statuses_one_default_per_project.
  DELETE FROM statuses WHERE project_id = v_new_project_id;

  -- 2. LAYERS
  CREATE TEMP TABLE layer_map ON COMMIT DROP AS
    SELECT id AS old_id, gen_random_uuid() AS new_id
    FROM layers WHERE project_id = p_source_project_id;

  INSERT INTO layers (id, project_id, group_id, name, type, color, position, visible, locked, metadata)
  SELECT m.new_id, v_new_project_id, NULL, l.name, l.type, l.color, l.position, l.visible, l.locked, l.metadata
  FROM layers l JOIN layer_map m ON m.old_id = l.id;

  -- 3. STATUSES
  CREATE TEMP TABLE status_map ON COMMIT DROP AS
    SELECT id AS old_id, gen_random_uuid() AS new_id
    FROM statuses WHERE project_id = p_source_project_id;

  INSERT INTO statuses (id, project_id, name, color, is_default, position)
  SELECT m.new_id, v_new_project_id, s.name, s.color, s.is_default, s.position
  FROM statuses s JOIN status_map m ON m.old_id = s.id;

  -- 4. CHAPTERS
  CREATE TEMP TABLE chapter_map ON COMMIT DROP AS
    SELECT id AS old_id, gen_random_uuid() AS new_id
    FROM chapters WHERE project_id = p_source_project_id;

  INSERT INTO chapters (id, project_id, title, position)
  SELECT m.new_id, v_new_project_id, c.title, c.position
  FROM chapters c JOIN chapter_map m ON m.old_id = c.id;

  -- 5. CHAPTER LINKS
  INSERT INTO chapter_links (project_id, chapter_id, continues_from_chapter_id)
  SELECT v_new_project_id, cm1.new_id, cm2.new_id
  FROM chapter_links cl
  JOIN chapter_map cm1 ON cm1.old_id = cl.chapter_id
  JOIN chapter_map cm2 ON cm2.old_id = cl.continues_from_chapter_id
  WHERE cl.project_id = p_source_project_id;

  IF p_mode = 'full' THEN
    -- 6. CHARACTERS
    CREATE TEMP TABLE character_map ON COMMIT DROP AS
      SELECT id AS old_id, gen_random_uuid() AS new_id
      FROM characters WHERE project_id = p_source_project_id;

    INSERT INTO characters (id, project_id, name, role, description, color, avatar_url, notes, custom_fields)
    SELECT m.new_id, v_new_project_id, c.name, c.role, c.description, c.color, c.avatar_url, c.notes, c.custom_fields
    FROM characters c JOIN character_map m ON m.old_id = c.id;

    -- 7. PLACES
    CREATE TEMP TABLE place_map ON COMMIT DROP AS
      SELECT id AS old_id, gen_random_uuid() AS new_id
      FROM places WHERE project_id = p_source_project_id;

    INSERT INTO places (id, project_id, name, type, color, description, notes, image_url)
    SELECT m.new_id, v_new_project_id, p.name, p.type, p.color, p.description, p.notes, p.image_url
    FROM places p JOIN place_map m ON m.old_id = p.id;

    -- 8. EVENTS (chapter_id is nullable, hence the LEFT JOIN — every other
    -- map join is required, matching each column's NOT NULL constraint)
    CREATE TEMP TABLE event_map ON COMMIT DROP AS
      SELECT id AS old_id, gen_random_uuid() AS new_id
      FROM events WHERE project_id = p_source_project_id;

    INSERT INTO events (
      id, project_id, layer_id, chapter_id, title, description, notes,
      start_date, end_date, position, duration, color, icon, status_id,
      tension_level, word_count, custom_fields, attachments, tags
    )
    SELECT
      em.new_id, v_new_project_id, lm.new_id, cm.new_id,
      e.title, e.description, e.notes, e.start_date, e.end_date, e.position,
      e.duration, e.color, e.icon, sm.new_id, e.tension_level, e.word_count,
      e.custom_fields, e.attachments, e.tags
    FROM events e
    JOIN event_map em ON em.old_id = e.id
    JOIN layer_map lm ON lm.old_id = e.layer_id
    LEFT JOIN chapter_map cm ON cm.old_id = e.chapter_id
    JOIN status_map sm ON sm.old_id = e.status_id;

    -- 9. EVENT <-> CHARACTER / PLACE
    INSERT INTO event_characters (event_id, character_id, role)
    SELECT em.new_id, chm.new_id, ec.role
    FROM event_characters ec
    JOIN event_map em ON em.old_id = ec.event_id
    JOIN character_map chm ON chm.old_id = ec.character_id;

    INSERT INTO event_places (event_id, place_id)
    SELECT em.new_id, plm.new_id
    FROM event_places ep
    JOIN event_map em ON em.old_id = ep.event_id
    JOIN place_map plm ON plm.old_id = ep.place_id;

    -- 10. EVENT DEPENDENCIES
    INSERT INTO event_dependencies (project_id, source_id, target_id, label, style, color)
    SELECT v_new_project_id, em1.new_id, em2.new_id, ed.label, ed.style, ed.color
    FROM event_dependencies ed
    JOIN event_map em1 ON em1.old_id = ed.source_id
    JOIN event_map em2 ON em2.old_id = ed.target_id
    WHERE ed.project_id = p_source_project_id;

    -- 11. CHARACTER RELATIONSHIPS
    INSERT INTO character_relationships (project_id, source_character_id, target_character_id, relationship_type, relationship_label)
    SELECT v_new_project_id, cm1.new_id, cm2.new_id, cr.relationship_type, cr.relationship_label
    FROM character_relationships cr
    JOIN character_map cm1 ON cm1.old_id = cr.source_character_id
    JOIN character_map cm2 ON cm2.old_id = cr.target_character_id
    WHERE cr.project_id = p_source_project_id;

    -- 12. FAMILY TREES + MEMBERS
    CREATE TEMP TABLE tree_map ON COMMIT DROP AS
      SELECT id AS old_id, gen_random_uuid() AS new_id
      FROM family_trees WHERE project_id = p_source_project_id;

    INSERT INTO family_trees (id, project_id, name, position)
    SELECT m.new_id, v_new_project_id, ft.name, ft.position
    FROM family_trees ft JOIN tree_map m ON m.old_id = ft.id;

    INSERT INTO family_tree_members (tree_id, character_id, x, y)
    SELECT tm.new_id, chm.new_id, ftm.x, ftm.y
    FROM family_tree_members ftm
    JOIN tree_map tm ON tm.old_id = ftm.tree_id
    JOIN character_map chm ON chm.old_id = ftm.character_id;

    -- 13. OUTLINES (content copied verbatim, no remapping needed)
    INSERT INTO outlines (project_id, name, position, content)
    SELECT v_new_project_id, o.name, o.position, o.content
    FROM outlines o
    WHERE o.project_id = p_source_project_id;
  END IF;

  RETURN v_new_project_id;
END;
$$;

-- Trigram indexes power fast ILIKE '%term%' substring search (pg_trgm's
-- main use case — GIN trigram indexes accelerate pattern-match queries that
-- a plain btree index can't help with at all).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_characters_name_trgm ON characters USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_events_title_trgm    ON events USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_places_name_trgm     ON places USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_chapters_title_trgm  ON chapters USING GIN (title gin_trgm_ops);

-- SEARCH ENTITIES
-- SECURITY INVOKER (the default, stated explicitly to contrast with
-- duplicate_project's SECURITY DEFINER): runs as the calling user, so
-- characters_select/events_select/places_select's existing owns_project(...)
-- RLS policies apply automatically — no hand-rolled authorization check.
-- p_project_id is nullable: NULL searches across every project the calling
-- user owns (RLS still scopes that to their own rows), a specific UUID
-- scopes to just that project. Either way RLS is what actually enforces
-- ownership — p_project_id only changes what the function expresses, not
-- who's allowed to see what.
-- v1 scope: titles/names only (characters.name, events.title, places.name,
-- chapters.title). No tags (column's empty everywhere, no UI sets it yet),
-- no character_relationships (not independently searchable right now).
-- search_path includes `extensions` because Supabase installs pg_trgm
-- there by default, not `public` — similarity() wouldn't resolve otherwise.
-- Joins to projects for project_id/project_title so the all-projects search
-- UI can label each result with its parent project — RLS on projects
-- (SECURITY INVOKER, same as everything else here) already scopes that join
-- to projects the calling user owns, same as the entity tables themselves.
CREATE OR REPLACE FUNCTION search_entities(p_query TEXT, p_project_id UUID DEFAULT NULL)
RETURNS TABLE (
  entity_type TEXT,
  id UUID,
  title TEXT,
  rank REAL,
  project_id UUID,
  project_title TEXT
)
LANGUAGE sql SECURITY INVOKER SET search_path = public, extensions AS $$
  SELECT 'character', c.id, c.name, similarity(c.name, p_query) AS rank, c.project_id, p.title
  FROM characters c JOIN projects p ON p.id = c.project_id
  WHERE (p_project_id IS NULL OR c.project_id = p_project_id)
    AND c.name ILIKE '%' || p_query || '%'

  UNION ALL

  SELECT 'event', e.id, e.title, similarity(e.title, p_query) AS rank, e.project_id, p.title
  FROM events e JOIN projects p ON p.id = e.project_id
  WHERE (p_project_id IS NULL OR e.project_id = p_project_id)
    AND e.title ILIKE '%' || p_query || '%'

  UNION ALL

  SELECT 'place', pl.id, pl.name, similarity(pl.name, p_query) AS rank, pl.project_id, p.title
  FROM places pl JOIN projects p ON p.id = pl.project_id
  WHERE (p_project_id IS NULL OR pl.project_id = p_project_id)
    AND pl.name ILIKE '%' || p_query || '%'

  UNION ALL

  SELECT 'chapter', ch.id, ch.title, similarity(ch.title, p_query) AS rank, ch.project_id, p.title
  FROM chapters ch JOIN projects p ON p.id = ch.project_id
  WHERE (p_project_id IS NULL OR ch.project_id = p_project_id)
    AND ch.title ILIKE '%' || p_query || '%'

  ORDER BY rank DESC
  LIMIT 50;
$$;
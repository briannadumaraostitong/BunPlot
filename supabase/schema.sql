-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS
CREATE TYPE accent_color AS ENUM ('blue', 'purple', 'emerald');
CREATE TYPE app_mode AS ENUM ('basic', 'advanced');
CREATE TYPE event_status AS ENUM ('draft', 'outline', 'written', 'revised', 'final');
CREATE TYPE layer_type AS ENUM ('main', 'character', 'subplot', 'theme', 'custom');

-- PROFILES
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT UNIQUE,
  display_name    TEXT,
  avatar_url      TEXT,
  accent_color    accent_color NOT NULL DEFAULT 'blue',
  app_mode        app_mode    NOT NULL DEFAULT 'basic',
  theme           TEXT        NOT NULL DEFAULT 'system',
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
  status          event_status NOT NULL DEFAULT 'draft',
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
CREATE INDEX idx_events_position    ON events(layer_id, position);
CREATE INDEX idx_events_dates       ON events(project_id, start_date, end_date);
CREATE INDEX idx_events_tags        ON events USING GIN(tags);
CREATE INDEX idx_events_custom      ON events USING GIN(custom_fields);
CREATE INDEX idx_events_status      ON events(project_id, status);
CREATE INDEX idx_characters_project ON characters(project_id);
CREATE INDEX idx_ec_event           ON event_characters(event_id);
CREATE INDEX idx_ec_character       ON event_characters(character_id);
CREATE INDEX idx_deps_project       ON event_dependencies(project_id);
CREATE INDEX idx_deps_source        ON event_dependencies(source_id);
CREATE INDEX idx_deps_target        ON event_dependencies(target_id);
CREATE INDEX idx_lg_project         ON layer_groups(project_id);

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

CREATE TRIGGER set_updated_at_events
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_characters
  BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_outlines
  BEFORE UPDATE ON outlines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ROW LEVEL SECURITY
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_folders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE layer_groups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE layers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlines           ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters         ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_characters   ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_dependencies ENABLE ROW LEVEL SECURITY;

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

-- EVENT_DEPENDENCIES RLS
CREATE POLICY "deps_select" ON event_dependencies FOR SELECT USING (owns_project(project_id));
CREATE POLICY "deps_insert" ON event_dependencies FOR INSERT WITH CHECK (owns_project(project_id));
CREATE POLICY "deps_update" ON event_dependencies FOR UPDATE USING (owns_project(project_id));
CREATE POLICY "deps_delete" ON event_dependencies FOR DELETE USING (owns_project(project_id));
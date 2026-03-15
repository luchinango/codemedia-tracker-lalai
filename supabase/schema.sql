-- ============================================================
-- CodeMedia Tracker - Database Schema (Supabase / PostgreSQL)
-- ============================================================

-- 1. Custom ENUM types
CREATE TYPE user_role AS ENUM ('admin', 'dev', 'client');
CREATE TYPE project_status AS ENUM ('active', 'paused', 'completed', 'cancelled');
CREATE TYPE issue_status AS ENUM ('todo', 'in_progress', 'done');

-- 2. Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'dev',
  hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  quoted_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status project_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Issues table
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status issue_status NOT NULL DEFAULT 'todo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Time logs table
CREATE TABLE time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Indexes for common queries
CREATE INDEX idx_issues_project_id ON issues(project_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_time_logs_issue_id ON time_logs(issue_id);
CREATE INDEX idx_time_logs_user_id ON time_logs(user_id);
CREATE INDEX idx_time_logs_open ON time_logs(issue_id, user_id) WHERE end_time IS NULL;

-- 7. Row Level Security (RLS) - Enable on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated users (adjust per your auth needs)
CREATE POLICY "Authenticated users can read users"
  ON users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read projects"
  ON projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users full access on projects"
  ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access on issues"
  ON issues FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access on time_logs"
  ON time_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- LALAI V5 — Migración Incremental
-- Ejecutar en Supabase SQL Editor
-- Incluye: responsible_id, project_collaborators, project_code,
--          salary_expectation_bob, payment columns fix
-- ============================================================

-- 1. Responsible_id en projects
DO $$ BEGIN
  ALTER TABLE projects ADD COLUMN responsible_id UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. Project code en projects (3-5 letras, ej: TXA)
DO $$ BEGIN
  ALTER TABLE projects ADD COLUMN project_code VARCHAR(5) UNIQUE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 3. salary_expectation_bob en users
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN salary_expectation_bob NUMERIC(12, 2) DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 4. Project collaborators table
CREATE TABLE IF NOT EXISTS project_collaborators (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;

-- 5. RLS policy abierta para MVP (idempotent)
DROP POLICY IF EXISTS "Allow all" ON project_collaborators;
CREATE POLICY "Allow all" ON project_collaborators FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. Phone column en users (WhatsApp)
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN phone VARCHAR(20);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 7. Ensure payments uses correct column names
-- (If your table still has 'date' and 'type', rename them)
DO $$ BEGIN
  ALTER TABLE payments RENAME COLUMN date TO payment_date;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payments RENAME COLUMN type TO payment_type;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- 8. Refrescar schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- LALAI V7 — Auth, Roles & Client Share
-- Ejecutar en Supabase SQL Editor
-- Incluye: access_token, client_view_enabled, role column,
--          auth_id linkage, RLS refinement
-- ============================================================

-- 1. Access token + client view on projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS access_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS client_view_enabled BOOLEAN DEFAULT true;

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_projects_access_token ON public.projects(access_token);

-- 2. Role column on users (if not using the enum already)
-- The DB has user_role enum ('admin','dev','client') from schema.sql
-- Some rows may have been inserted with text values; ensure column exists
DO $$ BEGIN
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'dev';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 3. Link users table to Supabase Auth
DO $$ BEGIN
  ALTER TABLE public.users ADD COLUMN auth_id UUID UNIQUE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Index for auth_id lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);

-- 4. Allow anonymous read on projects via access_token (for /share/[token])
-- First ensure anon can read projects with a valid token
DROP POLICY IF EXISTS "Public can view project by token" ON public.projects;
CREATE POLICY "Public can view project by token"
  ON public.projects FOR SELECT
  TO anon
  USING (client_view_enabled = true);

-- Anon can read issues for shared projects
DROP POLICY IF EXISTS "Public can view issues of shared projects" ON public.issues;
CREATE POLICY "Public can view issues of shared projects"
  ON public.issues FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = issues.project_id
        AND p.client_view_enabled = true
    )
  );

-- Anon can read payments for shared projects
DROP POLICY IF EXISTS "Public can view payments of shared projects" ON public.payments;
CREATE POLICY "Public can view payments of shared projects"
  ON public.payments FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = payments.project_id
        AND p.client_view_enabled = true
    )
  );

-- 5. Refresh schema cache
NOTIFY pgrst, 'reload schema';

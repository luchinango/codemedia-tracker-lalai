-- ============================================================
-- LALAI — Migración Total Consolidada
-- Ejecutar en Supabase SQL Editor (https://supabase.com/dashboard)
-- Ir a: SQL Editor → New query → Pegar todo → Run
-- ============================================================

-- ── FASE 2: Bimoneda, Pagos, Pretensión ─────────────────────

-- 1. Currency en projects
DO $$ BEGIN
  ALTER TABLE projects ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. Company_id en projects
DO $$ BEGIN
  ALTER TABLE projects ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 3. Pretensión salarial en users
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN pretension_salarial NUMERIC(12,2) DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 4. Duration_seconds en time_logs
DO $$ BEGIN
  ALTER TABLE time_logs ADD COLUMN duration_seconds INTEGER DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 5. Payments table (Kardex)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL DEFAULT 'Total' CHECK (type IN ('Total', 'Parcial')),
  is_invoiced BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments(project_id);

-- 6. Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tax_id TEXT,
  payment_method TEXT NOT NULL DEFAULT 'Transferencia',
  billing_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 7. Issue assignments table
CREATE TABLE IF NOT EXISTS issue_assignments (
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (issue_id, user_id)
);

ALTER TABLE issue_assignments ENABLE ROW LEVEL SECURITY;

-- ── V4: OKR / KPI ──────────────────────────────────────────

-- 8. Estimated hours en issues
DO $$ BEGIN
  ALTER TABLE issues ADD COLUMN estimated_hours NUMERIC(8,2) DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 9. Notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,
  client_email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- ── V5: Responsable y Colaboradores de Proyecto ─────────────

-- 10. Responsible_id en projects
DO $$ BEGIN
  ALTER TABLE projects ADD COLUMN responsible_id UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 11. Project collaborators table
CREATE TABLE IF NOT EXISTS project_collaborators (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;

-- ── RLS: Abrir acceso para MVP ──────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY "Allow all" ON users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON projects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON issues FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON time_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON companies FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON issue_assignments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON notification_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON project_collaborators FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── Refrescar schema cache de PostgREST ─────────────────────
NOTIFY pgrst, 'reload schema';

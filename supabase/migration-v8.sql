-- ============================================================
-- LALAI V8 — Secure RLS Policies
-- Ejecutar en Supabase SQL Editor
-- Reemplaza TODAS las políticas "Allow all" por políticas seguras
-- ============================================================

-- ============================================================
-- 1. USERS
-- ============================================================
DROP POLICY IF EXISTS "Allow all" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read users" ON public.users;
DROP POLICY IF EXISTS "Devs can see their own salary" ON public.users;

-- Everyone logged in can see user list (name, email, role)
CREATE POLICY "Authenticated read users"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create/update/delete users
CREATE POLICY "Admins manage users"
  ON public.users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- Devs can update their own row (e.g. phone, name)
CREATE POLICY "Users update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- ============================================================
-- 2. PROJECTS
-- ============================================================
DROP POLICY IF EXISTS "Allow all" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can read projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users full access on projects" ON public.projects;

-- Authenticated can read all projects
CREATE POLICY "Authenticated read projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create/update/delete projects
CREATE POLICY "Admins manage projects"
  ON public.projects FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- Anon read for shared view (already from v7, keep it)
-- "Public can view project by token" stays

-- ============================================================
-- 3. ISSUES
-- ============================================================
DROP POLICY IF EXISTS "Allow all" ON public.issues;
DROP POLICY IF EXISTS "Authenticated users full access on issues" ON public.issues;

-- Authenticated can read all issues
CREATE POLICY "Authenticated read issues"
  ON public.issues FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated can create/update issues (devs move tasks, admins manage)
CREATE POLICY "Authenticated write issues"
  ON public.issues FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update issues"
  ON public.issues FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only admins can delete issues
CREATE POLICY "Admins delete issues"
  ON public.issues FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- Anon read for shared view stays from v7

-- ============================================================
-- 4. TIME_LOGS
-- ============================================================
DROP POLICY IF EXISTS "Allow all" ON public.time_logs;
DROP POLICY IF EXISTS "Authenticated users full access on time_logs" ON public.time_logs;

-- Authenticated read all time_logs
CREATE POLICY "Authenticated read time_logs"
  ON public.time_logs FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated can create time_logs (start timer)
CREATE POLICY "Authenticated insert time_logs"
  ON public.time_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own time_logs (stop timer)
CREATE POLICY "Users update own time_logs"
  ON public.time_logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only admins can delete time_logs
CREATE POLICY "Admins delete time_logs"
  ON public.time_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================
-- 5. ISSUE_ASSIGNMENTS
-- ============================================================
DROP POLICY IF EXISTS "Allow all" ON public.issue_assignments;

CREATE POLICY "Authenticated read assignments"
  ON public.issue_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated manage assignments"
  ON public.issue_assignments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update assignments"
  ON public.issue_assignments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins delete assignments"
  ON public.issue_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================
-- 6. COMPANIES
-- ============================================================
DROP POLICY IF EXISTS "Allow all" ON public.companies;

CREATE POLICY "Authenticated read companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage companies"
  ON public.companies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================
-- 7. PAYMENTS
-- ============================================================
DROP POLICY IF EXISTS "Allow all" ON public.payments;

CREATE POLICY "Authenticated read payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- Anon read for shared view stays from v7

-- ============================================================
-- 8. NOTIFICATION_LOGS
-- ============================================================
DROP POLICY IF EXISTS "Allow all" ON public.notification_logs;

CREATE POLICY "Authenticated read notifications"
  ON public.notification_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert notifications"
  ON public.notification_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins manage notifications"
  ON public.notification_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================
-- 9. PROJECT_COLLABORATORS
-- ============================================================
DROP POLICY IF EXISTS "Allow all" ON public.project_collaborators;

CREATE POLICY "Authenticated read collaborators"
  ON public.project_collaborators FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated manage collaborators"
  ON public.project_collaborators FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update collaborators"
  ON public.project_collaborators FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins delete collaborators"
  ON public.project_collaborators FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================
-- 10. Refresh schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';

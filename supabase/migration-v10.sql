-- Migration V10: Timestamps, issue codes, and project code format
-- issues.completed_at: when a task moves to "done"
-- projects.completed_at: when a project is marked "completed"
-- issues.issue_code: correlative code like TXA001

ALTER TABLE issues ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS issue_code VARCHAR(10);

-- Extend project_code from VARCHAR(5) to VARCHAR(6) for 3-letter + 3-number format
ALTER TABLE projects ALTER COLUMN project_code TYPE VARCHAR(6);

-- Backfill: for existing completed issues, set completed_at = created_at (approximate)
UPDATE issues SET completed_at = created_at WHERE status = 'done' AND completed_at IS NULL;

-- Backfill: for existing completed projects, set completed_at = created_at (approximate)
UPDATE projects SET completed_at = created_at WHERE status = 'completed' AND completed_at IS NULL;

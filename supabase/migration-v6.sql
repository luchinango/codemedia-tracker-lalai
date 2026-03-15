-- Migration V6: Company notification_email + project completion
-- Run this after migration-v5.sql

-- Add notification_email to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS notification_email text;

-- Ensure projects.status allows 'completed' value
-- (status is text, so no enum change needed, just documenting)
-- Valid values: 'active', 'completed'

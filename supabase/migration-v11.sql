-- Migration V11: Billing type for projects (hourly vs fixed)
-- billing_type: 'hourly' or 'fixed' (default: 'fixed')

ALTER TABLE projects ADD COLUMN IF NOT EXISTS billing_type VARCHAR(10) DEFAULT 'fixed';

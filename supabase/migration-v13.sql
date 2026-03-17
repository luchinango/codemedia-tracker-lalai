-- Migration V13: Bolsa de horas (hour packages) support
-- package_hours: total prepaid hours for the project (used when billing_type = 'hour_package')

ALTER TABLE projects ADD COLUMN IF NOT EXISTS package_hours NUMERIC DEFAULT 0;

-- Update billing_type constraint to allow 'hour_package'
-- (VARCHAR(20) to accommodate longer values)
ALTER TABLE projects ALTER COLUMN billing_type TYPE VARCHAR(20);

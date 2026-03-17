-- V9: Company form improvements + sidebar projects
-- Add contact person + phone + email to companies

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone  TEXT,
  ADD COLUMN IF NOT EXISTS contact_email  TEXT;

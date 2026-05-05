-- Add company name to participants
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS company TEXT;

CREATE INDEX IF NOT EXISTS idx_participants_company ON participants(company);
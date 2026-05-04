-- Add imported_by_user_id to participants table to track which admin user imported each participant
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS imported_by_user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_participants_imported_by_user_id ON participants(imported_by_user_id);

-- Modify participants table to add event-related and email queue fields

-- Add event_id column (nullable for now, will be made NOT NULL after backfill)
ALTER TABLE participants ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- Add source column to track where the participant came from
ALTER TABLE participants ADD COLUMN source TEXT NOT NULL DEFAULT 'csv';

-- Add external_submission_id for Google Forms integration
ALTER TABLE participants ADD COLUMN external_submission_id TEXT;

-- Add email status tracking for invitation queue
ALTER TABLE participants ADD COLUMN email_status TEXT NOT NULL DEFAULT 'not_queued' 
  CHECK (email_status IN ('not_queued', 'queued', 'sent', 'failed'));

-- Add email timing and error tracking
ALTER TABLE participants ADD COLUMN email_sent_at TIMESTAMPTZ;
ALTER TABLE participants ADD COLUMN email_error TEXT;

-- Remove the old UNIQUE constraint on corporate_email if it exists
ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_corporate_email_key;

-- Add unique constraint for Google Forms: event_id + external_submission_id when external_submission_id is not null
-- (partial unique index)
CREATE UNIQUE INDEX idx_participants_event_submission 
  ON participants(event_id, external_submission_id) 
  WHERE external_submission_id IS NOT NULL;

-- Create indexes for common queries
CREATE INDEX idx_participants_event_id ON participants(event_id);
CREATE INDEX idx_participants_source ON participants(source);
CREATE INDEX idx_participants_email_status ON participants(email_status);
CREATE INDEX idx_participants_email_sent_at ON participants(email_sent_at);

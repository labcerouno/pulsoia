-- Email queue for controlled invitation sending
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  send_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_send_after ON email_queue(send_after);
CREATE INDEX idx_email_queue_event_id ON email_queue(event_id);
CREATE INDEX idx_email_queue_participant_id ON email_queue(participant_id);

-- Track daily quota usage for provider free tier limits
CREATE TABLE email_daily_usage (
  quota_date DATE PRIMARY KEY,
  sent_count INTEGER NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER email_daily_usage_updated_at
  BEFORE UPDATE ON email_daily_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
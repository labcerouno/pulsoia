CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  corporate_email TEXT NOT NULL UNIQUE,
  area TEXT,
  management_unit TEXT,
  role TEXT,
  access_token TEXT NOT NULL UNIQUE,
  token_status TEXT NOT NULL DEFAULT 'unused' CHECK (token_status IN ('unused', 'used', 'expired')),
  invited_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id),
  session_status TEXT NOT NULL DEFAULT 'started' CHECK (session_status IN ('started', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id),
  session_id UUID NOT NULL REFERENCES sessions(id),
  q1_usage BOOLEAN,
  q1_tools_used TEXT,
  q2_integration TEXT,
  q3_use_cases TEXT[],
  q3_use_cases_other TEXT,
  q4_success_case_raw TEXT,
  q4_followup_raw TEXT,
  q5_barrier TEXT,
  q5_barrier_other TEXT,
  q6_opportunity_raw TEXT,
  q6_followup_raw TEXT,
  ai_summary TEXT,
  ai_tags TEXT[],
  barrier_tags TEXT[],
  opportunity_tags TEXT[],
  has_success_case BOOLEAN DEFAULT FALSE,
  success_case_summary TEXT,
  strength_summary TEXT,
  next_step_recommendation TEXT,
  score_usage SMALLINT,
  score_integration SMALLINT,
  score_value_signal SMALLINT,
  score_opportunity_clarity SMALLINT,
  score_total SMALLINT,
  profile_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_participants_access_token ON participants(access_token);
CREATE INDEX idx_participants_token_status ON participants(token_status);
CREATE INDEX idx_responses_participant_id ON responses(participant_id);
CREATE INDEX idx_sessions_participant_id ON sessions(participant_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER participants_updated_at BEFORE UPDATE ON participants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER responses_updated_at BEFORE UPDATE ON responses FOR EACH ROW EXECUTE FUNCTION update_updated_at();

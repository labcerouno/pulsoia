-- Add action plan columns to responses table
-- These store the computed texts shown in the result screen and PDF

ALTER TABLE responses
  ADD COLUMN IF NOT EXISTS action_plan_intro  TEXT,
  ADD COLUMN IF NOT EXISTS action_plan_prompt TEXT,
  ADD COLUMN IF NOT EXISTS result_headline    TEXT,
  ADD COLUMN IF NOT EXISTS result_congrats    TEXT;

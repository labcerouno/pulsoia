export type TokenStatus = 'unused' | 'used' | 'expired'
export type SessionStatus = 'started' | 'completed' | 'abandoned'

export type ProfileLabel =
  | 'OBSERVADOR'
  | 'EXPLORADOR'
  | 'USUARIO ACTIVO'
  | 'MULTIPLICADOR'
  | 'REFERENTE'

export interface Participant {
  id: string
  full_name: string
  corporate_email: string
  area: string | null
  management_unit: string | null
  role: string | null
  access_token: string
  token_status: TokenStatus
  invited_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  participant_id: string
  session_status: SessionStatus
  started_at: string
  last_activity_at: string
  completed_at: string | null
  created_at: string
}

export interface Response {
  id: string
  participant_id: string
  session_id: string
  q1_usage: boolean | null
  q1_tools_used: string | null
  q2_integration: string | null
  q3_use_cases: string[] | null
  q3_use_cases_other: string | null
  q4_success_case_raw: string | null
  q4_followup_raw: string | null
  q5_barrier: string | null
  q5_barrier_other: string | null
  q6_opportunity_raw: string | null
  q6_followup_raw: string | null
  ai_summary: string | null
  ai_tags: string[] | null
  barrier_tags: string[] | null
  opportunity_tags: string[] | null
  has_success_case: boolean
  success_case_summary: string | null
  strength_summary: string | null
  next_step_recommendation: string | null
  action_plan_intro: string | null
  action_plan_prompt: string | null
  result_headline: string | null
  result_congrats: string | null
  score_usage: number | null
  score_integration: number | null
  score_value_signal: number | null
  score_opportunity_clarity: number | null
  score_total: number | null
  profile_label: ProfileLabel | null
  created_at: string
  updated_at: string
}

export interface ParticipantWithResponse extends Participant {
  response?: Response
}

# Modelo de datos

Implementar en Supabase (Postgres). Crear migraciones SQL reales.

---

## Tabla: `participants`

```sql
CREATE TABLE participants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name         TEXT NOT NULL,
  corporate_email   TEXT NOT NULL UNIQUE,
  area              TEXT,
  management_unit   TEXT,
  role              TEXT,
  access_token      TEXT NOT NULL UNIQUE,
  token_status      TEXT NOT NULL DEFAULT 'unused', -- 'unused' | 'used' | 'expired'
  invited_at        TIMESTAMPTZ,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Tabla: `sessions`

```sql
CREATE TABLE sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id    UUID NOT NULL REFERENCES participants(id),
  session_status    TEXT NOT NULL DEFAULT 'started', -- 'started' | 'completed' | 'abandoned'
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Tabla: `responses`

```sql
CREATE TABLE responses (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id              UUID NOT NULL REFERENCES participants(id),
  session_id                  UUID NOT NULL REFERENCES sessions(id),

  -- Respuestas crudas
  q1_usage                    BOOLEAN,                -- true = sí usó IA
  q1_tools_used               TEXT,                   -- cuáles herramientas (texto libre)
  q2_integration              TEXT,                   -- opción elegida de P2
  q3_use_cases                TEXT[],                 -- array de opciones de P3
  q3_use_cases_other          TEXT,                   -- campo "Otro" de P3
  q4_success_case_raw         TEXT,                   -- respuesta abierta P4
  q4_followup_raw             TEXT,                   -- repregunta opcional P4
  q5_barrier                  TEXT,                   -- opción elegida de P5
  q5_barrier_other            TEXT,                   -- campo "Otra" de P5
  q6_opportunity_raw          TEXT,                   -- respuesta abierta P6
  q6_followup_raw             TEXT,                   -- repregunta opcional P6

  -- Enriquecimiento IA
  ai_summary                  TEXT,
  ai_tags                     TEXT[],
  barrier_tags                TEXT[],
  opportunity_tags            TEXT[],
  has_success_case            BOOLEAN DEFAULT FALSE,
  success_case_summary        TEXT,
  strength_summary            TEXT,
  next_step_recommendation    TEXT,

  -- Scoring
  score_usage                 SMALLINT,               -- 0 a 3
  score_integration           SMALLINT,               -- 0 a 3
  score_value_signal          SMALLINT,               -- 0 a 3
  score_opportunity_clarity   SMALLINT,               -- 0 a 3
  score_total                 SMALLINT,               -- 0 a 12
  profile_label               TEXT,                   -- OBSERVADOR | EXPLORADOR | USUARIO ACTIVO | MULTIPLICADOR | REFERENTE

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Índices recomendados

```sql
CREATE INDEX idx_participants_access_token ON participants(access_token);
CREATE INDEX idx_participants_token_status ON participants(token_status);
CREATE INDEX idx_responses_participant_id ON responses(participant_id);
CREATE INDEX idx_sessions_participant_id ON sessions(participant_id);
```

---

## Notas
- `token_status` usa check constraint o enum: solo acepta 'unused', 'used', 'expired'
- `q3_use_cases` es array de TEXT (las opciones seleccionadas en P3)
- Los campos de IA pueden ser NULL si la llamada falla (usar fallbacks en app)
- `updated_at` debe actualizarse automáticamente (trigger o manejo en app)

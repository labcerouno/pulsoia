-- Backfill: Create legacy event and assign all existing participants to it

-- Create a legacy event for all existing CSV imports
INSERT INTO events (id, name, slug, description, status, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  'Importación Legada',
  'legacy-import',
  'Evento generado automáticamente para participantes importados antes de la integración con Google Forms',
  'active',
  now(),
  now()
);

-- Assign all existing participants to the legacy event
UPDATE participants 
SET event_id = '00000000-0000-0000-0000-000000000001'::UUID,
    source = 'csv'
WHERE event_id IS NULL;

-- Make event_id NOT NULL (all participants now have a value)
ALTER TABLE participants ALTER COLUMN event_id SET NOT NULL;

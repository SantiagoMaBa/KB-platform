-- ============================================================
-- KB Platform — Migración 006: Esquema admin completo (idempotente)
-- ============================================================

-- 1. Extender tabla clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS industry      TEXT,
  ADD COLUMN IF NOT EXISTS contact_name  TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS status        TEXT NOT NULL DEFAULT 'setup';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_status_check'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_status_check
      CHECK (status IN ('setup','active','paused','inactive'));
  END IF;
END
$$;

-- 2. Extender sync_sources: permitir múltiples fuentes del mismo tipo,
--    agregar campo name, soportar tipo 'upload'
ALTER TABLE public.sync_sources
  ADD COLUMN IF NOT EXISTS name TEXT;

-- Actualizar el check de source_type para soportar 'upload'
ALTER TABLE public.sync_sources
  DROP CONSTRAINT IF EXISTS sync_sources_source_type_check;
ALTER TABLE public.sync_sources
  ADD CONSTRAINT sync_sources_source_type_check
    CHECK (source_type IN ('gdrive','onedrive','upload'));

-- Eliminar unique constraint que limitaba a una fuente por tipo
ALTER TABLE public.sync_sources
  DROP CONSTRAINT IF EXISTS sync_sources_client_id_source_type_key;

-- 3. Tabla: metric_definitions
CREATE TABLE IF NOT EXISTS public.metric_definitions (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id       TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  calc_type       TEXT NOT NULL DEFAULT 'manual'
                    CHECK (calc_type IN ('manual','ai_query','sql')),
  calc_config     JSONB,
  -- Formato de visualización
  display_format  TEXT NOT NULL DEFAULT 'number'
                    CHECK (display_format IN ('number','currency_mxn','percentage','text','decimal')),
  display_prefix  TEXT,
  display_suffix  TEXT,
  -- Alertas
  alert_enabled   BOOLEAN NOT NULL DEFAULT false,
  alert_threshold NUMERIC,
  alert_direction TEXT CHECK (alert_direction IN ('above','below')),
  -- Dashboard
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_visible      BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS metric_definitions_client_id_idx
  ON public.metric_definitions(client_id);

ALTER TABLE public.metric_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON public.metric_definitions;
CREATE POLICY "Allow all for anon" ON public.metric_definitions
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Tabla: metric_results
CREATE TABLE IF NOT EXISTS public.metric_results (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  metric_id     TEXT NOT NULL REFERENCES public.metric_definitions(id) ON DELETE CASCADE,
  client_id     TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  value_numeric NUMERIC,
  value_text    TEXT,
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  period        TEXT
);

CREATE INDEX IF NOT EXISTS metric_results_metric_id_idx
  ON public.metric_results(metric_id);
CREATE INDEX IF NOT EXISTS metric_results_client_id_idx
  ON public.metric_results(client_id);
CREATE INDEX IF NOT EXISTS metric_results_computed_at_idx
  ON public.metric_results(computed_at DESC);

ALTER TABLE public.metric_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON public.metric_results;
CREATE POLICY "Allow all for anon" ON public.metric_results
  FOR ALL USING (true) WITH CHECK (true);

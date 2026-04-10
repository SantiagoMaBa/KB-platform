-- ============================================================
-- KB Platform — Migración 002: Fuentes de sincronización externas (idempotente)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sync_sources (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id       TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source_type     TEXT NOT NULL CHECK (source_type IN ('gdrive', 'onedrive')),
  shared_link     TEXT NOT NULL,
  folder_name     TEXT,
  last_sync_at    TIMESTAMPTZ,
  last_sync_count INTEGER NOT NULL DEFAULT 0,
  last_sync_error TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (client_id, source_type)
);

CREATE INDEX IF NOT EXISTS sync_sources_client_id_idx ON public.sync_sources(client_id);

ALTER TABLE public.sync_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON public.sync_sources;
CREATE POLICY "Allow all for anon" ON public.sync_sources
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- KB Platform — Migración 005: Caché de insights generados por IA (idempotente)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.insights (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id     TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  insights_json JSONB NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,

  UNIQUE (client_id)
);

CREATE INDEX IF NOT EXISTS insights_client_id_idx ON public.insights(client_id);
CREATE INDEX IF NOT EXISTS insights_expires_at_idx ON public.insights(expires_at);

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON public.insights;
CREATE POLICY "Allow all for anon" ON public.insights
  FOR ALL USING (true) WITH CHECK (true);

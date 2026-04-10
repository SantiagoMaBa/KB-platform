-- ============================================================
-- KB Platform — Migración inicial (idempotente)
-- ============================================================

-- 1. Tabla: clients
CREATE TABLE IF NOT EXISTS public.clients (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabla: documents
CREATE TABLE IF NOT EXISTS public.documents (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id     TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  compiled      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabla: chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id   TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS documents_client_id_idx     ON public.documents(client_id);
CREATE INDEX IF NOT EXISTS chat_messages_client_id_idx ON public.chat_messages(client_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON public.chat_messages(created_at);

-- 5. Row Level Security
--    ENABLE ROW LEVEL SECURITY es idempotente en PostgreSQL.
ALTER TABLE public.clients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON public.clients;
CREATE POLICY "Allow all for anon" ON public.clients
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON public.documents;
CREATE POLICY "Allow all for anon" ON public.documents
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON public.chat_messages;
CREATE POLICY "Allow all for anon" ON public.chat_messages
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Storage bucket: kb-clients
INSERT INTO storage.buckets (id, name, public)
VALUES ('kb-clients', 'kb-clients', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow all for anon" ON storage.objects;
CREATE POLICY "Allow all for anon" ON storage.objects
  FOR ALL USING (bucket_id = 'kb-clients') WITH CHECK (bucket_id = 'kb-clients');

-- 7. Datos semilla — cliente demo
INSERT INTO public.clients (id, name, slug)
VALUES ('plaza-demo', 'Plaza Centro Norte', 'plaza-centro-norte')
ON CONFLICT (id) DO NOTHING;

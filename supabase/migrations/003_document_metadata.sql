-- ============================================================
-- KB Platform — Migración 003: Metadata de documentos
-- ============================================================

-- 1. Agregar columnas de metadata a documents
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS description  TEXT,
  ADD COLUMN IF NOT EXISTS category     TEXT
    CONSTRAINT documents_category_check
    CHECK (category IN ('Contratos','Pagos','Reglamentos','Tarifas','Permisos','Operaciones','Otro')),
  ADD COLUMN IF NOT EXISTS tags         TEXT; -- valores separados por coma

-- 2. Agregar restricción UNIQUE (client_id, filename) que faltaba
--    (necesaria para que el ON CONFLICT del upsert funcione correctamente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'documents_client_id_filename_key'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_client_id_filename_key
      UNIQUE (client_id, filename);
  END IF;
END
$$;

-- 3. Índice para búsquedas por categoría
CREATE INDEX IF NOT EXISTS documents_category_idx
  ON public.documents(client_id, category);

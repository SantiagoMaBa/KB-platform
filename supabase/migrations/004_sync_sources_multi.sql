-- ============================================================
-- KB Platform — Migración 004: Soporte múltiples fuentes + descripción (idempotente)
-- ============================================================

-- Eliminar constraint de unicidad para permitir N fuentes por tipo
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sync_sources_client_id_source_type_key'
      AND conrelid = 'public.sync_sources'::regclass
  ) THEN
    ALTER TABLE public.sync_sources DROP CONSTRAINT sync_sources_client_id_source_type_key;
  END IF;
END $$;

-- Agregar campo description si no existe
ALTER TABLE public.sync_sources
  ADD COLUMN IF NOT EXISTS description TEXT;

-- ── 007_sync_auto_datasets.sql ───────────────────────────────────────────────
-- 1. auto_sync support on sync_sources
-- 2. structured_datasets table for SQL metrics (Excel/CSV parsed data)

-- ── sync_sources: auto-sync fields ──────────────────────────────────────────
ALTER TABLE sync_sources
  ADD COLUMN IF NOT EXISTS auto_sync           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sync_interval_hours int     NOT NULL DEFAULT 24;

-- ── structured_datasets ──────────────────────────────────────────────────────
-- Stores parsed tabular data from Excel/CSV files for use in SQL-type metrics.
-- Each sheet from an Excel file is stored as a separate row.
CREATE TABLE IF NOT EXISTS structured_datasets (
  id           uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id    text         NOT NULL,
  filename     text         NOT NULL,               -- original filename (e.g. ventas.xlsx)
  sheet_name   text         NOT NULL DEFAULT 'Sheet1',
  display_name text,                                -- human-readable label shown in UI
  headers      jsonb        NOT NULL DEFAULT '[]',  -- ["Mes", "Ventas", "Margen"]
  rows         jsonb        NOT NULL DEFAULT '[]',  -- [{"Mes": "Enero", "Ventas": 134000}, ...]
  row_count    int          NOT NULL DEFAULT 0,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now(),
  UNIQUE(client_id, filename, sheet_name)
);

ALTER TABLE structured_datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON structured_datasets
  FOR ALL TO anon USING (true) WITH CHECK (true);

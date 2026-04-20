import { createClient } from "@supabase/supabase-js";

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Types ─────────────────────────────────────────────────────────────────────

export type ClientStatus = "setup" | "active" | "paused" | "inactive";
export type CalcType     = "manual" | "ai_query" | "sql";
export type DisplayFormat = "number" | "decimal" | "currency_mxn" | "percentage" | "text";
export type AlertDirection = "above" | "below";
export type SourceType = "gdrive" | "onedrive" | "upload";

export interface ClientRow {
  id:            string;
  name:          string;
  slug:          string;
  industry:      string | null;
  contact_name:  string | null;
  contact_email: string | null;
  status:        ClientStatus;
  created_at:    string;
}

export interface MetricDefinition {
  id:              string;
  client_id:       string;
  name:            string;
  description:     string | null;
  calc_type:       CalcType;
  calc_config:     Record<string, unknown> | null;
  display_format:  DisplayFormat;
  display_prefix:  string | null;
  display_suffix:  string | null;
  alert_enabled:   boolean;
  alert_threshold: number | null;
  alert_direction: AlertDirection | null;
  sort_order:      number;
  is_visible:      boolean;
  created_at:      string;
  updated_at:      string;
}

export interface MetricResult {
  id:            string;
  metric_id:     string;
  client_id:     string;
  value_numeric: number | null;
  value_text:    string | null;
  computed_at:   string;
  period:        string | null;
}

export interface MetricWithResult extends MetricDefinition {
  latest_result?: MetricResult | null;
}

export interface StructuredDataset {
  id:           string;
  client_id:    string;
  filename:     string;
  sheet_name:   string;
  display_name: string | null;
  headers:      string[];
  row_count:    number;
  created_at:   string;
  updated_at:   string;
}

export type Database = {
  public: {
    Tables: {
      clients: {
        Row:    ClientRow;
        Insert: Omit<ClientRow, "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Omit<ClientRow, "id" | "created_at">>;
      };
      documents: {
        Row: {
          id:           string;
          client_id:    string;
          filename:     string;
          storage_path: string;
          compiled:     boolean;
          display_name: string | null;
          description:  string | null;
          category:     string | null;
          tags:         string | null;
          created_at:   string;
        };
        Insert: {
          id?:          string;
          client_id:    string;
          filename:     string;
          storage_path: string;
          compiled?:    boolean;
          display_name?: string | null;
          description?:  string | null;
          category?:     string | null;
          tags?:         string | null;
          created_at?:   string;
        };
        Update: {
          id?:          string;
          client_id?:   string;
          filename?:    string;
          storage_path?: string;
          compiled?:    boolean;
          display_name?: string | null;
          description?:  string | null;
          category?:     string | null;
          tags?:         string | null;
          created_at?:   string;
        };
      };
      chat_messages: {
        Row: {
          id:         string;
          client_id:  string;
          role:       "user" | "assistant";
          content:    string;
          created_at: string;
        };
        Insert: {
          id?:        string;
          client_id:  string;
          role:       "user" | "assistant";
          content:    string;
          created_at?: string;
        };
        Update: {
          id?:         string;
          client_id?:  string;
          role?:       "user" | "assistant";
          content?:    string;
          created_at?: string;
        };
      };
      sync_sources: {
        Row: {
          id:                   string;
          client_id:            string;
          name:                 string | null;
          source_type:          SourceType;
          shared_link:          string;
          folder_name:          string | null;
          description:          string | null;
          last_sync_at:         string | null;
          last_sync_count:      number;
          last_sync_error:      string | null;
          auto_sync:            boolean;
          sync_interval_hours:  number;
          created_at:           string;
        };
      };
      structured_datasets: {
        Row:    StructuredDataset & { rows: Record<string, unknown>[] };
        Insert: Omit<StructuredDataset, "id" | "created_at" | "updated_at"> & {
          rows: Record<string, unknown>[];
          id?: string;
        };
        Update: Partial<Omit<StructuredDataset, "id" | "client_id" | "created_at"> & {
          rows?: Record<string, unknown>[];
        }>;
      };
      metric_definitions: {
        Row:    MetricDefinition;
        Insert: Omit<MetricDefinition, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<MetricDefinition, "id" | "client_id" | "created_at">>;
      };
      metric_results: {
        Row:    MetricResult;
        Insert: Omit<MetricResult, "id"> & { id?: string };
        Update: Partial<Omit<MetricResult, "id" | "metric_id" | "client_id">>;
      };
    };
  };
};

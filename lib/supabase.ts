import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          client_id: string;
          filename: string;
          storage_path: string;
          compiled: boolean;
          display_name: string | null;
          description: string | null;
          category: string | null;
          tags: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          filename: string;
          storage_path: string;
          compiled?: boolean;
          display_name?: string | null;
          description?: string | null;
          category?: string | null;
          tags?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          filename?: string;
          storage_path?: string;
          compiled?: boolean;
          display_name?: string | null;
          description?: string | null;
          category?: string | null;
          tags?: string | null;
          created_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          client_id: string;
          role: "user" | "assistant";
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          role: "user" | "assistant";
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          role?: "user" | "assistant";
          content?: string;
          created_at?: string;
        };
      };
    };
  };
};

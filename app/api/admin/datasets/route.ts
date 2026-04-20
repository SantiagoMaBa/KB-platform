import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/admin/datasets?clientId=xxx
 * Returns all structured_datasets for a client (headers included, rows excluded for performance).
 * Used by MetricasTab to populate the dataset/column selectors for SQL-type metrics.
 */
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId requerido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("structured_datasets")
    .select("id, client_id, filename, sheet_name, display_name, headers, row_count, created_at, updated_at")
    .eq("client_id", clientId)
    .order("filename")
    .order("sheet_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/**
 * DELETE /api/admin/datasets?id=xxx
 * Removes a structured dataset (e.g. when the source document is deleted).
 */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const { error } = await supabase
    .from("structured_datasets")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/sync/sources?clientId=xxx
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId requerido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sync_sources")
    .select("*")
    .eq("client_id", clientId)
    .order("source_type");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/sync/sources — upsert a source
export async function POST(req: NextRequest) {
  const { clientId, sourceType, sharedLink } = await req.json();

  if (!clientId || !sourceType || !sharedLink) {
    return NextResponse.json(
      { error: "clientId, sourceType y sharedLink son requeridos" },
      { status: 400 }
    );
  }

  if (!["gdrive", "onedrive"].includes(sourceType)) {
    return NextResponse.json({ error: "sourceType inválido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sync_sources")
    .upsert(
      { client_id: clientId, source_type: sourceType, shared_link: sharedLink },
      { onConflict: "client_id,source_type" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/sync/sources?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const { error } = await supabase
    .from("sync_sources")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

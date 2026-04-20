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
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/sync/sources — crear nueva fuente
export async function POST(req: NextRequest) {
  const { clientId, sourceType, sharedLink, description } = await req.json();

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
    .insert({
      client_id: clientId,
      source_type: sourceType,
      shared_link: sharedLink,
      description: description ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/sync/sources — actualizar campos de una fuente
export async function PATCH(req: NextRequest) {
  const { id, sharedLink, description, name, autoSync, syncIntervalHours } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const patch: Record<string, string | number | boolean | null> = {};
  if (sharedLink          !== undefined) patch.shared_link          = sharedLink;
  if (description         !== undefined) patch.description          = description;
  if (name                !== undefined) patch.name                 = name;
  if (autoSync            !== undefined) patch.auto_sync            = autoSync;
  if (syncIntervalHours   !== undefined) patch.sync_interval_hours  = syncIntervalHours;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sync_sources")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
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

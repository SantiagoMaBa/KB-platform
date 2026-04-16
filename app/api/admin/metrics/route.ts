import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/admin/metrics?clientId=xxx  → lista métricas con último resultado
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId requerido" }, { status: 400 });

  const { data: defs, error } = await supabase
    .from("metric_definitions")
    .select("*")
    .eq("client_id", clientId)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Para cada métrica, obtener el resultado más reciente
  const metricsWithResults = await Promise.all(
    (defs ?? []).map(async (metric) => {
      const { data: results } = await supabase
        .from("metric_results")
        .select("*")
        .eq("metric_id", metric.id)
        .order("computed_at", { ascending: false })
        .limit(1);

      return { ...metric, latest_result: results?.[0] ?? null };
    })
  );

  return NextResponse.json(metricsWithResults);
}

// POST /api/admin/metrics  → crear métrica
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    client_id, name, description, calc_type, calc_config,
    display_format, display_prefix, display_suffix,
    alert_enabled, alert_threshold, alert_direction,
    sort_order, is_visible,
  } = body;

  if (!client_id || !name) {
    return NextResponse.json({ error: "client_id y name son requeridos" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("metric_definitions")
    .insert([{
      client_id, name, description,
      calc_type: calc_type ?? "manual",
      calc_config: calc_config ?? null,
      display_format: display_format ?? "number",
      display_prefix: display_prefix ?? null,
      display_suffix: display_suffix ?? null,
      alert_enabled: alert_enabled ?? false,
      alert_threshold: alert_threshold ?? null,
      alert_direction: alert_direction ?? null,
      sort_order: sort_order ?? 0,
      is_visible: is_visible ?? true,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PUT /api/admin/metrics  → actualizar métrica
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const allowed = [
    "name","description","calc_type","calc_config",
    "display_format","display_prefix","display_suffix",
    "alert_enabled","alert_threshold","alert_direction",
    "sort_order","is_visible",
  ];

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key];
  }

  const { data, error } = await supabase
    .from("metric_definitions")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/admin/metrics?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const { error } = await supabase.from("metric_definitions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

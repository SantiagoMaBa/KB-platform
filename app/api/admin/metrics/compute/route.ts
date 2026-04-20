import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { openai, MODEL } from "@/lib/openai";
import { buildKBContextWithIndex } from "@/lib/kb";

export const runtime    = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/admin/metrics/compute
 * Body: { clientId: string, metricId?: string }
 *
 * Calcula métricas de tipo "ai_query" y "sql".
 * Manual: no se calcula aquí (se guarda directo desde el form).
 * Guarda los resultados en metric_results.
 */

// ── SQL aggregation helpers ───────────────────────────────────────────────────

type Aggregation = "sum" | "avg" | "count" | "min" | "max" | "last";

interface SqlCalcConfig {
  dataset_id:    string;
  column:        string;
  aggregation:   Aggregation;
  filter_column?: string;
  filter_value?:  string;
}

function aggregate(values: number[], agg: Aggregation): number {
  if (values.length === 0) return 0;
  switch (agg) {
    case "sum":   return values.reduce((a, b) => a + b, 0);
    case "avg":   return values.reduce((a, b) => a + b, 0) / values.length;
    case "count": return values.length;
    case "min":   return Math.min(...values);
    case "max":   return Math.max(...values);
    case "last":  return values[values.length - 1];
  }
}

async function computeSqlMetric(
  config: SqlCalcConfig
): Promise<{ value: number; error?: string }> {
  // Fetch dataset rows from DB
  const { data: dataset, error } = await supabase
    .from("structured_datasets")
    .select("rows, headers")
    .eq("id", config.dataset_id)
    .single();

  if (error || !dataset) {
    return { value: 0, error: "Dataset no encontrado. ¿Fue eliminado?" };
  }

  let rows = dataset.rows as Record<string, unknown>[];

  // Apply optional equality filter
  if (config.filter_column && config.filter_value) {
    const filterVal = config.filter_value.toLowerCase().trim();
    rows = rows.filter((row) => {
      const cell = String(row[config.filter_column!] ?? "").toLowerCase().trim();
      return cell === filterVal || cell.includes(filterVal);
    });
  }

  // Extract numeric values from the target column
  const values: number[] = [];
  for (const row of rows) {
    const raw = row[config.column];
    if (raw === null || raw === undefined || raw === "") continue;
    const num = parseFloat(String(raw).replace(/[^0-9.\-]/g, ""));
    if (!isNaN(num)) values.push(num);
  }

  return { value: aggregate(values, config.aggregation) };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { clientId, metricId } = await req.json();

  if (!clientId) {
    return NextResponse.json({ error: "clientId requerido" }, { status: 400 });
  }

  // Fetch metrics to compute (ai_query + sql, not manual)
  let query = supabase
    .from("metric_definitions")
    .select("*")
    .eq("client_id", clientId)
    .in("calc_type", ["ai_query", "sql"]);

  if (metricId) {
    query = query.eq("id", metricId) as typeof query;
  }

  const { data: metrics, error: metricsError } = await query;
  if (metricsError) return NextResponse.json({ error: metricsError.message }, { status: 500 });
  if (!metrics || metrics.length === 0) return NextResponse.json({ computed: 0, results: [] });

  // Build KB context once (only needed for ai_query metrics)
  const hasAiQuery = metrics.some((m) => m.calc_type === "ai_query");
  let kbContext = "";
  if (hasAiQuery) {
    const { indexContent, wikiContent } = await buildKBContextWithIndex(clientId);
    kbContext = [indexContent, wikiContent].filter(Boolean).join("\n\n---\n\n");
  }

  const period  = new Date().toISOString().slice(0, 7); // "2026-04"
  const results: { metricId: string; name: string; value?: number | string; error?: string }[] = [];

  for (const metric of metrics) {
    const config = metric.calc_config as Record<string, unknown> | null;

    // ── SQL metric ──────────────────────────────────────────────────────────
    if (metric.calc_type === "sql") {
      if (!config?.dataset_id || !config?.column || !config?.aggregation) {
        results.push({ metricId: metric.id, name: metric.name, error: "Configuración SQL incompleta." });
        continue;
      }

      const { value, error: sqlErr } = await computeSqlMetric(config as unknown as SqlCalcConfig);
      if (sqlErr) {
        results.push({ metricId: metric.id, name: metric.name, error: sqlErr });
        continue;
      }

      await supabase.from("metric_results").insert([{
        metric_id:     metric.id,
        client_id:     clientId,
        value_numeric: value,
        value_text:    null,
        period,
        computed_at:   new Date().toISOString(),
      }]);

      results.push({ metricId: metric.id, name: metric.name, value });
      continue;
    }

    // ── AI Query metric ─────────────────────────────────────────────────────
    if (!kbContext) {
      results.push({ metricId: metric.id, name: metric.name, error: "Sin documentos compilados en la KB." });
      continue;
    }

    const prompt = (config as Record<string, string> | null)?.prompt;
    if (!prompt) {
      results.push({ metricId: metric.id, name: metric.name, error: "Sin prompt configurado." });
      continue;
    }

    try {
      const isTextFormat = metric.display_format === "text";

      const systemPrompt = isTextFormat
        ? `Eres un analista de negocio. Basándote SOLO en el contenido de la base de conocimiento, responde la siguiente pregunta de forma concisa (máximo 15 palabras). No inventes datos.`
        : `Eres un analista de negocio. Basándote SOLO en el contenido de la base de conocimiento, responde la siguiente pregunta con UN SOLO NÚMERO. No incluyas unidades, símbolos de moneda ni texto. Solo el número (puede ser entero o decimal). Si no puedes determinarlo, responde 0.`;

      const completion = await openai.chat.completions.create({
        model:       MODEL,
        temperature: 0.1,
        max_tokens:  100,
        messages: [
          { role: "system", content: `${systemPrompt}\n\nBase de conocimiento:\n${kbContext}` },
          { role: "user",   content: prompt },
        ],
      });

      const raw = (completion.choices[0]?.message?.content ?? "").trim();
      let valueNumeric: number | null = null;
      let valueText:    string | null = null;

      if (isTextFormat) {
        valueText = raw;
      } else {
        const parsed = parseFloat(raw.replace(/[^0-9.\-]/g, ""));
        valueNumeric = isNaN(parsed) ? 0 : parsed;
      }

      await supabase.from("metric_results").insert([{
        metric_id:     metric.id,
        client_id:     clientId,
        value_numeric: valueNumeric,
        value_text:    valueText,
        period,
        computed_at:   new Date().toISOString(),
      }]);

      results.push({ metricId: metric.id, name: metric.name, value: valueNumeric ?? valueText ?? 0 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      results.push({ metricId: metric.id, name: metric.name, error: msg });
    }
  }

  const computed = results.filter((r) => !r.error).length;
  return NextResponse.json({ computed, total: metrics.length, results });
}

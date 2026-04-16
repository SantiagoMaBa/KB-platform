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
 * Calcula todas las métricas de tipo "ai_query" (o solo una si se especifica metricId).
 * Guarda los resultados en metric_results.
 */
export async function POST(req: NextRequest) {
  const { clientId, metricId } = await req.json();

  if (!clientId) {
    return NextResponse.json({ error: "clientId requerido" }, { status: 400 });
  }

  // Obtener métricas a calcular
  let query = supabase
    .from("metric_definitions")
    .select("*")
    .eq("client_id", clientId)
    .eq("calc_type", "ai_query");

  if (metricId) {
    query = query.eq("id", metricId) as typeof query;
  }

  const { data: metrics, error: metricsError } = await query;

  if (metricsError) {
    return NextResponse.json({ error: metricsError.message }, { status: 500 });
  }

  if (!metrics || metrics.length === 0) {
    return NextResponse.json({ computed: 0, results: [] });
  }

  // Construir contexto de KB (una vez para todos)
  const { indexContent, wikiContent } = await buildKBContextWithIndex(clientId);
  const kbContext = [indexContent, wikiContent].filter(Boolean).join("\n\n---\n\n");

  if (!kbContext) {
    return NextResponse.json(
      { error: "No hay documentos compilados en la KB. Compila documentos primero." },
      { status: 400 }
    );
  }

  const period = new Date().toISOString().slice(0, 7); // e.g. "2026-04"
  const results: { metricId: string; name: string; value?: number | string; error?: string }[] = [];

  for (const metric of metrics) {
    const config = metric.calc_config as Record<string, string> | null;
    const prompt = config?.prompt;

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
          {
            role:    "system",
            content: `${systemPrompt}\n\nBase de conocimiento:\n${kbContext}`,
          },
          {
            role:    "user",
            content: prompt,
          },
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

      // Guardar resultado
      await supabase.from("metric_results").insert([{
        metric_id:     metric.id,
        client_id:     clientId,
        value_numeric: valueNumeric,
        value_text:    valueText,
        period,
        computed_at:   new Date().toISOString(),
      }]);

      results.push({
        metricId: metric.id,
        name:     metric.name,
        value:    valueNumeric ?? valueText ?? 0,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      results.push({ metricId: metric.id, name: metric.name, error: msg });
    }
  }

  const computed = results.filter((r) => !r.error).length;
  return NextResponse.json({ computed, total: metrics.length, results });
}

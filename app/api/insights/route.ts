import { NextRequest, NextResponse } from "next/server";
import { openai, MODEL } from "@/lib/openai";
import { buildKBContextWithIndex } from "@/lib/kb";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 30;

const TTL_HOURS = 6;

export interface Insight {
  type: "alerta" | "oportunidad" | "riesgo";
  priority: "alta" | "media" | "baja";
  title: string;
  description: string;
  action?: string;
}

const INSIGHTS_PROMPT = (clientName: string, context: string) => `
Eres un consultor de negocios analizando la base de conocimiento de "${clientName}".

Con base en los documentos disponibles, genera entre 3 y 5 insights proactivos y accionables.

Cada insight debe tener este formato JSON exacto:
{
  "type": "alerta" | "oportunidad" | "riesgo",
  "priority": "alta" | "media" | "baja",
  "title": "Título corto (máx 8 palabras)",
  "description": "Descripción concreta de 1-2 oraciones basada en datos reales del documento.",
  "action": "Acción recomendada específica y ejecutable (opcional, omitir si no aplica)"
}

Reglas:
- Basa TODOS los insights en datos concretos del contenido, no en generalidades.
- "alerta": situación urgente que requiere atención inmediata (vencimientos próximos, incumplimientos, riesgos operativos).
- "riesgo": situación que podría convertirse en problema si no se atiende (contratos por vencer, tendencias negativas).
- "oportunidad": situación favorable o acción que podría mejorar resultados (renovaciones anticipadas, espacios disponibles, eventos).
- Prioridad "alta": impacto financiero o operativo significativo, requiere acción en menos de 30 días.
- Prioridad "media": atención recomendada en 30-90 días.
- Prioridad "baja": acción recomendada a más de 90 días.
- Responde ÚNICAMENTE con un array JSON válido, sin texto adicional ni markdown.

Contenido de la KB:
${context}
`.trim();

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId requerido" }, { status: 400 });
  }

  const clientName = req.nextUrl.searchParams.get("clientName") ?? clientId;

  // ── Check cache ──────────────────────────────────────────────────────────────
  const { data: cached } = await supabase
    .from("insights")
    .select("insights_json, generated_at, expires_at")
    .eq("client_id", clientId)
    .single();

  if (cached && new Date(cached.expires_at) > new Date()) {
    return NextResponse.json({
      insights: cached.insights_json,
      generated_at: cached.generated_at,
      cached: true,
    });
  }

  // ── Build KB context ─────────────────────────────────────────────────────────
  const { indexContent, wikiContent } = await buildKBContextWithIndex(clientId);

  if (!indexContent && !wikiContent) {
    return NextResponse.json(
      { error: "No hay documentos compilados en la KB para generar insights." },
      { status: 404 }
    );
  }

  const context = [indexContent, wikiContent].filter(Boolean).join("\n\n---\n\n");

  // ── Call OpenAI ──────────────────────────────────────────────────────────────
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: INSIGHTS_PROMPT(clientName, context) }],
    temperature: 0.3,
    max_tokens: 1500,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "[]";

  let insights: Insight[];
  try {
    const parsed = JSON.parse(raw);
    // Handle both {"insights": [...]} and [...] responses
    insights = Array.isArray(parsed) ? parsed : (parsed.insights ?? []);
  } catch {
    return NextResponse.json(
      { error: "Error al parsear la respuesta de OpenAI.", raw },
      { status: 500 }
    );
  }

  // Validate and sanitize
  const validTypes = new Set(["alerta", "oportunidad", "riesgo"]);
  const validPriorities = new Set(["alta", "media", "baja"]);

  insights = insights
    .filter((i) => validTypes.has(i.type) && validPriorities.has(i.priority) && i.title && i.description)
    .slice(0, 5);

  if (insights.length === 0) {
    return NextResponse.json(
      { error: "OpenAI no devolvió insights válidos.", raw },
      { status: 500 }
    );
  }

  // ── Upsert cache ─────────────────────────────────────────────────────────────
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_HOURS * 60 * 60 * 1000);

  await supabase.from("insights").upsert(
    {
      client_id:     clientId,
      insights_json: insights,
      generated_at:  now.toISOString(),
      expires_at:    expiresAt.toISOString(),
    },
    { onConflict: "client_id" }
  );

  return NextResponse.json({
    insights,
    generated_at: now.toISOString(),
    cached: false,
  });
}

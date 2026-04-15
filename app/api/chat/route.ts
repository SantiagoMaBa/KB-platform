import { NextRequest, NextResponse } from "next/server";
import { openai, MODEL } from "@/lib/openai";
import { buildKBContextWithIndex } from "@/lib/kb";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

// ── System prompt ──────────────────────────────────────────────────────────────
// Structure: persona → instructions → index (document map) → full wiki content
const SYSTEM_PROMPT = (
  clientName: string,
  indexContent: string | null,
  wikiContent: string
) => {
  const sections: string[] = [
    `Eres el asistente inteligente de "${clientName}".`,
    `Tu rol es ayudar al equipo a consultar información interna de forma clara, precisa y profesional, basándote exclusivamente en los documentos de la base de conocimiento.`,
    ``,
    `## Instrucciones de respuesta`,
    `- Cuando el usuario pregunte sobre datos cuantitativos (métricas, montos, fechas, cantidades), presenta los resultados con tablas o listas estructuradas.`,
    `- Calcula totales, porcentajes o resúmenes cuando el contexto lo permita.`,
    `- Señala ⚠️ alertas que requieran atención inmediata según los documentos.`,
    `- Haz recomendaciones concretas cuando el contexto lo permita.`,
    `- Si la pregunta no puede responderse con la información disponible, dilo claramente en lugar de inventar datos.`,
    `- Responde siempre en español.`,
  ];

  if (indexContent) {
    sections.push(
      ``,
      `---`,
      ``,
      `## ÍNDICE DE LA BASE DE CONOCIMIENTO`,
      `*(Lee esto primero para saber qué documentos existen y cuáles son relevantes para la consulta.)*`,
      ``,
      indexContent,
    );
  }

  if (wikiContent) {
    sections.push(
      ``,
      `---`,
      ``,
      `## CONTENIDO COMPLETO DE LOS DOCUMENTOS`,
      ``,
      wikiContent,
    );
  }

  return sections.join("\n");
};

export async function POST(req: NextRequest) {
  try {
    const { messages, clientId, clientName } = await req.json();

    if (!clientId || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }

    // Build KB context: index + wiki (all server-side)
    const { indexContent, wikiContent } = await buildKBContextWithIndex(clientId);

    if (!indexContent && !wikiContent) {
      return NextResponse.json(
        {
          role: "assistant",
          content:
            "No encontré documentos en la base de conocimiento de esta plaza. Por favor, sube documentos desde el panel de administración.",
        },
        { status: 200 }
      );
    }

    const systemPrompt = SYSTEM_PROMPT(clientName ?? clientId, indexContent, wikiContent);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const assistantMessage = completion.choices[0]?.message?.content ?? "";

    // Persist conversation
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage?.role === "user") {
      await supabase.from("chat_messages").insert([
        { client_id: clientId, role: "user",      content: lastUserMessage.content },
        { client_id: clientId, role: "assistant",  content: assistantMessage },
      ]);
    }

    return NextResponse.json({ role: "assistant", content: assistantMessage });
  } catch (error) {
    console.error("[/api/chat]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

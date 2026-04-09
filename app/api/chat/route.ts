import { NextRequest, NextResponse } from "next/server";
import { openai, MODEL } from "@/lib/openai";
import { buildKBContext } from "@/lib/kb";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

const SYSTEM_PROMPT = (clientName: string, kbContext: string) => `
Eres el asistente inteligente de "${clientName}", una plaza comercial.
Tu rol es ayudar al equipo administrativo a consultar información de la KB de la plaza de forma clara, precisa y profesional.

Cuando el usuario pregunta sobre métricas, contratos, pagos o adeudos:
- Presenta los datos de forma estructurada con tablas o listas cuando aplique
- Calcula totales, porcentajes o resúmenes cuando sea útil
- Señala alertas o situaciones que requieran atención (vencimientos próximos, adeudos, etc.)
- Haz recomendaciones concretas cuando el contexto lo permita

Responde siempre en español. Si la pregunta no puede responderse con la información disponible en la KB, dilo claramente.

---
## BASE DE CONOCIMIENTO DE LA PLAZA

${kbContext}
---
`.trim();

export async function POST(req: NextRequest) {
  try {
    const { messages, clientId, clientName } = await req.json();

    if (!clientId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Parámetros inválidos" },
        { status: 400 }
      );
    }

    // Build KB context server-side
    const kbContext = await buildKBContext(clientId);

    if (!kbContext) {
      return NextResponse.json(
        {
          role: "assistant",
          content:
            "No encontré documentos en la base de conocimiento de esta plaza. Por favor, sube documentos desde el panel de administración.",
        },
        { status: 200 }
      );
    }

    const systemPrompt = SYSTEM_PROMPT(clientName || clientId, kbContext);

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

    // Persist both user message and assistant response
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage?.role === "user") {
      await supabase.from("chat_messages").insert([
        {
          client_id: clientId,
          role: "user",
          content: lastUserMessage.content,
        },
        {
          client_id: clientId,
          role: "assistant",
          content: assistantMessage,
        },
      ]);
    }

    return NextResponse.json({
      role: "assistant",
      content: assistantMessage,
    });
  } catch (error) {
    console.error("[/api/chat]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { openai, MODEL } from "@/lib/openai";
import { listRawDocuments, readFile, uploadFile, wikiPath } from "@/lib/kb";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
// Compilation can take a while for multiple docs
export const maxDuration = 60;

const COMPILE_PROMPT = (filename: string, raw: string) => `
Eres un asistente experto en gestión de plazas comerciales.
Tu tarea es transformar el siguiente documento de datos crudos de una plaza en un artículo wiki estructurado, claro y fácil de consultar.

Reglas:
1. Mantén TODA la información del documento original, sin omitir datos.
2. Organiza el contenido con encabezados Markdown claros (##, ###).
3. Usa tablas cuando haya datos tabulares.
4. Agrega un resumen ejecutivo al inicio (máx. 3 puntos clave).
5. Señala con ⚠️ cualquier alerta, vencimiento próximo o adeudo.
6. No inventes información que no esté en el documento original.
7. Responde en español.

Nombre del documento: ${filename}

---
${raw}
---

Genera el artículo wiki compilado:
`.trim();

export async function POST(req: NextRequest) {
  try {
    const { clientId } = await req.json();

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId es requerido" },
        { status: 400 }
      );
    }

    const rawDocs = await listRawDocuments(clientId);

    if (rawDocs.length === 0) {
      return NextResponse.json(
        { error: "No hay documentos raw para compilar" },
        { status: 404 }
      );
    }

    const results: { filename: string; success: boolean; error?: string }[] =
      [];

    for (const doc of rawDocs) {
      try {
        const rawContent = await readFile(doc.path);
        if (!rawContent) {
          results.push({ filename: doc.name, success: false, error: "No se pudo leer" });
          continue;
        }

        const completion = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            {
              role: "user",
              content: COMPILE_PROMPT(doc.name, rawContent),
            },
          ],
          temperature: 0.2,
          max_tokens: 3000,
        });

        const compiled = completion.choices[0]?.message?.content ?? "";
        const targetPath = wikiPath(clientId, doc.name);
        const uploaded = await uploadFile(targetPath, compiled);

        if (uploaded) {
          // Mark document as compiled in DB
          await supabase
            .from("documents")
            .update({ compiled: true })
            .eq("client_id", clientId)
            .eq("filename", doc.name);

          results.push({ filename: doc.name, success: true });
        } else {
          results.push({ filename: doc.name, success: false, error: "Error al subir a storage" });
        }
      } catch (err) {
        results.push({
          filename: doc.name,
          success: false,
          error: String(err),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      compiled: successCount,
      total: rawDocs.length,
      results,
    });
  } catch (error) {
    console.error("[/api/compile]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

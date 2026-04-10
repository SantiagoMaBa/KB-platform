import { NextRequest, NextResponse } from "next/server";
import { openai, MODEL } from "@/lib/openai";
import {
  listRawDocuments,
  readFile,
  uploadFile,
  wikiPath,
  fetchDocumentsMeta,
  generateAndUploadIndex,
  DocumentMeta,
} from "@/lib/kb";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── Compile prompt — incorporates document metadata ────────────────────────────
const COMPILE_PROMPT = (meta: DocumentMeta, raw: string) => {
  const name = meta.display_name ?? meta.filename;
  const metaBlock = [
    `- **Nombre descriptivo:** ${name}`,
    meta.description ? `- **Descripción:** ${meta.description}` : null,
    meta.category    ? `- **Categoría:** ${meta.category}` : null,
    meta.tags        ? `- **Tags:** ${meta.tags}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `
Eres un asistente experto en gestión de plazas comerciales.
Tu tarea es transformar el siguiente documento de datos crudos en un artículo wiki estructurado, claro y fácil de consultar.

## Metadata del documento
${metaBlock}

## Reglas de compilación
1. Mantén TODA la información del documento original, sin omitir datos.
2. Abre el artículo con un párrafo de 1–2 líneas que explique para qué sirve este documento (basándote en la descripción y categoría de la metadata).
3. Organiza el contenido con encabezados Markdown claros (##, ###).
4. Usa tablas cuando haya datos tabulares.
5. Agrega un resumen ejecutivo al inicio (máx. 3 puntos clave).
6. Señala con ⚠️ cualquier alerta, vencimiento próximo o adeudo.
7. No inventes información que no esté en el documento original.
8. Si la categoría es "Contratos", resalta especialmente las fechas de vencimiento.
9. Si la categoría es "Pagos", resalta los adeudos y la eficiencia de cobranza.
10. Responde en español.

## Contenido del documento: \`${meta.filename}\`
---
${raw}
---

Genera el artículo wiki compilado:
`.trim();
};

export async function POST(req: NextRequest) {
  try {
    const { clientId, clientName } = await req.json();

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

    // Fetch metadata map keyed by filename
    const metaList = await fetchDocumentsMeta(clientId);
    const metaByFilename = new Map(metaList.map((m) => [m.filename, m]));

    const results: { filename: string; success: boolean; error?: string }[] = [];

    for (const doc of rawDocs) {
      try {
        const rawContent = await readFile(doc.path);
        if (!rawContent) {
          results.push({ filename: doc.name, success: false, error: "No se pudo leer" });
          continue;
        }

        // Build metadata for this doc (fallback to minimal if not in DB)
        const meta: DocumentMeta = metaByFilename.get(doc.name) ?? {
          filename:     doc.name,
          display_name: null,
          description:  null,
          category:     null,
          tags:         null,
          compiled:     false,
          storage_path: doc.path,
        };

        const completion = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "user", content: COMPILE_PROMPT(meta, rawContent) },
          ],
          temperature: 0.2,
          max_tokens: 3000,
        });

        const compiled = completion.choices[0]?.message?.content ?? "";
        const targetPath = wikiPath(clientId, doc.name);
        const uploaded = await uploadFile(targetPath, compiled);

        if (uploaded) {
          await supabase
            .from("documents")
            .update({ compiled: true })
            .eq("client_id", clientId)
            .eq("filename", doc.name);

          results.push({ filename: doc.name, success: true });
        } else {
          results.push({
            filename: doc.name,
            success: false,
            error: "Error al subir a storage",
          });
        }
      } catch (err) {
        results.push({ filename: doc.name, success: false, error: String(err) });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    // Regenerate index.md after compilation so status is up to date
    await generateAndUploadIndex(clientId, clientName ?? clientId);

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

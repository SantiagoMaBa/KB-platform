import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rawPath, generateAndUploadIndex } from "@/lib/kb";
import { excelToMarkdown, excelToStructuredData, docxToMarkdown, toMdFilename } from "@/lib/excel";
import { isPdf, pdfToMarkdown } from "@/lib/pdf";

export const runtime = "nodejs";

const ACCEPTED_EXTS = [".md", ".txt", ".pdf", ".xlsx", ".csv", ".docx"];

function getExt(filename: string): string {
  return "." + filename.split(".").pop()!.toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file        = formData.get("file")        as File   | null;
    const clientId    = formData.get("clientId")    as string | null;
    const clientName  = formData.get("clientName")  as string | null;
    const displayName = formData.get("displayName") as string | null;
    const description = formData.get("description") as string | null;
    const category    = formData.get("category")    as string | null;
    const tags        = formData.get("tags")        as string | null;

    if (!file || !clientId) {
      return NextResponse.json(
        { error: "file y clientId son requeridos" },
        { status: 400 }
      );
    }

    const ext = getExt(file.name);
    if (!ACCEPTED_EXTS.includes(ext)) {
      return NextResponse.json(
        { error: `Formato no soportado. Acepta: ${ACCEPTED_EXTS.join(", ")}` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ── Convert to Markdown ────────────────────────────────────────────────────
    let storedFilename: string;
    let content: string | Buffer;

    if (isPdf(file.name)) {
      const { content: md, mdFilename } = await pdfToMarkdown(file.name, buffer);
      storedFilename = mdFilename;
      content = md;

    } else if (ext === ".xlsx" || ext === ".csv") {
      content = excelToMarkdown(buffer, file.name);
      storedFilename = toMdFilename(file.name);

      // Store structured data for SQL metrics
      const datasets = excelToStructuredData(buffer, file.name);
      for (const ds of datasets) {
        await supabase.from("structured_datasets").upsert(
          {
            client_id:    clientId,
            filename:     file.name,
            sheet_name:   ds.sheetName,
            display_name: `${(displayName?.trim() || file.name)} — ${ds.sheetName}`,
            headers:      ds.headers,
            rows:         ds.rows,
            row_count:    ds.rowCount,
            updated_at:   new Date().toISOString(),
          },
          { onConflict: "client_id,filename,sheet_name" }
        );
      }

    } else if (ext === ".docx") {
      content = await docxToMarkdown(buffer, file.name);
      storedFilename = toMdFilename(file.name);

    } else {
      // .md / .txt — store as-is
      storedFilename = file.name;
      content = buffer;
    }

    // ── Upload to Supabase Storage ─────────────────────────────────────────────
    const storagePath = rawPath(clientId, storedFilename);
    const blobContent = typeof content === "string" ? content : content.toString("utf-8");
    const blob = new Blob([blobContent], { type: "text/markdown" });

    const { error: uploadError } = await supabase.storage
      .from("kb-clients")
      .upload(storagePath, blob, { upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // ── Register in documents table ────────────────────────────────────────────
    await supabase.from("documents").upsert(
      {
        client_id:    clientId,
        filename:     storedFilename,
        storage_path: storagePath,
        compiled:     false,
        display_name: displayName?.trim() || null,
        description:  description?.trim() || null,
        category:     category            || null,
        tags:         tags?.trim()        || null,
      },
      { onConflict: "client_id,filename" }
    );

    await generateAndUploadIndex(clientId, clientName ?? clientId);

    return NextResponse.json({
      success: true,
      path: storagePath,
      ...(storedFilename !== file.name ? { converted: storedFilename } : {}),
    });

  } catch (error) {
    console.error("[/api/upload]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}

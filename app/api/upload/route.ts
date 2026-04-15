import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rawPath, generateAndUploadIndex } from "@/lib/kb";
import { excelToMarkdown, excelFilenameToMd } from "@/lib/excel";

export const runtime = "nodejs";

const ACCEPTED_EXTS = [".md", ".txt", ".xlsx", ".csv"];

function isExcel(filename: string): boolean {
  return filename.endsWith(".xlsx") || filename.endsWith(".csv");
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

    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTS.includes(ext)) {
      return NextResponse.json(
        { error: `Formato no soportado. Acepta: ${ACCEPTED_EXTS.join(", ")}` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    let storedFilename: string;
    let contentBlob: Blob;

    if (isExcel(file.name)) {
      // Convert Excel/CSV → Markdown before storing
      const markdown = excelToMarkdown(Buffer.from(arrayBuffer), file.name);
      storedFilename = excelFilenameToMd(file.name);
      contentBlob = new Blob([markdown], { type: "text/markdown" });
    } else {
      storedFilename = file.name;
      contentBlob = new Blob([arrayBuffer], { type: "text/markdown" });
    }

    const storagePath = rawPath(clientId, storedFilename);

    const { error: uploadError } = await supabase.storage
      .from("kb-clients")
      .upload(storagePath, contentBlob, { upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Upsert document record with metadata
    await supabase.from("documents").upsert(
      {
        client_id:    clientId,
        filename:     storedFilename,
        storage_path: storagePath,
        compiled:     false,
        display_name: displayName?.trim()  || null,
        description:  description?.trim()  || null,
        category:     category             || null,
        tags:         tags?.trim()         || null,
      },
      { onConflict: "client_id,filename" }
    );

    await generateAndUploadIndex(clientId, clientName ?? clientId);

    return NextResponse.json({
      success: true,
      path: storagePath,
      converted: isExcel(file.name) ? storedFilename : undefined,
    });
  } catch (error) {
    console.error("[/api/upload]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

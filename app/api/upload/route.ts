import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rawPath, generateAndUploadIndex } from "@/lib/kb";

export const runtime = "nodejs";

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

    if (!file.name.endsWith(".md") && !file.name.endsWith(".txt")) {
      return NextResponse.json(
        { error: "Solo se aceptan archivos .md o .txt" },
        { status: 400 }
      );
    }

    const storagePath = rawPath(clientId, file.name);
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "text/markdown" });

    const { error: uploadError } = await supabase.storage
      .from("kb-clients")
      .upload(storagePath, blob, { upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Upsert document record with metadata
    await supabase.from("documents").upsert(
      {
        client_id:    clientId,
        filename:     file.name,
        storage_path: storagePath,
        compiled:     false,
        display_name: displayName?.trim()  || null,
        description:  description?.trim()  || null,
        category:     category             || null,
        tags:         tags?.trim()         || null,
      },
      { onConflict: "client_id,filename" }
    );

    // Regenerate index.md with updated metadata
    await generateAndUploadIndex(clientId, clientName ?? clientId);

    return NextResponse.json({ success: true, path: storagePath });
  } catch (error) {
    console.error("[/api/upload]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

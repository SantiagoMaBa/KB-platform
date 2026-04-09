/**
 * POST /api/sync/gdrive
 *
 * Sincroniza archivos .md / .txt / .pdf desde una carpeta de Google Drive
 * (compartida con el service account) hacia Supabase Storage raw/.
 *
 * Body: { clientId: string; sharedLink: string }
 *
 * Seguridad: GOOGLE_SERVICE_ACCOUNT_JSON solo vive en el servidor.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { uploadRawBuffer, rawPath } from "@/lib/kb";
import {
  extractFolderIdFromLink,
  listFolderFiles,
  downloadFile,
  getFolderName,
} from "@/lib/gdrive";
import { isPdf, pdfToMarkdown } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

interface SyncFileResult {
  filename: string;
  status: "synced" | "error";
  error?: string;
}

export async function POST(req: NextRequest) {
  let body: { clientId?: string; sharedLink?: string } = {};
  try {
    body = await req.json();
    const { clientId, sharedLink } = body;

    if (!clientId || !sharedLink) {
      return NextResponse.json(
        { error: "clientId y sharedLink son requeridos" },
        { status: 400 }
      );
    }

    // Verify credentials are configured
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return NextResponse.json(
        {
          error:
            "GOOGLE_SERVICE_ACCOUNT_JSON no está configurado. Ver README.md para instrucciones.",
        },
        { status: 503 }
      );
    }

    // Extract folder ID
    const folderId = extractFolderIdFromLink(sharedLink);
    if (!folderId) {
      return NextResponse.json(
        {
          error:
            "Link de Google Drive inválido. Formato esperado: https://drive.google.com/drive/folders/FOLDER_ID",
        },
        { status: 400 }
      );
    }

    // Get folder name for display
    const folderName = await getFolderName(folderId);

    // List files
    const files = await listFolderFiles(folderId);
    if (files.length === 0) {
      return NextResponse.json({
        synced: 0,
        total: 0,
        folderName,
        results: [],
        message: "No se encontraron archivos .md, .txt o .pdf en la carpeta.",
      });
    }

    // Download + upload each file
    const results: SyncFileResult[] = [];

    for (const file of files) {
      try {
        const buffer = await downloadFile(file.id);

        let storagePath: string;
        let uploadBuffer: Buffer = buffer;

        if (isPdf(file.name)) {
          // Convert PDF → markdown text
          const { content, mdFilename } = await pdfToMarkdown(file.name, buffer);
          uploadBuffer = Buffer.from(content, "utf-8");
          storagePath = rawPath(clientId, mdFilename);

          await uploadRawBuffer(storagePath, uploadBuffer, "text/markdown");

          // Register in documents table (use .md filename)
          await supabase.from("documents").upsert(
            {
              client_id: clientId,
              filename: mdFilename,
              storage_path: storagePath,
              compiled: false,
            },
            { onConflict: "client_id,filename" }
          );
        } else {
          storagePath = rawPath(clientId, file.name);
          await uploadRawBuffer(storagePath, uploadBuffer, "text/markdown");

          await supabase.from("documents").upsert(
            {
              client_id: clientId,
              filename: file.name,
              storage_path: storagePath,
              compiled: false,
            },
            { onConflict: "client_id,filename" }
          );
        }

        results.push({ filename: file.name, status: "synced" });
      } catch (err) {
        results.push({
          filename: file.name,
          status: "error",
          error: String(err),
        });
      }
    }

    const syncedCount = results.filter((r) => r.status === "synced").length;

    // Update sync source record
    await supabase
      .from("sync_sources")
      .upsert(
        {
          client_id: clientId,
          source_type: "gdrive",
          shared_link: sharedLink,
          folder_name: folderName,
          last_sync_at: new Date().toISOString(),
          last_sync_count: syncedCount,
          last_sync_error:
            syncedCount < results.length
              ? `${results.length - syncedCount} archivo(s) con error`
              : null,
        },
        { onConflict: "client_id,source_type" }
      );

    return NextResponse.json({
      synced: syncedCount,
      total: files.length,
      folderName,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/sync/gdrive]", message);

    // Update source with error using already-parsed body
    if (body.clientId) {
      try {
        await supabase.from("sync_sources").upsert(
          {
            client_id: body.clientId,
            source_type: "gdrive",
            shared_link: body.sharedLink ?? "",
            last_sync_at: new Date().toISOString(),
            last_sync_count: 0,
            last_sync_error: message,
          },
          { onConflict: "client_id,source_type" }
        );
      } catch { /* ignore */ }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

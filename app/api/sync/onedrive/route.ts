/**
 * POST /api/sync/onedrive
 *
 * Sincroniza archivos .md / .txt / .pdf desde una carpeta compartida de OneDrive
 * hacia Supabase Storage raw/.
 *
 * Body: { clientId: string; sharedLink: string }
 *
 * Seguridad: MICROSOFT_CLIENT_ID / CLIENT_SECRET / TENANT_ID solo en el servidor.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { uploadRawBuffer, rawPath } from "@/lib/kb";
import {
  listSharedFolderFiles,
  downloadOneDriveFile,
  getSharedFolderName,
} from "@/lib/onedrive";
import { isPdf, pdfToMarkdown } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

interface SyncFileResult {
  filename: string;
  status: "synced" | "error";
  error?: string;
}

function checkCredentials(): string | null {
  const missing = ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "MICROSOFT_TENANT_ID"]
    .filter((k) => !process.env[k]);
  return missing.length
    ? `Variables de entorno faltantes: ${missing.join(", ")}. Ver README.md.`
    : null;
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

    const credError = checkCredentials();
    if (credError) {
      return NextResponse.json({ error: credError }, { status: 503 });
    }

    // Validate it looks like a OneDrive link
    if (
      !sharedLink.includes("onedrive.live.com") &&
      !sharedLink.includes("sharepoint.com") &&
      !sharedLink.includes("1drv.ms")
    ) {
      return NextResponse.json(
        {
          error:
            "Link de OneDrive inválido. Formatos aceptados: onedrive.live.com, sharepoint.com o 1drv.ms",
        },
        { status: 400 }
      );
    }

    // Get folder name
    const folderName = await getSharedFolderName(sharedLink);

    // List files
    const files = await listSharedFolderFiles(sharedLink);
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
        const buffer = await downloadOneDriveFile(file);

        let storagePath: string;
        let uploadBuffer: Buffer = buffer;

        if (isPdf(file.name)) {
          const { content, mdFilename } = await pdfToMarkdown(file.name, buffer);
          uploadBuffer = Buffer.from(content, "utf-8");
          storagePath = rawPath(clientId, mdFilename);

          await uploadRawBuffer(storagePath, uploadBuffer, "text/markdown");

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

    await supabase
      .from("sync_sources")
      .upsert(
        {
          client_id: clientId,
          source_type: "onedrive",
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
    console.error("[/api/sync/onedrive]", message);

    if (body.clientId) {
      try {
        await supabase.from("sync_sources").upsert(
          {
            client_id: body.clientId,
            source_type: "onedrive",
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

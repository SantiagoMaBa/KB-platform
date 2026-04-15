/**
 * POST /api/sync/onedrive
 *
 * Sincroniza archivos desde una carpeta compartida de OneDrive / SharePoint
 * hacia Supabase Storage raw/.
 * Formatos soportados: .md, .txt, .pdf, .xlsx, .csv
 *
 * Body: { clientId: string; sharedLink: string; sourceId?: string }
 *
 * Autenticación: intenta acceso anónimo primero (carpetas públicas).
 * Si falla, requiere MICROSOFT_CLIENT_ID / CLIENT_SECRET / TENANT_ID.
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
import { excelToMarkdown, docxToMarkdown, toMdFilename } from "@/lib/excel";

export const runtime = "nodejs";
export const maxDuration = 60;

interface SyncFileResult {
  filename: string;
  status: "synced" | "error";
  error?: string;
}

function isExcel(filename: string): boolean {
  return /\.(xlsx|csv)$/i.test(filename);
}
function isDocx(filename: string): boolean {
  return /\.docx$/i.test(filename);
}

export async function POST(req: NextRequest) {
  let body: { clientId?: string; sharedLink?: string; sourceId?: string } = {};

  try {
    body = await req.json();
    const { clientId, sharedLink, sourceId } = body;

    if (!clientId || !sharedLink) {
      return NextResponse.json(
        { error: "clientId y sharedLink son requeridos" },
        { status: 400 }
      );
    }

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

    const folderName = await getSharedFolderName(sharedLink);
    const files = await listSharedFolderFiles(sharedLink);

    if (files.length === 0) {
      return NextResponse.json({
        synced: 0,
        total: 0,
        folderName,
        results: [],
        message: "No se encontraron archivos compatibles (.md, .txt, .pdf, .xlsx, .csv).",
      });
    }

    const results: SyncFileResult[] = [];

    for (const file of files) {
      try {
        const buffer = await downloadOneDriveFile(file);

        let mdFilename: string;
        let mdBuffer: Buffer;

        if (isPdf(file.name)) {
          const { content, mdFilename: pdfMd } = await pdfToMarkdown(file.name, buffer);
          mdFilename = pdfMd;
          mdBuffer = Buffer.from(content, "utf-8");

        } else if (isExcel(file.name)) {
          const markdown = excelToMarkdown(buffer, file.name);
          mdFilename = toMdFilename(file.name);
          mdBuffer = Buffer.from(markdown, "utf-8");

        } else if (isDocx(file.name)) {
          const markdown = await docxToMarkdown(buffer, file.name);
          mdFilename = toMdFilename(file.name);
          mdBuffer = Buffer.from(markdown, "utf-8");

        } else {
          mdFilename = file.name;
          mdBuffer = buffer;
        }

        const storagePath = rawPath(clientId, mdFilename);
        await uploadRawBuffer(storagePath, mdBuffer, "text/markdown");

        await supabase.from("documents").upsert(
          {
            client_id:    clientId,
            filename:     mdFilename,
            storage_path: storagePath,
            compiled:     false,
          },
          { onConflict: "client_id,filename" }
        );

        results.push({ filename: file.name, status: "synced" });
      } catch (err) {
        results.push({ filename: file.name, status: "error", error: String(err) });
      }
    }

    const syncedCount = results.filter((r) => r.status === "synced").length;

    if (sourceId) {
      await supabase
        .from("sync_sources")
        .update({
          folder_name:      folderName,
          last_sync_at:     new Date().toISOString(),
          last_sync_count:  syncedCount,
          last_sync_error:  syncedCount < results.length
            ? `${results.length - syncedCount} archivo(s) con error`
            : null,
        })
        .eq("id", sourceId);
    }

    return NextResponse.json({ synced: syncedCount, total: files.length, folderName, results });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/sync/onedrive]", message);

    if (body.sourceId) {
      try {
        await supabase.from("sync_sources").update({
          last_sync_at:    new Date().toISOString(),
          last_sync_count: 0,
          last_sync_error: message,
        }).eq("id", body.sourceId);
      } catch { /* ignore */ }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

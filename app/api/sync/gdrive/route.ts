/**
 * POST /api/sync/gdrive
 *
 * Sincroniza archivos desde una carpeta de Google Drive hacia Supabase Storage raw/.
 * Formatos soportados: .md, .txt, .pdf, .xlsx, .csv, Google Sheets (exporta como xlsx).
 *
 * Body: { clientId: string; sharedLink: string; sourceId?: string }
 *
 * Modos de autenticación (lib/gdrive.ts):
 *   - GOOGLE_API_KEY: carpeta pública, sin service account
 *   - GOOGLE_SERVICE_ACCOUNT_JSON: carpeta privada
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { uploadRawBuffer, rawPath } from "@/lib/kb";
import {
  extractFolderIdFromLink,
  listFolderFiles,
  downloadFile,
  downloadGoogleSheet,
  downloadGoogleDoc,
  isGoogleSheet,
  isGoogleDoc,
  getFolderName,
} from "@/lib/gdrive";
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

    // Check at least one auth method is configured
    if (!process.env.GOOGLE_API_KEY && !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return NextResponse.json(
        {
          error:
            "No hay credenciales de Google Drive configuradas. Agrega GOOGLE_API_KEY (carpeta pública) en las variables de entorno de Vercel.",
        },
        { status: 503 }
      );
    }

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

    const folderName = await getFolderName(folderId);
    const files = await listFolderFiles(folderId);

    if (files.length === 0) {
      return NextResponse.json({
        synced: 0,
        total: 0,
        folderName,
        results: [],
        message: "No se encontraron archivos compatibles (.md, .txt, .pdf, .xlsx, .csv, Google Sheets).",
      });
    }

    const results: SyncFileResult[] = [];

    for (const file of files) {
      try {
        let mdFilename: string;
        let mdBuffer: Buffer;

        if (isGoogleSheet(file.mimeType)) {
          // Google Sheets → export as xlsx → convert to markdown
          const xlsxBuffer = await downloadGoogleSheet(file.id);
          const markdown = excelToMarkdown(xlsxBuffer, file.name + ".xlsx");
          mdFilename = toMdFilename(file.name + ".xlsx");
          mdBuffer = Buffer.from(markdown, "utf-8");

        } else if (isGoogleDoc(file.mimeType)) {
          // Google Docs → export as docx → convert to markdown
          const docxBuffer = await downloadGoogleDoc(file.id);
          const markdown = await docxToMarkdown(docxBuffer, file.name + ".docx");
          mdFilename = toMdFilename(file.name + ".docx");
          mdBuffer = Buffer.from(markdown, "utf-8");

        } else if (isPdf(file.name)) {
          // PDF → extract text → markdown
          const rawBuffer = await downloadFile(file.id);
          const { content, mdFilename: pdfMd } = await pdfToMarkdown(file.name, rawBuffer);
          mdFilename = pdfMd;
          mdBuffer = Buffer.from(content, "utf-8");

        } else if (isExcel(file.name)) {
          const rawBuffer = await downloadFile(file.id);
          const markdown = excelToMarkdown(rawBuffer, file.name);
          mdFilename = toMdFilename(file.name);
          mdBuffer = Buffer.from(markdown, "utf-8");

        } else if (isDocx(file.name)) {
          const rawBuffer = await downloadFile(file.id);
          const markdown = await docxToMarkdown(rawBuffer, file.name);
          mdFilename = toMdFilename(file.name);
          mdBuffer = Buffer.from(markdown, "utf-8");

        } else {
          // .md / .txt — store as-is
          mdBuffer = await downloadFile(file.id);
          mdFilename = file.name;
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
    console.error("[/api/sync/gdrive]", message);

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

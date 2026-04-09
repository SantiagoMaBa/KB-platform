/**
 * lib/gdrive.ts — Google Drive utilities (server-side only).
 *
 * Autenticación: service account. La carpeta de Drive debe estar compartida
 * con el email del service account (p. ej. kb-sync@my-project.iam.gserviceaccount.com).
 *
 * NUNCA importar este módulo desde código del cliente.
 */
import { google } from "googleapis";

// MIME types accepted as KB documents
const ACCEPTED_MIMES = new Set([
  "text/plain",
  "text/markdown",
  "application/pdf",
]);

// File extensions accepted when MIME is generic
const ACCEPTED_EXTS = new Set([".md", ".txt", ".pdf"]);

// ── Auth ──────────────────────────────────────────────────────────────────────

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON no está configurado.");

  let credentials: object;
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON no es JSON válido. Asegúrate de que esté en una sola línea."
    );
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extracts folder ID from a Google Drive share link. */
export function extractFolderIdFromLink(link: string): string | null {
  // Formats:
  //   https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
  //   https://drive.google.com/drive/u/0/folders/FOLDER_ID
  const match = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function isAccepted(name: string, mimeType: string): boolean {
  if (ACCEPTED_MIMES.has(mimeType)) return true;
  const ext = "." + name.split(".").pop()?.toLowerCase();
  return ACCEPTED_EXTS.has(ext);
}

// ── List files in a folder ────────────────────────────────────────────────────

export interface GDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size: string;
}

export async function listFolderFiles(folderId: string): Promise<GDriveFile[]> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, modifiedTime, size)",
    pageSize: 200,
    orderBy: "name",
  });

  const files = res.data.files ?? [];
  return files.filter(
    (f): f is GDriveFile =>
      !!f.id && !!f.name && isAccepted(f.name, f.mimeType ?? "")
  );
}

// ── Download a file as Buffer ─────────────────────────────────────────────────

export async function downloadFile(fileId: string): Promise<Buffer> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (drive.files.get as any)(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );

  return Buffer.from(res.data as ArrayBuffer);
}

// ── Get folder display name ───────────────────────────────────────────────────

export async function getFolderName(folderId: string): Promise<string> {
  try {
    const auth = getAuth();
    const drive = google.drive({ version: "v3", auth });
    const res = await drive.files.get({
      fileId: folderId,
      fields: "name",
    });
    return res.data.name ?? folderId;
  } catch {
    return folderId;
  }
}

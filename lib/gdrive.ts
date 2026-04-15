/**
 * lib/gdrive.ts — Google Drive utilities (server-side only).
 *
 * Modos de autenticación (en orden de preferencia):
 *   1. API Key (GOOGLE_API_KEY): más simple. La carpeta debe ser pública
 *      ("Cualquiera con el link puede ver"). Solo se necesita una clave de API
 *      de Google Cloud Console — sin service account ni JSON.
 *   2. Service account (GOOGLE_SERVICE_ACCOUNT_JSON): la carpeta debe estar
 *      compartida con el email del service account. Más control, más setup.
 *
 * NUNCA importar este módulo desde código del cliente.
 */

const DRIVE_BASE = "https://www.googleapis.com/drive/v3";

const ACCEPTED_MIMES = new Set([
  "text/plain",
  "text/markdown",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/csv",
  "application/vnd.google-apps.spreadsheet", // Google Sheets
]);
const ACCEPTED_EXTS = new Set([".md", ".txt", ".pdf", ".xlsx", ".csv"]);

const GOOGLE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const XLSX_EXPORT_MIME  = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extracts folder ID from a Google Drive share link. */
export function extractFolderIdFromLink(link: string): string | null {
  const match = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function isAccepted(name: string, mimeType: string): boolean {
  if (ACCEPTED_MIMES.has(mimeType)) return true;
  const ext = "." + name.split(".").pop()?.toLowerCase();
  return ACCEPTED_EXTS.has(ext);
}

// ── Auth mode detection ───────────────────────────────────────────────────────

function getApiKey(): string | null {
  return process.env.GOOGLE_API_KEY ?? null;
}

function getServiceAccountCredentials(): object | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size: string;
}

// ── API Key implementation (public folders) ───────────────────────────────────

async function listFolderFilesApiKey(
  folderId: string,
  apiKey: string
): Promise<GDriveFile[]> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType,modifiedTime,size)",
    pageSize: "200",
    orderBy: "name",
    key: apiKey,
  });

  const res = await fetch(`${DRIVE_BASE}/files?${params}`);
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 403) {
      throw new Error(
        "Acceso denegado. Verifica que la carpeta sea pública ('Cualquiera con el link puede ver') y que el API Key de Google esté activo."
      );
    }
    throw new Error(`Drive API: ${res.status} — ${body}`);
  }

  const data = await res.json();
  return (data.files ?? []).filter((f: GDriveFile) =>
    !!f.id && !!f.name && isAccepted(f.name, f.mimeType ?? "")
  );
}

async function downloadFileApiKey(fileId: string, apiKey: string): Promise<Buffer> {
  const params = new URLSearchParams({ alt: "media", key: apiKey });
  const res = await fetch(`${DRIVE_BASE}/files/${fileId}?${params}`);
  if (!res.ok) throw new Error(`Descarga fallida: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function getFolderNameApiKey(folderId: string, apiKey: string): Promise<string> {
  try {
    const params = new URLSearchParams({ fields: "name", key: apiKey });
    const res = await fetch(`${DRIVE_BASE}/files/${folderId}?${params}`);
    if (!res.ok) return folderId;
    const data = await res.json();
    return data.name ?? folderId;
  } catch {
    return folderId;
  }
}

// ── Service Account implementation (private folders) ─────────────────────────

async function getServiceAccountAuth() {
  const { google } = await import("googleapis");
  const credentials = getServiceAccountCredentials();
  if (!credentials) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON no está configurado.");
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
}

async function listFolderFilesServiceAccount(folderId: string): Promise<GDriveFile[]> {
  const { google } = await import("googleapis");
  const auth = await getServiceAccountAuth();
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

async function downloadFileServiceAccount(fileId: string): Promise<Buffer> {
  const { google } = await import("googleapis");
  const auth = await getServiceAccountAuth();
  const drive = google.drive({ version: "v3", auth });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (drive.files.get as any)(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer);
}

async function getFolderNameServiceAccount(folderId: string): Promise<string> {
  try {
    const { google } = await import("googleapis");
    const auth = await getServiceAccountAuth();
    const drive = google.drive({ version: "v3", auth });
    const res = await drive.files.get({ fileId: folderId, fields: "name" });
    return res.data.name ?? folderId;
  } catch {
    return folderId;
  }
}

// ── Public API (selects auth mode automatically) ──────────────────────────────

export async function listFolderFiles(folderId: string): Promise<GDriveFile[]> {
  const apiKey = getApiKey();
  if (apiKey) return listFolderFilesApiKey(folderId, apiKey);

  const sa = getServiceAccountCredentials();
  if (sa) return listFolderFilesServiceAccount(folderId);

  throw new Error(
    "No hay credenciales de Google Drive configuradas. Agrega GOOGLE_API_KEY (carpeta pública) o GOOGLE_SERVICE_ACCOUNT_JSON en las variables de entorno."
  );
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  const apiKey = getApiKey();
  if (apiKey) return downloadFileApiKey(fileId, apiKey);

  const sa = getServiceAccountCredentials();
  if (sa) return downloadFileServiceAccount(fileId);

  throw new Error("No hay credenciales de Google Drive configuradas.");
}

export async function getFolderName(folderId: string): Promise<string> {
  const apiKey = getApiKey();
  if (apiKey) return getFolderNameApiKey(folderId, apiKey);

  const sa = getServiceAccountCredentials();
  if (sa) return getFolderNameServiceAccount(folderId);

  return folderId;
}

/**
 * Exports a Google Sheet as .xlsx buffer.
 * Google Sheets cannot be downloaded directly — must be exported.
 */
export async function downloadGoogleSheet(fileId: string): Promise<Buffer> {
  const apiKey = getApiKey();

  if (apiKey) {
    const params = new URLSearchParams({ mimeType: XLSX_EXPORT_MIME, key: apiKey });
    const res = await fetch(`${DRIVE_BASE}/files/${fileId}/export?${params}`);
    if (!res.ok) throw new Error(`Export Google Sheet fallido: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  const sa = getServiceAccountCredentials();
  if (sa) {
    const { google } = await import("googleapis");
    const auth = await getServiceAccountAuth();
    const drive = google.drive({ version: "v3", auth });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (drive.files.export as any)(
      { fileId, mimeType: XLSX_EXPORT_MIME },
      { responseType: "arraybuffer" }
    );
    return Buffer.from(res.data as ArrayBuffer);
  }

  throw new Error("No hay credenciales de Google Drive configuradas.");
}

/** Returns true if the file is a Google Sheet (needs export, not direct download). */
export function isGoogleSheet(mimeType: string): boolean {
  return mimeType === GOOGLE_SHEET_MIME;
}

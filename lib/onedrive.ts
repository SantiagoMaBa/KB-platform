/**
 * lib/onedrive.ts — Microsoft OneDrive / Graph API utilities (server-side only).
 *
 * Autenticación: client credentials flow (app-only).
 * La Azure App necesita permiso Files.Read.All (Application) en Microsoft Graph.
 *
 * NUNCA importar este módulo desde código del cliente.
 */

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

const ACCEPTED_EXTS = new Set([".md", ".txt", ".pdf"]);

// ── Auth ──────────────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} no está configurado en las variables de entorno.`);
  return v;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

// Simple in-process token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s margin)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const tenantId = requireEnv("MICROSOFT_TENANT_ID");
  const clientId = requireEnv("MICROSOFT_CLIENT_ID");
  const clientSecret = requireEnv("MICROSOFT_CLIENT_SECRET");

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Error al obtener token de Microsoft: ${res.status} — ${body}`);
  }

  const data = (await res.json()) as TokenResponse;

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

// ── Shared link encoding ──────────────────────────────────────────────────────

/**
 * Encodes a OneDrive sharing URL for use with the /shares endpoint.
 * Microsoft spec: base64url("u!" + url) — no padding, + → -, / → _
 */
export function encodeShareUrl(url: string): string {
  return Buffer.from("u!" + url)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// ── Graph API helpers ─────────────────────────────────────────────────────────

async function graphGet<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Graph API ${path}: ${res.status} — ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OneDriveFile {
  id: string;
  name: string;
  size: number;
  lastModifiedDateTime: string;
  "@microsoft.graph.downloadUrl": string;
  file?: { mimeType: string };
  folder?: object;
}

interface DriveItemResponse {
  id: string;
  name: string;
}

interface ChildrenResponse {
  value: OneDriveFile[];
}

// ── List files in a shared folder ─────────────────────────────────────────────

export async function listSharedFolderFiles(
  sharedLink: string
): Promise<OneDriveFile[]> {
  const encoded = encodeShareUrl(sharedLink);

  // Resolve the shared link to a driveItem
  const item = await graphGet<DriveItemResponse>(
    `/shares/${encoded}/driveItem`
  );

  // Get children (one level, no pagination for MVP)
  const children = await graphGet<ChildrenResponse>(
    `/shares/${encoded}/driveItem/children?$select=id,name,size,lastModifiedDateTime,file,folder,@microsoft.graph.downloadUrl&$top=200`
  );

  return children.value.filter(
    (f) =>
      !f.folder &&
      ACCEPTED_EXTS.has("." + f.name.split(".").pop()?.toLowerCase())
  );
}

/** Get the display name of the folder at a shared link. */
export async function getSharedFolderName(sharedLink: string): Promise<string> {
  try {
    const encoded = encodeShareUrl(sharedLink);
    const item = await graphGet<DriveItemResponse>(
      `/shares/${encoded}/driveItem`
    );
    return item.name ?? sharedLink;
  } catch {
    return sharedLink;
  }
}

// ── Download a file ───────────────────────────────────────────────────────────

export async function downloadOneDriveFile(file: OneDriveFile): Promise<Buffer> {
  const downloadUrl = file["@microsoft.graph.downloadUrl"];
  if (!downloadUrl) throw new Error(`No download URL for ${file.name}`);

  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  return Buffer.from(await res.arrayBuffer());
}

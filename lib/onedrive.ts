/**
 * lib/onedrive.ts — Microsoft OneDrive / Graph API utilities (server-side only).
 *
 * Modos de acceso (en orden de preferencia):
 *   1. Anónimo: para carpetas compartidas como "Cualquiera con el link puede ver".
 *      No requiere credenciales de Azure. Microsoft Graph respeta el acceso
 *      anónimo en links públicos de OneDrive Personal y SharePoint.
 *   2. App-only (client credentials): para carpetas que requieren autenticación.
 *      Requiere MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID.
 *
 * NUNCA importar este módulo desde código del cliente.
 */

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

const ACCEPTED_EXTS = new Set([".md", ".txt", ".pdf", ".xlsx", ".csv", ".docx"]);

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function hasAzureCredentials(): boolean {
  return !!(
    process.env.MICROSOFT_CLIENT_ID &&
    process.env.MICROSOFT_CLIENT_SECRET &&
    process.env.MICROSOFT_TENANT_ID
  );
}

// ── Anonymous Graph API (public links) ───────────────────────────────────────

async function anonymousGraphGet<T>(path: string): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}${path}`);
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "El link de OneDrive requiere autenticación. Asegúrate de que la carpeta sea pública ('Cualquiera con el link puede ver') o configura las credenciales de Azure en las variables de entorno."
      );
    }
    throw new Error(`Graph API ${path}: ${res.status} — ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Authenticated Graph API (Azure app credentials) ───────────────────────────

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

// Simple in-process token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const tenantId = process.env.MICROSOFT_TENANT_ID!;
  const clientId = process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;

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
  return cachedToken.token;
}

async function authenticatedGraphGet<T>(path: string): Promise<T> {
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

// ── Selects anonymous or authenticated based on available credentials ─────────

async function graphGet<T>(path: string): Promise<T> {
  if (hasAzureCredentials()) {
    return authenticatedGraphGet<T>(path);
  }
  return anonymousGraphGet<T>(path);
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
  await graphGet<DriveItemResponse>(`/shares/${encoded}/driveItem`);

  // Get children
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

  // @microsoft.graph.downloadUrl is always a pre-authenticated URL —
  // no Authorization header needed regardless of auth mode.
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  return Buffer.from(await res.arrayBuffer());
}

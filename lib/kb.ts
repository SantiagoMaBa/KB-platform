import { supabase } from "./supabase";

const BUCKET = "kb-clients";

// ── Storage paths ──────────────────────────────────────────────────────────────
export function rawPath(clientId: string, filename: string) {
  return `clients/${clientId}/raw/${filename}`;
}

export function wikiPath(clientId: string, filename: string) {
  return `clients/${clientId}/wiki/${filename}`;
}

// ── Read a single file from storage ───────────────────────────────────────────
export async function readFile(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);

  if (error || !data) return null;
  return data.text();
}

// ── List all files in a folder ─────────────────────────────────────────────────
export async function listFiles(folder: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    limit: 100,
    sortBy: { column: "name", order: "asc" },
  });

  if (error || !data) return [];
  return data.map((f) => f.name);
}

// ── Upload / upsert a text file ────────────────────────────────────────────────
export async function uploadFile(
  storagePath: string,
  content: string
): Promise<boolean> {
  const blob = new Blob([content], { type: "text/markdown" });
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, blob, { upsert: true });

  return !error;
}

// ── Upload / upsert a binary buffer (for external sync) ───────────────────────
export async function uploadRawBuffer(
  storagePath: string,
  buffer: Buffer,
  contentType = "text/markdown"
): Promise<boolean> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { upsert: true, contentType });

  return !error;
}

// ── Build full KB context for a client ────────────────────────────────────────
// Reads wiki/ files (compiled). Falls back to raw/ if wiki is empty.
export async function buildKBContext(clientId: string): Promise<string> {
  const wikiFolder = `clients/${clientId}/wiki`;
  const rawFolder = `clients/${clientId}/raw`;

  let files = await listFiles(wikiFolder);
  let folder = wikiFolder;

  if (files.length === 0) {
    files = await listFiles(rawFolder);
    folder = rawFolder;
  }

  if (files.length === 0) return "";

  const parts: string[] = [];
  for (const filename of files) {
    const content = await readFile(`${folder}/${filename}`);
    if (content) {
      parts.push(`## ${filename}\n\n${content}`);
    }
  }

  return parts.join("\n\n---\n\n");
}

// ── List raw documents for a client ───────────────────────────────────────────
export async function listRawDocuments(
  clientId: string
): Promise<{ name: string; path: string }[]> {
  const folder = `clients/${clientId}/raw`;
  const names = await listFiles(folder);
  return names.map((n) => ({ name: n, path: `${folder}/${n}` }));
}

// ── List wiki documents for a client ──────────────────────────────────────────
export async function listWikiDocuments(
  clientId: string
): Promise<{ name: string; path: string }[]> {
  const folder = `clients/${clientId}/wiki`;
  const names = await listFiles(folder);
  return names.map((n) => ({ name: n, path: `${folder}/${n}` }));
}

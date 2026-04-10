import { supabase } from "./supabase";

const BUCKET = "kb-clients";

// ── Storage paths ──────────────────────────────────────────────────────────────
export function rawPath(clientId: string, filename: string) {
  return `clients/${clientId}/raw/${filename}`;
}

export function wikiPath(clientId: string, filename: string) {
  return `clients/${clientId}/wiki/${filename}`;
}

export function indexPath(clientId: string) {
  return `clients/${clientId}/index.md`;
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

// ── Document metadata type ─────────────────────────────────────────────────────
export interface DocumentMeta {
  filename: string;
  display_name: string | null;
  description: string | null;
  category: string | null;
  tags: string | null;
  compiled: boolean;
  storage_path: string;
}

// ── Fetch all document metadata for a client from DB ──────────────────────────
export async function fetchDocumentsMeta(clientId: string): Promise<DocumentMeta[]> {
  const { data } = await supabase
    .from("documents")
    .select("filename, display_name, description, category, tags, compiled, storage_path")
    .eq("client_id", clientId)
    .order("category", { ascending: true })
    .order("display_name", { ascending: true });

  return (data ?? []) as DocumentMeta[];
}

// ── Generate index.md and upload to storage ────────────────────────────────────
// This is the "table of contents" the assistant reads first on every query.
export async function generateAndUploadIndex(
  clientId: string,
  clientName: string
): Promise<void> {
  const docs = await fetchDocumentsMeta(clientId);
  if (docs.length === 0) return;

  const now = new Date().toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const CATEGORY_EMOJI: Record<string, string> = {
    Contratos: "📋",
    Pagos: "💰",
    Reglamentos: "📜",
    Tarifas: "💲",
    Permisos: "🔑",
    Operaciones: "⚙️",
    Otro: "📄",
  };

  // Group by category using a plain object to avoid Map iteration TS issues
  const byCategoryObj: Record<string, DocumentMeta[]> = {};
  for (const doc of docs) {
    const cat = doc.category ?? "Otro";
    if (!byCategoryObj[cat]) byCategoryObj[cat] = [];
    byCategoryObj[cat].push(doc);
  }
  const categories = Object.keys(byCategoryObj).sort();

  const lines: string[] = [
    `# Índice de Base de Conocimiento — ${clientName}`,
    `**Última actualización:** ${now} · **Total de documentos:** ${docs.length} · **Compilados:** ${docs.filter((d) => d.compiled).length}`,
    "",
    "Este índice describe los documentos disponibles en la KB. Úsalo para saber qué información existe antes de responder una consulta.",
    "",
    "---",
    "",
    "## Documentos por categoría",
    "",
  ];

  for (const category of categories) {
    const catDocs = byCategoryObj[category];
    const emoji = CATEGORY_EMOJI[category] ?? "📄";
    lines.push(`### ${emoji} ${category}`);
    lines.push("");

    for (const doc of catDocs) {
      const name = doc.display_name ?? doc.filename;
      const status = doc.compiled ? "✅ Compilado" : "⏳ Pendiente de compilar";
      const wikiFile = doc.compiled ? wikiPath(clientId, doc.filename).split("/").pop() : null;

      lines.push(`#### ${name}`);
      lines.push(`- **Archivo:** \`${doc.filename}\``);
      if (doc.description) lines.push(`- **Descripción:** ${doc.description}`);
      if (doc.tags) lines.push(`- **Tags:** ${doc.tags}`);
      lines.push(`- **Estado:** ${status}`);
      if (wikiFile) lines.push(`- **Wiki disponible:** \`wiki/${wikiFile}\``);
      lines.push("");
    }
  }

  // Summary table
  lines.push("---", "", "## Resumen por categoría", "");
  lines.push("| Categoría | Documentos | Compilados |");
  lines.push("|-----------|-----------|-----------|");
  for (const cat of categories) {
    const catDocs = byCategoryObj[cat];
    const compiled = catDocs.filter((d: DocumentMeta) => d.compiled).length;
    lines.push(`| ${cat} | ${catDocs.length} | ${compiled} |`);
  }
  lines.push("");
  lines.push(
    "> **Instrucción para el asistente:** Cuando el usuario haga una pregunta, consulta primero este índice para identificar qué documentos son relevantes y luego usa su contenido wiki para responder con precisión."
  );

  await uploadFile(indexPath(clientId), lines.join("\n"));
}

// ── Read index.md for a client ─────────────────────────────────────────────────
export async function getIndexContent(clientId: string): Promise<string | null> {
  return readFile(indexPath(clientId));
}

// ── Build full KB context (index + wiki) for the chat assistant ────────────────
export async function buildKBContextWithIndex(clientId: string): Promise<{
  indexContent: string | null;
  wikiContent: string;
}> {
  const wikiFolder = `clients/${clientId}/wiki`;
  const rawFolder = `clients/${clientId}/raw`;

  // Read index
  const indexContent = await getIndexContent(clientId);

  // Read wiki files (fall back to raw if wiki is empty)
  let files = await listFiles(wikiFolder);
  let folder = wikiFolder;

  if (files.length === 0) {
    files = await listFiles(rawFolder);
    folder = rawFolder;
  }

  const parts: string[] = [];
  for (const filename of files) {
    const content = await readFile(`${folder}/${filename}`);
    if (content) {
      parts.push(`## ${filename}\n\n${content}`);
    }
  }

  return {
    indexContent,
    wikiContent: parts.join("\n\n---\n\n"),
  };
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

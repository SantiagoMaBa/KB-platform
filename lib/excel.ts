/**
 * lib/excel.ts — Convierte archivos Excel (.xlsx), CSV y Word (.docx) a Markdown.
 *
 * Cada hoja del workbook se convierte en una sección Markdown con tabla.
 * Las filas vacías y columnas vacías al final se eliminan.
 * Se trunca a MAX_ROWS filas por hoja para evitar overflow de contexto.
 */
import * as XLSX from "xlsx";

const MAX_ROWS = 500;

/** Limpia un valor de celda para uso seguro en tabla Markdown. */
function sanitizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

/** Elimina columnas vacías del lado derecho de todas las filas. */
function trimColumns(rows: string[][]): string[][] {
  if (rows.length === 0) return rows;

  // Ancho máximo real (última columna con algún valor)
  let maxCol = 0;
  for (const row of rows) {
    for (let c = row.length - 1; c >= 0; c--) {
      if (row[c] !== "") { maxCol = Math.max(maxCol, c + 1); break; }
    }
  }
  return rows.map((row) => row.slice(0, maxCol).map(sanitizeCell));
}

/** Convierte una hoja a tabla Markdown. Devuelve null si la hoja está vacía. */
function sheetToMarkdownTable(sheet: XLSX.WorkSheet, sheetName: string): string | null {
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  }) as unknown[][];

  if (raw.length === 0) return null;

  const rows = trimColumns(raw.map((r) => r.map(String)));
  if (rows.length === 0 || rows[0].length === 0) return null;

  const lines: string[] = [];
  lines.push(`## ${sheetName}`);
  lines.push("");

  const header = rows[0];
  const dataRows = rows.slice(1);
  const truncated = dataRows.length > MAX_ROWS;
  const visibleRows = truncated ? dataRows.slice(0, MAX_ROWS) : dataRows;

  // Header row
  lines.push(`| ${header.join(" | ")} |`);
  // Separator
  lines.push(`| ${header.map(() => "---").join(" | ")} |`);
  // Data rows
  for (const row of visibleRows) {
    // Pad row to header width
    const padded = [...row];
    while (padded.length < header.length) padded.push("");
    lines.push(`| ${padded.join(" | ")} |`);
  }

  if (truncated) {
    lines.push("");
    lines.push(
      `_Tabla truncada — mostrando ${MAX_ROWS} de ${dataRows.length} filas._`
    );
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Convierte un Buffer de archivo .xlsx o .csv a Markdown.
 * @param buffer  Contenido del archivo.
 * @param filename  Nombre original (para el título y detección de CSV).
 * @returns String en Markdown listo para guardar como .md
 */
export function excelToMarkdown(buffer: Buffer, filename: string): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const baseName = filename.replace(/\.(xlsx|csv)$/i, "");
  const sections: string[] = [`# ${baseName}`, ""];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const table = sheetToMarkdownTable(sheet, sheetName);
    if (table) sections.push(table);
  }

  if (sections.length === 2) {
    // Solo título y línea vacía — workbook vacío
    return sections.join("\n") + "\n_(Archivo sin datos)_\n";
  }

  return sections.join("\n");
}

/**
 * Devuelve el nombre de archivo .md correspondiente a un .xlsx/.csv/.docx.
 * Ejemplo: "inventario.xlsx" → "inventario.md"
 */
export function toMdFilename(filename: string): string {
  return filename.replace(/\.(xlsx|csv|docx)$/i, ".md");
}

/** @deprecated Use toMdFilename */
export const excelFilenameToMd = toMdFilename;

// ── Word (.docx) ──────────────────────────────────────────────────────────────

/**
 * Convierte un Buffer de archivo .docx a Markdown.
 * Usa mammoth para extraer texto con formato básico.
 */
export async function docxToMarkdown(buffer: Buffer, filename: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require("mammoth");
  const baseName = filename.replace(/\.docx$/i, "");

  // Convert to HTML first, then simplify to Markdown-friendly text
  const { value: html } = await mammoth.convertToHtml({ buffer });

  // Basic HTML → Markdown conversion (headings, bold, lists, paragraphs)
  const md = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, "\n#### $1\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "_$1_")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "\n- $1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "\n$1\n")
    .replace(/<table[^>]*>/gi, "\n")
    .replace(/<\/table>/gi, "\n")
    .replace(/<tr[^>]*>/gi, "")
    .replace(/<\/tr>/gi, " |\n")
    .replace(/<t[dh][^>]*>(.*?)<\/t[dh]>/gi, "| $1 ")
    .replace(/<[^>]+>/g, "") // strip remaining tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n") // collapse excess blank lines
    .trim();

  return `# ${baseName}\n\n${md}\n`;
}

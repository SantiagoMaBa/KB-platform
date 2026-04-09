/**
 * lib/pdf.ts — PDF text extraction helper (server-side only, Node.js runtime).
 *
 * Uses dynamic import of pdf-parse to avoid Next.js build-time file read issues.
 */

export async function extractPdfText(buffer: Buffer): Promise<string> {
  // Dynamic import avoids the build-time test-file issue in pdf-parse
  const pdfParse = (await import("pdf-parse")).default;

  try {
    const result = await pdfParse(buffer);
    const text = result.text?.trim();
    if (!text) return "";

    // Normalize excessive whitespace / blank lines
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""))
      .join("\n");
  } catch (err) {
    console.error("[pdf-parse] Error al extraer texto:", err);
    return "";
  }
}

/** Returns true if the filename is a PDF. */
export function isPdf(filename: string): boolean {
  return filename.toLowerCase().endsWith(".pdf");
}

/**
 * Converts a PDF buffer to a markdown-formatted text string.
 * If extraction fails, returns a stub markdown with a note.
 */
export async function pdfToMarkdown(
  filename: string,
  buffer: Buffer
): Promise<{ content: string; mdFilename: string }> {
  const mdFilename = filename.replace(/\.pdf$/i, ".md");
  const text = await extractPdfText(buffer);

  if (!text) {
    return {
      content: `# ${filename}\n\n> ⚠️ No se pudo extraer texto de este PDF. Verifica que no sea un PDF de solo imagen (escaneado).\n`,
      mdFilename,
    };
  }

  const content = `# ${filename}\n\n${text}\n`;
  return { content, mdFilename };
}

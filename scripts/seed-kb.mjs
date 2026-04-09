/**
 * Seed script: sube los archivos raw de Plaza Demo a Supabase Storage.
 * Ejecutar con: node scripts/seed-kb.mjs
 *
 * Requiere que .env.local esté presente o las variables de entorno exportadas.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env from .env.local
import { readFileSync as rf } from "fs";
let envVars = {};
try {
  const envContent = rf(join(__dirname, "../.env.local"), "utf-8");
  for (const line of envContent.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) {
      envVars[key.trim()] = rest.join("=").trim();
    }
  }
} catch {
  // use process.env
}

const SUPABASE_URL =
  envVars["NEXT_PUBLIC_SUPABASE_URL"] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  envVars["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Supabase URL o key no encontrados.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const CLIENT_ID = "plaza-demo";
const BUCKET = "kb-clients";
const RAW_DIR = join(__dirname, "../data/plaza-demo/raw");

async function seed() {
  console.log("🚀 Iniciando seed de KB para Plaza Centro Norte...\n");

  // 1. Ensure client exists
  const { error: clientError } = await supabase.from("clients").upsert(
    { id: CLIENT_ID, name: "Plaza Centro Norte", slug: "plaza-centro-norte" },
    { onConflict: "id" }
  );
  if (clientError) {
    console.warn("⚠️  Cliente ya existe o error:", clientError.message);
  } else {
    console.log("✅ Cliente plaza-demo asegurado en DB.");
  }

  // 2. Upload raw files
  const files = readdirSync(RAW_DIR).filter(
    (f) => f.endsWith(".md") || f.endsWith(".txt")
  );

  console.log(`\n📂 Subiendo ${files.length} archivos raw...\n`);

  for (const filename of files) {
    const filePath = join(RAW_DIR, filename);
    const content = readFileSync(filePath, "utf-8");
    const storagePath = `clients/${CLIENT_ID}/raw/${filename}`;
    const blob = new Blob([content], { type: "text/markdown" });

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, blob, { upsert: true });

    if (uploadError) {
      console.error(`  ❌ ${filename}: ${uploadError.message}`);
    } else {
      console.log(`  ✅ ${filename}`);

      // Register in documents table
      await supabase.from("documents").upsert(
        {
          client_id: CLIENT_ID,
          filename,
          storage_path: storagePath,
          compiled: false,
        },
        { onConflict: "client_id,filename" }
      );
    }
  }

  console.log("\n✨ Seed completado.");
  console.log(
    "👉 Ahora abre /admin y haz clic en 'Compilar KB con IA' para generar los artículos wiki."
  );
}

seed().catch((e) => {
  console.error("Error fatal:", e);
  process.exit(1);
});

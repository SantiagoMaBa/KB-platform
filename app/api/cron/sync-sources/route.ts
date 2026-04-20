/**
 * GET /api/cron/sync-sources
 *
 * Vercel Cron Job — runs on schedule defined in vercel.json.
 * Syncs all sync_sources that have auto_sync = true.
 *
 * Vercel sends Authorization: Bearer <CRON_SECRET> automatically.
 * Set CRON_SECRET in Vercel environment variables.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime    = "nodejs";
export const maxDuration = 300; // 5 minutes max for full sync run

export async function GET(req: NextRequest) {
  // Verify this is a legitimate Vercel cron request
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all sources with auto_sync enabled
  const { data: sources, error } = await supabase
    .from("sync_sources")
    .select("*")
    .eq("auto_sync", true);

  if (error) {
    console.error("[cron/sync-sources] Error fetching sources:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!sources || sources.length === 0) {
    return NextResponse.json({ synced: 0, message: "No hay fuentes con auto_sync activo." });
  }

  // Build base URL from request host (so we always point to the same deployment)
  const proto   = req.headers.get("x-forwarded-proto") ?? "https";
  const host    = req.headers.get("host") ?? "localhost:3000";
  const baseUrl = `${proto}://${host}`;

  const results: {
    sourceId:   string;
    clientId:   string;
    sourceType: string;
    synced?:    number;
    total?:     number;
    error?:     string;
  }[] = [];

  for (const source of sources) {
    const endpoint =
      source.source_type === "gdrive"
        ? `${baseUrl}/api/sync/gdrive`
        : `${baseUrl}/api/sync/onedrive`;

    try {
      const res = await fetch(endpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          clientId:   source.client_id,
          sharedLink: source.shared_link,
          sourceId:   source.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        results.push({
          sourceId:   source.id,
          clientId:   source.client_id,
          sourceType: source.source_type,
          error:      data.error ?? `HTTP ${res.status}`,
        });
      } else {
        results.push({
          sourceId:   source.id,
          clientId:   source.client_id,
          sourceType: source.source_type,
          synced:     data.synced,
          total:      data.total,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        sourceId:   source.id,
        clientId:   source.client_id,
        sourceType: source.source_type,
        error:      msg,
      });
    }
  }

  const totalSynced  = results.reduce((acc, r) => acc + (r.synced ?? 0), 0);
  const totalErrors  = results.filter((r) => r.error).length;

  console.log(`[cron/sync-sources] Done: ${totalSynced} files synced, ${totalErrors} sources with errors`);

  return NextResponse.json({
    processed: sources.length,
    totalSynced,
    totalErrors,
    results,
    runAt: new Date().toISOString(),
  });
}

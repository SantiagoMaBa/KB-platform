import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { listRawDocuments, listWikiDocuments } from "@/lib/kb";

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId es requerido" }, { status: 400 });
  }

  const [rawDocs, wikiDocs] = await Promise.all([
    listRawDocuments(clientId),
    listWikiDocuments(clientId),
  ]);

  return NextResponse.json({ raw: rawDocs, wiki: wikiDocs });
}

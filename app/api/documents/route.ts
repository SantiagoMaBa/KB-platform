import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { listWikiDocuments } from "@/lib/kb";

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId es requerido" }, { status: 400 });
  }

  // Fetch raw documents with full metadata from DB
  const { data: rawDocs } = await supabase
    .from("documents")
    .select("filename, storage_path, compiled, display_name, description, category, tags")
    .eq("client_id", clientId)
    .order("category", { ascending: true })
    .order("display_name", { ascending: true });

  const raw = (rawDocs ?? []).map((d) => ({
    name:         d.filename,
    path:         d.storage_path,
    compiled:     d.compiled,
    display_name: d.display_name,
    description:  d.description,
    category:     d.category,
    tags:         d.tags,
  }));

  // Wiki files — list from storage
  const wiki = await listWikiDocuments(clientId);

  return NextResponse.json({ raw, wiki });
}

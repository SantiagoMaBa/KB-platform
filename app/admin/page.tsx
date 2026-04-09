"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import {
  Upload,
  FileText,
  Zap,
  CheckCircle,
  Clock,
  Loader2,
  BookOpen,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Trash2,
  Link,
  HardDrive,
  FolderSync,
  CloudOff,
} from "lucide-react";

const CLIENT_ID = "plaza-demo";

// ── Types ────────────────────────────────────────────────────────────────────

interface DocList {
  raw: { name: string; path: string }[];
  wiki: { name: string; path: string }[];
}

interface CompileResult {
  compiled: number;
  total: number;
  results: { filename: string; success: boolean; error?: string }[];
}

interface SyncSource {
  id: string;
  source_type: "gdrive" | "onedrive";
  shared_link: string;
  folder_name: string | null;
  last_sync_at: string | null;
  last_sync_count: number;
  last_sync_error: string | null;
}

interface SyncResult {
  synced: number;
  total: number;
  folderName?: string;
  message?: string;
  results: { filename: string; status: "synced" | "error"; error?: string }[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "Nunca";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

const SOURCE_META = {
  gdrive: {
    label: "Google Drive",
    icon: "G",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    placeholder: "https://drive.google.com/drive/folders/...",
    hint: "Comparte la carpeta con el email del service account antes de sincronizar.",
  },
  onedrive: {
    label: "OneDrive",
    icon: "O",
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
    placeholder: "https://onedrive.live.com/... o https://1drv.ms/...",
    hint: "Asegúrate de que el link sea público o tenga acceso de lectura configurado.",
  },
} as const;

// ── Sync source card ──────────────────────────────────────────────────────────

function SyncSourceCard({
  type,
  source,
  onSave,
  onSync,
  onDelete,
  syncing,
}: {
  type: "gdrive" | "onedrive";
  source: SyncSource | null;
  onSave: (link: string) => Promise<void>;
  onSync: () => Promise<SyncResult | null>;
  onDelete: () => Promise<void>;
  syncing: boolean;
}) {
  const meta = SOURCE_META[type];
  const [link, setLink] = useState(source?.shared_link ?? "");
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSaveAndSync = async () => {
    if (!link.trim()) return;
    setSaving(true);
    await onSave(link.trim());
    setSaving(false);

    const result = await onSync();
    if (result) setLastResult(result);
  };

  const handleSync = async () => {
    const result = await onSync();
    if (result) setLastResult(result);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete();
    setLink("");
    setLastResult(null);
    setDeleting(false);
  };

  const isConfigured = !!source;
  const isLoading = syncing || saving;

  return (
    <div className={`card space-y-4 border-l-4 ${meta.border}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg ${meta.bg} border ${meta.border} flex items-center justify-center shrink-0`}>
            <span className={`font-display font-bold text-sm ${meta.color}`}>
              {meta.icon}
            </span>
          </div>
          <div>
            <p className="font-display font-semibold text-slate-900 text-sm">
              {meta.label}
            </p>
            {isConfigured && source.folder_name && (
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">
                📁 {source.folder_name}
              </p>
            )}
          </div>
        </div>

        {isConfigured && (
          <span className="badge-green shrink-0">Configurado</span>
        )}
      </div>

      {/* Link input */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600">
          Link de carpeta compartida
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={meta.placeholder}
              className="input pl-8 text-xs"
              disabled={isLoading}
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
          {meta.hint}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {!isConfigured || source.shared_link !== link ? (
          <button
            onClick={handleSaveAndSync}
            disabled={!link.trim() || isLoading}
            className="btn-primary text-xs"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FolderSync className="w-3.5 h-3.5" />
            )}
            {isLoading ? "Sincronizando…" : "Guardar y sincronizar"}
          </button>
        ) : (
          <button
            onClick={handleSync}
            disabled={isLoading}
            className="btn-primary text-xs"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {isLoading ? "Sincronizando…" : "Sincronizar ahora"}
          </button>
        )}

        {isConfigured && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn-ghost text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Eliminar
          </button>
        )}
      </div>

      {/* Last sync status */}
      {isConfigured && (
        <div className="pt-3 border-t border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Última sincronización
            </span>
            <span className="text-slate-600 font-medium">
              {formatDate(source.last_sync_at)}
            </span>
          </div>
          {source.last_sync_at && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Archivos sincronizados</span>
              <span className="badge-blue">{source.last_sync_count} archivos</span>
            </div>
          )}
          {source.last_sync_error && (
            <div className="flex items-start gap-1.5 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
              <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
              {source.last_sync_error}
            </div>
          )}
        </div>
      )}

      {/* Inline result after a sync */}
      {lastResult && (
        <div
          className={`rounded-lg px-3 py-2.5 text-xs space-y-1 border ${
            lastResult.synced === lastResult.total
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          <p className="font-semibold">
            {lastResult.message ??
              `${lastResult.synced} de ${lastResult.total} archivos sincronizados`}
          </p>
          {lastResult.results
            .filter((r) => r.status === "error")
            .map((r) => (
              <p key={r.filename} className="opacity-75">
                ❌ {r.filename}: {r.error}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}

// ── Main admin page ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [docs, setDocs] = useState<DocList>({ raw: [], wiki: [] });
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [compileResult, setCompileResult] = useState<CompileResult | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Sync sources
  const [syncSources, setSyncSources] = useState<SyncSource[]>([]);
  const [syncingType, setSyncingType] = useState<"gdrive" | "onedrive" | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/documents?clientId=${CLIENT_ID}`);
      const data = await res.json();
      setDocs(data);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  const fetchSources = useCallback(async () => {
    const res = await fetch(`/api/sync/sources?clientId=${CLIENT_ID}`);
    if (res.ok) setSyncSources(await res.json());
  }, []);

  useEffect(() => {
    fetchDocs();
    fetchSources();
  }, [fetchDocs, fetchSources]);

  // ── Upload ──────────────────────────────────────────────────────────────────

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadStatus(null);

    let uploaded = 0;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("clientId", CLIENT_ID);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) uploaded++;
    }

    setUploadStatus(`${uploaded} de ${files.length} archivo(s) subido(s).`);
    setUploading(false);
    fetchDocs();
  };

  // ── Compile ─────────────────────────────────────────────────────────────────

  const handleCompile = async () => {
    setCompiling(true);
    setCompileResult(null);
    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: CLIENT_ID }),
      });
      setCompileResult(await res.json());
      fetchDocs();
    } finally {
      setCompiling(false);
    }
  };

  // ── Sync sources ────────────────────────────────────────────────────────────

  const saveSource = async (sourceType: "gdrive" | "onedrive", sharedLink: string) => {
    await fetch("/api/sync/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: CLIENT_ID, sourceType, sharedLink }),
    });
    await fetchSources();
  };

  const syncSource = async (sourceType: "gdrive" | "onedrive"): Promise<SyncResult | null> => {
    const src = syncSources.find((s) => s.source_type === sourceType);
    const link = src?.shared_link;
    if (!link) return null;

    setSyncingType(sourceType);
    try {
      const endpoint = sourceType === "gdrive" ? "/api/sync/gdrive" : "/api/sync/onedrive";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: CLIENT_ID, sharedLink: link }),
      });
      const data = await res.json();
      await fetchSources();
      await fetchDocs();
      return data;
    } finally {
      setSyncingType(null);
    }
  };

  const deleteSource = async (sourceType: "gdrive" | "onedrive") => {
    const src = syncSources.find((s) => s.source_type === sourceType);
    if (!src) return;
    await fetch(`/api/sync/sources?id=${src.id}`, { method: "DELETE" });
    await fetchSources();
  };

  const pendingCompile = docs.raw.length - docs.wiki.length;

  return (
    <AppShell>
      <Header
        title="Administrar KB"
        subtitle="Plaza Centro Norte"
        actions={
          <button
            onClick={handleCompile}
            disabled={compiling || docs.raw.length === 0}
            className="btn-primary text-sm"
          >
            {compiling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {compiling ? "Compilando…" : "Compilar KB con IA"}
          </button>
        }
      />

      <div className="flex-1 p-6 space-y-5 overflow-y-auto">
        {/* Compile banner */}
        {compileResult && (
          <div
            className={`flex items-start gap-3 rounded-xl px-4 py-3 border text-sm ${
              compileResult.compiled === compileResult.total
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}
          >
            {compileResult.compiled === compileResult.total ? (
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            )}
            <div>
              <p className="font-semibold">
                {compileResult.compiled === compileResult.total
                  ? "Compilación completada"
                  : "Compilación con errores"}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                {compileResult.compiled} de {compileResult.total} documentos compilados.
              </p>
            </div>
          </div>
        )}

        {/* Row 1: Upload + KB status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Upload */}
          <div className="card space-y-4">
            <div>
              <h2 className="font-display font-semibold text-slate-900 flex items-center gap-2 text-sm">
                <Upload className="w-4 h-4 text-brand-600" />
                Subir documentos
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Archivos{" "}
                <code className="bg-slate-100 px-1 rounded">.md</code> o{" "}
                <code className="bg-slate-100 px-1 rounded">.txt</code> con
                información de la plaza.
              </p>
            </div>

            <label
              className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all duration-150 ${
                dragOver
                  ? "border-brand-400 bg-brand-50"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
            >
              <input
                type="file"
                multiple
                accept=".md,.txt"
                className="sr-only"
                onChange={(e) => handleUpload(e.target.files)}
                disabled={uploading}
              />
              {uploading ? (
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-brand-600" />
                </div>
              )}
              <div className="text-center">
                <p className="text-sm text-slate-700 font-medium">
                  {uploading ? "Subiendo…" : "Arrastra o selecciona archivos"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  .md o .txt — sin límite
                </p>
              </div>
            </label>

            {uploadStatus && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                {uploadStatus}
              </div>
            )}

            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                Los archivos raw no son consultados por el chat hasta compilarlos con IA.
              </p>
            </div>
          </div>

          {/* KB status */}
          <div className="card space-y-5">
            <h2 className="font-display font-semibold text-slate-900 flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4 text-brand-600" />
              Estado de la KB
            </h2>

            {loadingDocs ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando…
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Raw (fuente)
                    </h3>
                    <span className="badge-slate">{docs.raw.length} archivos</span>
                  </div>
                  {docs.raw.length === 0 ? (
                    <p className="text-xs text-slate-400 italic px-1">Sin documentos.</p>
                  ) : (
                    <ul className="space-y-1">
                      {docs.raw.map((d) => {
                        const compiled = docs.wiki.some((w) => w.name === d.name);
                        return (
                          <li key={d.name} className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 bg-slate-50 border border-slate-200">
                            <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate text-slate-600 flex-1">{d.name}</span>
                            {compiled ? (
                              <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                            ) : (
                              <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                      Wiki (usada por el chat)
                    </h3>
                    <span className="badge-green">{docs.wiki.length} artículos</span>
                  </div>
                  {docs.wiki.length === 0 ? (
                    <p className="text-xs text-slate-400 italic px-1">Ningún artículo compilado.</p>
                  ) : (
                    <ul className="space-y-1">
                      {docs.wiki.map((d) => (
                        <li key={d.name} className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 bg-emerald-50 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span className="truncate text-emerald-700 flex-1">{d.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {pendingCompile > 0 && (
                  <button
                    onClick={handleCompile}
                    disabled={compiling}
                    className="btn-primary w-full text-sm"
                  >
                    {compiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Compilar {pendingCompile} pendiente{pendingCompile > 1 ? "s" : ""}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── External sources section ────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-slate-600" />
              <h2 className="font-display font-semibold text-slate-900 text-sm">
                Fuentes externas
              </h2>
            </div>
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">
              Google Drive · OneDrive
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {(["gdrive", "onedrive"] as const).map((type) => {
              const source = syncSources.find((s) => s.source_type === type) ?? null;
              return (
                <SyncSourceCard
                  key={type}
                  type={type}
                  source={source}
                  syncing={syncingType === type}
                  onSave={(link) => saveSource(type, link)}
                  onSync={() => syncSource(type)}
                  onDelete={() => deleteSource(type)}
                />
              );
            })}
          </div>

          {/* Credentials notice */}
          <div className="mt-4 flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <CloudOff className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-700">Las credenciales son requeridas</strong> para que el sync funcione.
              Configura{" "}
              <code className="bg-slate-200 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_JSON</code> y/o{" "}
              <code className="bg-slate-200 px-1 rounded">MICROSOFT_CLIENT_ID / SECRET / TENANT_ID</code>{" "}
              en tu <code className="bg-slate-200 px-1 rounded">.env.local</code>.
              Ver <strong className="text-slate-700">README.md</strong> para instrucciones paso a paso.
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="card">
          <h2 className="font-display font-semibold text-slate-900 text-sm mb-5">
            ¿Cómo funciona?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Subir o sincronizar",
                desc: "Sube archivos .md/.txt manualmente o conecta una carpeta de Google Drive / OneDrive.",
                color: "text-brand-600",
                bg: "bg-brand-50",
                border: "border-brand-200",
              },
              {
                step: "02",
                title: "Compilar con IA",
                desc: "GPT-4o-mini transforma cada documento en un artículo wiki estructurado con alertas y resúmenes.",
                color: "text-amber-600",
                bg: "bg-amber-50",
                border: "border-amber-200",
              },
              {
                step: "03",
                title: "Consultar en el chat",
                desc: "El asistente lee los artículos wiki y responde preguntas con contexto completo de la plaza.",
                color: "text-emerald-600",
                bg: "bg-emerald-50",
                border: "border-emerald-200",
              },
            ].map((s, i) => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className={`w-8 h-8 rounded-lg ${s.bg} border ${s.border} flex items-center justify-center shrink-0`}>
                  <span className={`font-display font-bold text-xs ${s.color}`}>{s.step}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{s.title}</p>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">{s.desc}</p>
                </div>
                {i < 2 && (
                  <ArrowRight className="w-4 h-4 text-slate-300 shrink-0 mt-2 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

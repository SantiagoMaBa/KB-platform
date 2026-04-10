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
  X,
  Tag,
  ChevronDown,
  ChevronUp,
  FileSearch,
} from "lucide-react";

const CLIENT_ID   = "plaza-demo";
const CLIENT_NAME = "Plaza Centro Norte";

const CATEGORIES = [
  "Contratos",
  "Pagos",
  "Reglamentos",
  "Tarifas",
  "Permisos",
  "Operaciones",
  "Otro",
] as const;

type Category = (typeof CATEGORIES)[number];

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocMeta {
  name: string;
  path: string;
  display_name?: string | null;
  description?: string | null;
  category?: string | null;
  tags?: string | null;
  compiled?: boolean;
}

interface DocList {
  raw: DocMeta[];
  wiki: DocMeta[];
}

interface StagedFile {
  file: File;
  displayName: string;
  description: string;
  category: Category | "";
  tags: string;
  expanded: boolean;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "Nunca";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

const CATEGORY_COLOR: Record<string, string> = {
  Contratos:   "bg-blue-50   text-blue-700   border-blue-200",
  Pagos:       "bg-green-50  text-green-700  border-green-200",
  Reglamentos: "bg-purple-50 text-purple-700 border-purple-200",
  Tarifas:     "bg-orange-50 text-orange-700 border-orange-200",
  Permisos:    "bg-rose-50   text-rose-700   border-rose-200",
  Operaciones: "bg-slate-100 text-slate-700  border-slate-200",
  Otro:        "bg-slate-100 text-slate-600  border-slate-200",
};

const SOURCE_META = {
  gdrive: {
    label: "Google Drive",
    icon: "G",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    placeholder: "https://drive.google.com/drive/folders/…",
    hint: "Comparte la carpeta con el email del service account antes de sincronizar.",
  },
  onedrive: {
    label: "OneDrive",
    icon: "O",
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
    placeholder: "https://onedrive.live.com/… o https://1drv.ms/…",
    hint: "Asegúrate de que el link sea público o tenga acceso de lectura configurado.",
  },
} as const;

// ── Metadata form (per-staged-file) ───────────────────────────────────────────

function StagedFileRow({
  staged,
  index,
  onChange,
  onRemove,
}: {
  staged: StagedFile;
  index: number;
  onChange: (index: number, patch: Partial<StagedFile>) => void;
  onRemove: (index: number) => void;
}) {
  const ext = staged.file.name.split(".").pop()?.toUpperCase();

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* Row header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => onChange(index, { expanded: !staged.expanded })}
      >
        <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-brand-600">{ext}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">
            {staged.displayName || staged.file.name}
          </p>
          <p className="text-xs text-slate-400">
            {staged.file.name}
            {staged.category && (
              <span className={`ml-2 badge ${CATEGORY_COLOR[staged.category] ?? CATEGORY_COLOR.Otro}`}>
                {staged.category}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(index); }}
            className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {staged.expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Metadata form */}
      {staged.expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Display name */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nombre descriptivo
            </label>
            <input
              type="text"
              value={staged.displayName}
              onChange={(e) => onChange(index, { displayName: e.target.value })}
              placeholder={`ej: "Contratos de locatarios 2025"`}
              className="input text-sm"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Categoría
            </label>
            <select
              value={staged.category}
              onChange={(e) => onChange(index, { category: e.target.value as Category | "" })}
              className="input text-sm"
            >
              <option value="">Sin categoría</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Tags
              <span className="text-slate-400 font-normal">(separados por coma)</span>
            </label>
            <input
              type="text"
              value={staged.tags}
              onChange={(e) => onChange(index, { tags: e.target.value })}
              placeholder="locatarios, renta, 2025"
              className="input text-sm"
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Descripción corta
            </label>
            <textarea
              value={staged.description}
              onChange={(e) => onChange(index, { description: e.target.value })}
              placeholder={`ej: "Contratos vigentes, fechas de vencimiento, montos de renta"`}
              rows={2}
              className="input text-sm resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

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

  const isLoading = syncing || saving;

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
  const linkChanged = source?.shared_link !== link;

  return (
    <div className={`card space-y-4 border-l-4 ${meta.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg ${meta.bg} border ${meta.border} flex items-center justify-center shrink-0`}>
            <span className={`font-display font-bold text-sm ${meta.color}`}>{meta.icon}</span>
          </div>
          <div>
            <p className="font-display font-semibold text-slate-900 text-sm">{meta.label}</p>
            {isConfigured && source.folder_name && (
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">
                📁 {source.folder_name}
              </p>
            )}
          </div>
        </div>
        {isConfigured && <span className="badge-green shrink-0">Configurado</span>}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-600">Link de carpeta compartida</label>
        <div className="relative">
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
        <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
          {meta.hint}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {!isConfigured || linkChanged ? (
          <button onClick={handleSaveAndSync} disabled={!link.trim() || isLoading} className="btn-primary text-xs">
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderSync className="w-3.5 h-3.5" />}
            {isLoading ? "Sincronizando…" : "Guardar y sincronizar"}
          </button>
        ) : (
          <button onClick={handleSync} disabled={isLoading} className="btn-primary text-xs">
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {isLoading ? "Sincronizando…" : "Sincronizar ahora"}
          </button>
        )}
        {isConfigured && (
          <button onClick={handleDelete} disabled={deleting} className="btn-ghost text-xs text-red-500 hover:text-red-700 hover:bg-red-50">
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Eliminar
          </button>
        )}
      </div>

      {isConfigured && (
        <div className="pt-3 border-t border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Última sincronización
            </span>
            <span className="text-slate-600 font-medium">{formatDate(source.last_sync_at)}</span>
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

      {lastResult && (
        <div className={`rounded-lg px-3 py-2.5 text-xs space-y-1 border ${
          lastResult.synced === lastResult.total
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-amber-50 border-amber-200 text-amber-800"
        }`}>
          <p className="font-semibold">
            {lastResult.message ?? `${lastResult.synced} de ${lastResult.total} archivos sincronizados`}
          </p>
          {lastResult.results.filter((r) => r.status === "error").map((r) => (
            <p key={r.filename} className="opacity-75">❌ {r.filename}: {r.error}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [docs, setDocs] = useState<DocList>({ raw: [], wiki: [] });
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [compiling, setCompiling] = useState(false);
  const [compileResult, setCompileResult] = useState<CompileResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Staging area
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ name: string; ok: boolean }[] | null>(null);

  // Sync sources
  const [syncSources, setSyncSources] = useState<SyncSource[]>([]);
  const [syncingType, setSyncingType] = useState<"gdrive" | "onedrive" | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────────────

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

  // ── Staging ──────────────────────────────────────────────────────────────────

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: StagedFile[] = Array.from(fileList)
      .filter((f) => f.name.endsWith(".md") || f.name.endsWith(".txt"))
      .filter((f) => !staged.some((s) => s.file.name === f.name))
      .map((f) => ({
        file:        f,
        displayName: f.name.replace(/\.(md|txt)$/i, "").replace(/[-_]/g, " "),
        description: "",
        category:    "",
        tags:        "",
        expanded:    true,
      }));
    setStaged((prev) => [...prev, ...newFiles]);
  };

  const updateStaged = (index: number, patch: Partial<StagedFile>) => {
    setStaged((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const removeStaged = (index: number) => {
    setStaged((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Upload staged files ──────────────────────────────────────────────────────

  const handleUploadAll = async () => {
    if (staged.length === 0) return;
    setUploading(true);
    setUploadResults(null);

    const results: { name: string; ok: boolean }[] = [];

    for (const s of staged) {
      const fd = new FormData();
      fd.append("file",        s.file);
      fd.append("clientId",    CLIENT_ID);
      fd.append("clientName",  CLIENT_NAME);
      fd.append("displayName", s.displayName);
      fd.append("description", s.description);
      fd.append("category",    s.category);
      fd.append("tags",        s.tags);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      results.push({ name: s.file.name, ok: res.ok });
    }

    setUploadResults(results);
    setStaged([]);
    setUploading(false);
    fetchDocs();
  };

  // ── Compile ──────────────────────────────────────────────────────────────────

  const handleCompile = async () => {
    setCompiling(true);
    setCompileResult(null);
    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: CLIENT_ID, clientName: CLIENT_NAME }),
      });
      setCompileResult(await res.json());
      fetchDocs();
    } finally {
      setCompiling(false);
    }
  };

  // ── Sync sources ─────────────────────────────────────────────────────────────

  const saveSource = async (type: "gdrive" | "onedrive", link: string) => {
    await fetch("/api/sync/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: CLIENT_ID, sourceType: type, sharedLink: link }),
    });
    await fetchSources();
  };

  const syncSource = async (type: "gdrive" | "onedrive"): Promise<SyncResult | null> => {
    const src = syncSources.find((s) => s.source_type === type);
    if (!src?.shared_link) return null;
    setSyncingType(type);
    try {
      const endpoint = type === "gdrive" ? "/api/sync/gdrive" : "/api/sync/onedrive";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: CLIENT_ID, sharedLink: src.shared_link }),
      });
      await fetchSources();
      await fetchDocs();
      return res.json();
    } finally {
      setSyncingType(null);
    }
  };

  const deleteSource = async (type: "gdrive" | "onedrive") => {
    const src = syncSources.find((s) => s.source_type === type);
    if (!src) return;
    await fetch(`/api/sync/sources?id=${src.id}`, { method: "DELETE" });
    await fetchSources();
  };

  const pendingCompile = docs.raw.length - docs.wiki.length;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <Header
        title="Administrar KB"
        subtitle={CLIENT_NAME}
        actions={
          <button
            onClick={handleCompile}
            disabled={compiling || docs.raw.length === 0}
            className="btn-primary text-sm"
          >
            {compiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {compiling ? "Compilando…" : "Compilar KB con IA"}
          </button>
        }
      />

      <div className="flex-1 p-6 space-y-5 overflow-y-auto">

        {/* Compile banner */}
        {compileResult && (
          <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border text-sm ${
            compileResult.compiled === compileResult.total
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}>
            {compileResult.compiled === compileResult.total
              ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />}
            <div>
              <p className="font-semibold">
                {compileResult.compiled === compileResult.total
                  ? "Compilación completada — index.md actualizado"
                  : "Compilación con errores parciales"}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                {compileResult.compiled} de {compileResult.total} documentos compilados.
              </p>
            </div>
          </div>
        )}

        {/* Upload results */}
        {uploadResults && (
          <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border text-sm ${
            uploadResults.every((r) => r.ok)
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}>
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div>
              <p className="font-semibold">
                {uploadResults.filter((r) => r.ok).length} de {uploadResults.length} archivos subidos
              </p>
              {uploadResults.filter((r) => !r.ok).map((r) => (
                <p key={r.name} className="text-xs opacity-80">❌ {r.name}</p>
              ))}
            </div>
          </div>
        )}

        {/* ── Upload + KB status ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Upload + staging */}
          <div className="card space-y-4">
            <div>
              <h2 className="font-display font-semibold text-slate-900 flex items-center gap-2 text-sm">
                <Upload className="w-4 h-4 text-brand-600" />
                Subir documentos
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Archivos <code className="bg-slate-100 px-1 rounded">.md</code> o{" "}
                <code className="bg-slate-100 px-1 rounded">.txt</code>.
                Agrega metadata antes de subir.
              </p>
            </div>

            {/* Drop zone */}
            <label
              className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all duration-150 ${
                dragOver
                  ? "border-brand-400 bg-brand-50"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
            >
              <input
                type="file"
                multiple
                accept=".md,.txt"
                className="sr-only"
                onChange={(e) => addFiles(e.target.files)}
              />
              <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center">
                <Upload className="w-5 h-5 text-brand-600" />
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-700 font-medium">Arrastra o selecciona archivos</p>
                <p className="text-xs text-slate-400 mt-0.5">.md o .txt</p>
              </div>
            </label>

            {/* Staging area */}
            {staged.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    {staged.length} archivo{staged.length > 1 ? "s" : ""} pendiente{staged.length > 1 ? "s" : ""}
                  </p>
                  <button
                    onClick={() => setStaged((prev) => prev.map((s) => ({ ...s, expanded: false })))}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Colapsar todos
                  </button>
                </div>

                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5">
                  {staged.map((s, i) => (
                    <StagedFileRow
                      key={s.file.name}
                      staged={s}
                      index={i}
                      onChange={updateStaged}
                      onRemove={removeStaged}
                    />
                  ))}
                </div>

                <button
                  onClick={handleUploadAll}
                  disabled={uploading}
                  className="btn-primary w-full"
                >
                  {uploading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Upload className="w-4 h-4" />}
                  {uploading
                    ? "Subiendo…"
                    : `Subir ${staged.length} archivo${staged.length > 1 ? "s" : ""}`}
                </button>
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
                {/* Raw */}
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
                    <ul className="space-y-1.5">
                      {docs.raw.map((d) => {
                        const isCompiled = docs.wiki.some((w) => w.name === d.name);
                        return (
                          <li key={d.name} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 space-y-1">
                            <div className="flex items-center gap-2">
                              <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="text-xs font-medium text-slate-700 flex-1 truncate">
                                {d.display_name ?? d.name}
                              </span>
                              {isCompiled
                                ? <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                                : <Clock className="w-3 h-3 text-amber-500 shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 pl-5 flex-wrap">
                              {d.category && (
                                <span className={`badge text-[10px] ${CATEGORY_COLOR[d.category] ?? CATEGORY_COLOR.Otro}`}>
                                  {d.category}
                                </span>
                              )}
                              {d.description && (
                                <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                  {d.description}
                                </span>
                              )}
                            </div>
                            {d.tags && (
                              <div className="flex items-center gap-1 pl-5 flex-wrap">
                                <Tag className="w-2.5 h-2.5 text-slate-300" />
                                {d.tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                                  <span key={t} className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Wiki */}
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

                {/* index.md note */}
                <div className="flex items-start gap-2 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2.5">
                  <FileSearch className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-brand-700 leading-relaxed">
                    <strong>index.md</strong> se regenera automáticamente en cada upload y compilación.
                    El asistente lo lee primero en cada consulta.
                  </p>
                </div>

                {pendingCompile > 0 && (
                  <button onClick={handleCompile} disabled={compiling} className="btn-primary w-full text-sm">
                    {compiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Compilar {pendingCompile} pendiente{pendingCompile > 1 ? "s" : ""}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── External sources ─────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-slate-600" />
              <h2 className="font-display font-semibold text-slate-900 text-sm">Fuentes externas</h2>
            </div>
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">Google Drive · OneDrive</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {(["gdrive", "onedrive"] as const).map((type) => (
              <SyncSourceCard
                key={type}
                type={type}
                source={syncSources.find((s) => s.source_type === type) ?? null}
                syncing={syncingType === type}
                onSave={(link) => saveSource(type, link)}
                onSync={() => syncSource(type)}
                onDelete={() => deleteSource(type)}
              />
            ))}
          </div>

          <div className="mt-4 flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <CloudOff className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-700">Credenciales requeridas:</strong>{" "}
              <code className="bg-slate-200 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_JSON</code> y/o{" "}
              <code className="bg-slate-200 px-1 rounded">MICROSOFT_CLIENT_ID/SECRET/TENANT_ID</code>{" "}
              en <code className="bg-slate-200 px-1 rounded">.env.local</code>. Ver <strong className="text-slate-700">README.md</strong>.
            </p>
          </div>
        </div>

        {/* ── How it works ──────────────────────────────────────────────────── */}
        <div className="card">
          <h2 className="font-display font-semibold text-slate-900 text-sm mb-5">¿Cómo funciona?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
            {[
              {
                step: "01",
                title: "Subir con metadata",
                desc: "Agrega nombre descriptivo, categoría, tags y descripción antes de subir.",
                color: "text-brand-600",
                bg: "bg-brand-50",
                border: "border-brand-200",
              },
              {
                step: "02",
                title: "Index generado",
                desc: "Se crea index.md automáticamente con el catálogo de documentos y su metadata.",
                color: "text-sky-600",
                bg: "bg-sky-50",
                border: "border-sky-200",
              },
              {
                step: "03",
                title: "Compilar con IA",
                desc: "GPT-4o-mini transforma cada documento en un artículo wiki usando la metadata como contexto.",
                color: "text-amber-600",
                bg: "bg-amber-50",
                border: "border-amber-200",
              },
              {
                step: "04",
                title: "Chat inteligente",
                desc: "El asistente lee el índice primero, sabe qué existe, y responde con precisión.",
                color: "text-emerald-600",
                bg: "bg-emerald-50",
                border: "border-emerald-200",
              },
            ].map((s, i) => (
              <div key={s.step} className="flex gap-3 items-start">
                <div className={`w-8 h-8 rounded-lg ${s.bg} border ${s.border} flex items-center justify-center shrink-0`}>
                  <span className={`font-display font-bold text-xs ${s.color}`}>{s.step}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{s.title}</p>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">{s.desc}</p>
                </div>
                {i < 3 && <ArrowRight className="w-4 h-4 text-slate-300 shrink-0 mt-2 hidden sm:block" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

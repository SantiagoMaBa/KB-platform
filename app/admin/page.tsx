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
  description: string | null;
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
    hint: "La carpeta debe ser pública (\"Cualquiera con el link puede ver\"). Requiere GOOGLE_API_KEY en variables de entorno.",
  },
  onedrive: {
    label: "OneDrive",
    icon: "O",
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
    placeholder: "https://onedrive.live.com/… o https://1drv.ms/…",
    hint: "La carpeta debe ser pública (\"Cualquiera con el link puede ver\"). No requiere credenciales de Azure.",
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

// ── Registered sync source row ────────────────────────────────────────────────

function SyncSourceRow({
  source,
  syncing,
  onSync,
  onUpdate,
  onDelete,
}: {
  source: SyncSource;
  syncing: boolean;
  onSync: () => Promise<SyncResult | null>;
  onUpdate: (patch: { sharedLink?: string; description?: string }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const meta = SOURCE_META[source.source_type];
  const [editing, setEditing] = useState(false);
  const [editLink, setEditLink] = useState(source.shared_link);
  const [editDesc, setEditDesc] = useState(source.description ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const handleSync = async () => {
    const result = await onSync();
    if (result) setLastResult(result);
  };

  const handleSave = async () => {
    setSaving(true);
    await onUpdate({ sharedLink: editLink.trim(), description: editDesc.trim() });
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete();
  };

  return (
    <div className={`border rounded-xl overflow-hidden bg-white border-l-4 ${meta.border}`}>
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className={`w-8 h-8 rounded-lg ${meta.bg} border ${meta.border} flex items-center justify-center shrink-0 mt-0.5`}>
          <span className={`font-display font-bold text-xs ${meta.color}`}>{meta.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">{meta.label}</span>
            {source.folder_name && (
              <span className="text-xs text-slate-400 truncate">📁 {source.folder_name}</span>
            )}
          </div>
          {!editing && (
            <>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">{source.shared_link}</p>
              {source.description && (
                <p className="text-xs text-slate-600 mt-1 leading-snug">{source.description}</p>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => { setEditing(!editing); setEditLink(source.shared_link); setEditDesc(source.description ?? ""); }}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Editar"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="p-1.5 rounded hover:bg-sky-50 text-slate-400 hover:text-sky-600 transition-colors disabled:opacity-50"
            title="Sincronizar"
          >
            {syncing
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
            title="Eliminar"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-2.5">
          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">Link de carpeta</label>
            <div className="relative">
              <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input
                type="url"
                value={editLink}
                onChange={(e) => setEditLink(e.target.value)}
                className="input pl-7 text-xs"
                placeholder={meta.placeholder}
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">Descripción</label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={2}
              className="input text-xs resize-none"
              placeholder="ej: Contratos vigentes de locatarios, renovaciones 2025"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !editLink.trim()} className="btn-primary text-xs">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              Guardar
            </button>
            <button onClick={() => setEditing(false)} className="btn-ghost text-xs">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="px-4 pb-3 flex items-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDate(source.last_sync_at)}
        </span>
        {source.last_sync_at && (
          <span className="badge-blue text-[10px]">{source.last_sync_count} archivos</span>
        )}
        {source.last_sync_error && (
          <span className="text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {source.last_sync_error}
          </span>
        )}
      </div>

      {/* Sync result */}
      {lastResult && (
        <div className={`mx-4 mb-3 rounded-lg px-3 py-2 text-xs border ${
          lastResult.synced === lastResult.total
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-amber-50 border-amber-200 text-amber-800"
        }`}>
          <p className="font-semibold">
            {lastResult.message ?? `${lastResult.synced} / ${lastResult.total} archivos sincronizados`}
          </p>
          {lastResult.results?.filter((r) => r.status === "error").map((r) => (
            <p key={r.filename} className="opacity-75 mt-0.5">❌ {r.filename}: {r.error}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add source form ────────────────────────────────────────────────────────────

function AddSourceForm({
  onAdd,
  onCancel,
}: {
  onAdd: (type: "gdrive" | "onedrive", link: string, description: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [type, setType] = useState<"gdrive" | "onedrive">("onedrive");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const meta = SOURCE_META[type];

  const handleAdd = async () => {
    if (!link.trim()) return;
    setSaving(true);
    await onAdd(type, link.trim(), description.trim());
    setSaving(false);
  };

  return (
    <div className="border border-brand-200 rounded-xl bg-brand-50/30 p-4 space-y-3">
      <p className="text-xs font-semibold text-slate-700">Nueva fuente externa</p>

      {/* Type selector */}
      <div className="flex gap-2">
        {(["onedrive", "gdrive"] as const).map((t) => {
          const m = SOURCE_META[t];
          return (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                type === t
                  ? `${m.bg} ${m.border} ${m.color}`
                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${type === t ? "" : "bg-slate-100 text-slate-500"} ${type === t ? m.bg : ""}`}>
                {m.icon}
              </span>
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Link */}
      <div>
        <label className="text-[11px] font-medium text-slate-500 mb-1 block">Link de carpeta compartida</label>
        <div className="relative">
          <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="input pl-7 text-xs"
            placeholder={meta.placeholder}
            autoFocus
          />
        </div>
        <p className="text-[11px] text-slate-400 mt-1 flex items-start gap-1">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
          {meta.hint}
        </p>
      </div>

      {/* Description */}
      <div>
        <label className="text-[11px] font-medium text-slate-500 mb-1 block">
          Descripción <span className="text-slate-400 font-normal">(para qué sirve esta carpeta)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="input text-xs resize-none"
          placeholder="ej: Contratos vigentes de locatarios, renovaciones y acuerdos especiales 2025"
        />
      </div>

      <div className="flex gap-2">
        <button onClick={handleAdd} disabled={saving || !link.trim()} className="btn-primary text-xs">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderSync className="w-3 h-3" />}
          {saving ? "Guardando…" : "Agregar fuente"}
        </button>
        <button onClick={onCancel} className="btn-ghost text-xs">
          Cancelar
        </button>
      </div>
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
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [showAddSource, setShowAddSource] = useState(false);

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

  const ACCEPTED = [".md", ".txt", ".xlsx", ".csv"];
  const isAccepted = (name: string) => ACCEPTED.some((ext) => name.toLowerCase().endsWith(ext));

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: StagedFile[] = Array.from(fileList)
      .filter((f) => isAccepted(f.name))
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

  const addSource = async (type: "gdrive" | "onedrive", link: string, description: string) => {
    await fetch("/api/sync/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: CLIENT_ID, sourceType: type, sharedLink: link, description }),
    });
    await fetchSources();
    setShowAddSource(false);
  };

  const updateSource = async (id: string, patch: { sharedLink?: string; description?: string }) => {
    await fetch("/api/sync/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    await fetchSources();
  };

  const syncSource = async (id: string): Promise<SyncResult | null> => {
    const src = syncSources.find((s) => s.id === id);
    if (!src?.shared_link) return null;
    setSyncingId(id);
    try {
      const endpoint = src.source_type === "gdrive" ? "/api/sync/gdrive" : "/api/sync/onedrive";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: CLIENT_ID, sharedLink: src.shared_link, sourceId: id }),
      });
      const data = await res.json();
      await fetchSources();
      await fetchDocs();
      if (!res.ok) return null;
      return data;
    } finally {
      setSyncingId(null);
    }
  };

  const deleteSource = async (id: string) => {
    await fetch(`/api/sync/sources?id=${id}`, { method: "DELETE" });
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
                <code className="bg-slate-100 px-1 rounded">.md</code>{" "}
                <code className="bg-slate-100 px-1 rounded">.txt</code>{" "}
                <code className="bg-slate-100 px-1 rounded">.xlsx</code>{" "}
                <code className="bg-slate-100 px-1 rounded">.csv</code>.
                Excel y CSV se convierten a Markdown automáticamente.
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
                accept=".md,.txt,.xlsx,.csv"
                className="sr-only"
                onChange={(e) => addFiles(e.target.files)}
              />
              <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center">
                <Upload className="w-5 h-5 text-brand-600" />
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-700 font-medium">Arrastra o selecciona archivos</p>
                <p className="text-xs text-slate-400 mt-0.5">.md · .txt · .xlsx · .csv</p>
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
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center space-y-1.5">
                      <p className="text-xs font-medium text-slate-600">Aún no hay documentos</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Arrastra archivos al área de subida para comenzar.
                        Una vez subidos aparecerán aquí y podrás compilarlos con IA.
                      </p>
                    </div>
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
            {!showAddSource && (
              <button
                onClick={() => setShowAddSource(true)}
                className="btn-primary text-xs"
              >
                <FolderSync className="w-3.5 h-3.5" />
                Agregar fuente
              </button>
            )}
          </div>

          <div className="space-y-3">
            {showAddSource && (
              <AddSourceForm
                onAdd={addSource}
                onCancel={() => setShowAddSource(false)}
              />
            )}

            {syncSources.length === 0 && !showAddSource ? (
              <div className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 rounded-xl py-10 text-center">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Sin fuentes externas</p>
                  <p className="text-xs text-slate-400 mt-0.5">Conecta carpetas de Google Drive o OneDrive para sincronizar documentos.</p>
                </div>
                <button onClick={() => setShowAddSource(true)} className="btn-primary text-xs">
                  <FolderSync className="w-3.5 h-3.5" />
                  Agregar primera fuente
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {syncSources.map((src) => (
                  <SyncSourceRow
                    key={src.id}
                    source={src}
                    syncing={syncingId === src.id}
                    onSync={() => syncSource(src.id)}
                    onUpdate={(patch) => updateSource(src.id, patch)}
                    onDelete={() => deleteSource(src.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <span className="text-blue-600 font-bold text-xs mt-0.5 shrink-0">G</span>
              <p className="text-xs text-blue-800 leading-relaxed">
                <strong>Google Drive:</strong> agrega{" "}
                <code className="bg-blue-100 px-1 rounded">GOOGLE_API_KEY</code>{" "}
                en variables de entorno. La carpeta debe ser pública.{" "}
                <span className="opacity-70">Obtén la key gratis en Google Cloud Console → APIs & Services → Credentials.</span>
              </p>
            </div>
            <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
              <span className="text-sky-600 font-bold text-xs mt-0.5 shrink-0">O</span>
              <p className="text-xs text-sky-800 leading-relaxed">
                <strong>OneDrive:</strong> no requiere credenciales de Azure.{" "}
                Solo asegúrate de que la carpeta compartida sea pública{" "}
                <span className="opacity-70">("Cualquiera con el link puede ver").</span>
              </p>
            </div>
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

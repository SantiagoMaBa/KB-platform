"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Upload, Loader2, X, Tag, ChevronDown, ChevronUp, CheckCircle,
  AlertCircle, FolderSync, RefreshCw, Trash2, Link, HardDrive,
  Zap, Clock,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = "Contratos" | "Pagos" | "Reglamentos" | "Tarifas" | "Permisos" | "Operaciones" | "Otro";

const CATEGORIES: Category[] = ["Contratos", "Pagos", "Reglamentos", "Tarifas", "Permisos", "Operaciones", "Otro"];

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
  gdrive:   { label: "Google Drive", icon: "G", color: "text-blue-600", bg: "bg-blue-50",  border: "border-blue-200", placeholder: "https://drive.google.com/drive/folders/…" },
  onedrive: { label: "OneDrive",     icon: "O", color: "text-sky-600",  bg: "bg-sky-50",   border: "border-sky-200",  placeholder: "https://onedrive.live.com/… o https://1drv.ms/…" },
} as const;

type SourceType = "gdrive" | "onedrive";

interface SyncSource {
  id: string; source_type: SourceType; name: string | null;
  shared_link: string; description: string | null; folder_name: string | null;
  last_sync_at: string | null; last_sync_count: number; last_sync_error: string | null;
  auto_sync: boolean; sync_interval_hours: number;
}

interface SyncResult {
  synced: number; total: number;
  results: { filename: string; status: "synced" | "error"; error?: string }[];
}

interface StagedFile {
  file: File; displayName: string; description: string;
  category: Category | ""; tags: string; expanded: boolean;
}

function formatDate(iso: string | null) {
  if (!iso) return "Nunca";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

// ── Staged file row ───────────────────────────────────────────────────────────

function StagedFileRow({ staged, index, onChange, onRemove }: {
  staged: StagedFile; index: number;
  onChange: (i: number, patch: Partial<StagedFile>) => void;
  onRemove: (i: number) => void;
}) {
  const ext = staged.file.name.split(".").pop()?.toUpperCase();
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50"
        onClick={() => onChange(index, { expanded: !staged.expanded })}
      >
        <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-brand-600">{ext}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{staged.displayName || staged.file.name}</p>
          <p className="text-xs text-slate-400">{staged.file.name}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onRemove(index); }} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
            <X className="w-3.5 h-3.5" />
          </button>
          {staged.expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>
      {staged.expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre descriptivo</label>
            <input type="text" value={staged.displayName} onChange={(e) => onChange(index, { displayName: e.target.value })} className="input text-sm w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Categoría</label>
            <select value={staged.category} onChange={(e) => onChange(index, { category: e.target.value as Category | "" })} className="input text-sm w-full">
              <option value="">Sin categoría</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Tags <span className="text-slate-400 font-normal">(separados por coma)</span>
            </label>
            <input type="text" value={staged.tags} onChange={(e) => onChange(index, { tags: e.target.value })} placeholder="contrato, 2025, locatario" className="input text-sm w-full" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Descripción corta</label>
            <textarea value={staged.description} onChange={(e) => onChange(index, { description: e.target.value })} rows={2} className="input text-sm resize-none w-full" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sync source row ───────────────────────────────────────────────────────────

function SyncSourceRow({ source, syncing, onSync, onUpdate, onDelete }: {
  source: SyncSource; syncing: boolean;
  onSync: () => Promise<SyncResult | null>;
  onUpdate: (patch: { name?: string | undefined; sharedLink?: string; description?: string; autoSync?: boolean }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const meta = SOURCE_META[source.source_type];
  const [editing, setEditing]   = useState(false);
  const [editName, setEditName] = useState(source.name ?? undefined);
  const [editLink, setEditLink] = useState(source.shared_link);
  const [editDesc, setEditDesc] = useState(source.description ?? "");
  const [editAutoSync, setEditAutoSync] = useState(source.auto_sync);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  async function handleSave() {
    setSaving(true);
    await onUpdate({
      name:      editName?.trim() || undefined,
      sharedLink: editLink.trim(),
      description: editDesc.trim(),
      autoSync:   editAutoSync,
    });
    setSaving(false); setEditing(false);
  }

  async function handleSync() {
    const r = await onSync();
    if (r) setLastResult(r);
  }

  return (
    <div className={`border rounded-xl overflow-hidden bg-white border-l-4 ${meta.border}`}>
      <div className="flex items-start gap-3 px-4 py-3">
        <div className={`w-8 h-8 rounded-lg ${meta.bg} border ${meta.border} flex items-center justify-center shrink-0 mt-0.5`}>
          <span className={`font-bold text-xs ${meta.color}`}>{meta.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">{meta.label}</span>
            {source.name && <span className="text-xs text-slate-500">{source.name}</span>}
            {source.folder_name && <span className="text-xs text-slate-400 truncate">📁 {source.folder_name}</span>}
          </div>
          {!editing && (
            <>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">{source.shared_link}</p>
              {source.description && <p className="text-xs text-slate-600 mt-1">{source.description}</p>}
              {source.auto_sync && (
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Auto-sync activo
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => { setEditing(!editing); setEditLink(source.shared_link); setEditDesc(source.description ?? ""); }} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button onClick={handleSync} disabled={syncing} className="p-1.5 rounded hover:bg-sky-50 text-slate-400 hover:text-sky-600 disabled:opacity-50">
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => { setDeleting(true); onDelete(); }} disabled={deleting} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 disabled:opacity-50">
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {editing && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-2.5">
          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">Nombre de la fuente</label>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="input text-xs w-full" placeholder="Contratos locatarios, Reportes de ventas…" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">Link de carpeta</label>
            <div className="relative">
              <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input type="url" value={editLink} onChange={(e) => setEditLink(e.target.value)} className="input pl-7 text-xs w-full" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">Descripción / propósito</label>
            <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} className="input text-xs resize-none w-full" placeholder="Para qué sirve esta fuente, qué tipo de archivos contiene…" />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditAutoSync(!editAutoSync)}
              className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${editAutoSync ? "bg-brand-600" : "bg-slate-200"}`}
            >
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${editAutoSync ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
            <span className="text-xs text-slate-700 font-medium">Sync automático</span>
            <span className="text-[11px] text-slate-400">(diario, 8am UTC)</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !editLink.trim()} className="btn-primary text-xs">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              Guardar
            </button>
            <button onClick={() => setEditing(false)} className="btn-ghost text-xs">Cancelar</button>
          </div>
        </div>
      )}

      <div className="px-4 pb-3 flex items-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(source.last_sync_at)}</span>
        {source.last_sync_at && <span className="badge-blue text-[10px]">{source.last_sync_count} archivos</span>}
        {source.last_sync_error && <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{source.last_sync_error}</span>}
      </div>

      {lastResult && (
        <div className={`mx-4 mb-3 rounded-lg px-3 py-2 text-xs border ${
          lastResult.synced === lastResult.total
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-amber-50 border-amber-200 text-amber-800"
        }`}>
          <p className="font-semibold">{lastResult.synced} / {lastResult.total} archivos sincronizados</p>
          {lastResult.results?.filter((r) => r.status === "error").map((r) => (
            <p key={r.filename} className="opacity-75 mt-0.5">❌ {r.filename}: {r.error}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export default function FuentesTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [staged, setStaged]       = useState<StagedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ name: string; ok: boolean }[] | null>(null);
  const [dragOver, setDragOver]   = useState(false);
  const [compiling, setCompiling] = useState(false);

  const [syncSources, setSyncSources] = useState<SyncSource[]>([]);
  const [syncingId, setSyncingId]     = useState<string | null>(null);
  const [showAddSource, setShowAddSource] = useState(false);
  const [newType, setNewType]     = useState<SourceType>("onedrive");
  const [newName, setNewName]     = useState("");
  const [newLink, setNewLink]     = useState("");
  const [newDesc, setNewDesc]     = useState("");
  const [addingSrc, setAddingSrc] = useState(false);

  const fetchSources = useCallback(async () => {
    const res = await fetch(`/api/sync/sources?clientId=${clientId}`);
    if (res.ok) setSyncSources(await res.json());
  }, [clientId]);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  // ── Upload ─────────────────────────────────────────────────────────────────

  const ACCEPTED = [".md",".txt",".pdf",".xlsx",".csv",".docx"];
  const isAccepted = (name: string) => ACCEPTED.some((e) => name.toLowerCase().endsWith(e));

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: StagedFile[] = Array.from(fileList)
      .filter((f) => isAccepted(f.name) && !staged.some((s) => s.file.name === f.name))
      .map((f) => ({ file: f, displayName: f.name.replace(/\.(md|txt)$/i,"").replace(/[-_]/g," "), description: "", category: "", tags: "", expanded: true }));
    setStaged((p) => [...p, ...newFiles]);
  };

  const handleUploadAll = async () => {
    if (!staged.length) return;
    setUploading(true); setUploadResults(null);
    const results: { name: string; ok: boolean }[] = [];

    for (const s of staged) {
      const fd = new FormData();
      fd.append("file", s.file); fd.append("clientId", clientId); fd.append("clientName", clientName);
      fd.append("displayName", s.displayName); fd.append("description", s.description);
      fd.append("category", s.category); fd.append("tags", s.tags);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      results.push({ name: s.file.name, ok: res.ok });
    }

    setUploadResults(results); setStaged([]); setUploading(false);
  };

  const handleCompile = async () => {
    setCompiling(true);
    await fetch("/api/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientName }),
    });
    setCompiling(false);
  };

  // ── Sync sources ───────────────────────────────────────────────────────────

  const addSource = async () => {
    if (!newLink.trim()) return;
    setAddingSrc(true);
    await fetch("/api/sync/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, sourceType: newType, name: newName.trim() || null, sharedLink: newLink.trim(), description: newDesc.trim() || null }),
    });
    await fetchSources();
    setAddingSrc(false); setShowAddSource(false);
    setNewName(""); setNewLink(""); setNewDesc("");
  };

  const updateSource = async (id: string, patch: { name?: string; sharedLink?: string; description?: string; autoSync?: boolean }) => {
    await fetch("/api/sync/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    await fetchSources();
  };

  const syncSource = async (id: string): Promise<SyncResult | null> => {
    const src = syncSources.find((s) => s.id === id);
    if (!src) return null;
    setSyncingId(id);
    const endpoint = src.source_type === "gdrive" ? "/api/sync/gdrive" : "/api/sync/onedrive";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, sharedLink: src.shared_link, sourceId: id }),
    });
    const data = res.ok ? await res.json() : null;
    setSyncingId(null);
    await fetchSources();
    return data;
  };

  const deleteSource = async (id: string) => {
    await fetch(`/api/sync/sources?id=${id}`, { method: "DELETE" });
    await fetchSources();
  };

  return (
    <div className="space-y-6">
      {/* Upload results + compile CTA */}
      {uploadResults && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 border bg-emerald-50 border-emerald-200 text-emerald-800">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {uploadResults.filter((r) => r.ok).length} de {uploadResults.length} archivos subidos
            </p>
            <p className="text-xs mt-0.5 opacity-80">Compila para que el chat pueda leerlos.</p>
          </div>
          <button onClick={handleCompile} disabled={compiling} className="btn-primary text-xs shrink-0">
            {compiling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            {compiling ? "Compilando…" : "Compilar ahora"}
          </button>
        </div>
      )}

      {/* Upload area */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5" />
          Subir documentos
        </h3>

        <label
          className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
            dragOver ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        >
          <input type="file" multiple accept=".md,.txt,.pdf,.xlsx,.csv,.docx" className="sr-only" onChange={(e) => addFiles(e.target.files)} />
          <Upload className="w-6 h-6 text-brand-400" />
          <div className="text-center">
            <p className="text-sm text-slate-700 font-medium">Arrastra o selecciona archivos</p>
            <p className="text-xs text-slate-400 mt-0.5">.pdf · .docx · .xlsx · .csv · .md · .txt</p>
          </div>
        </label>

        {staged.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600">{staged.length} archivo{staged.length > 1 ? "s" : ""} pendiente{staged.length > 1 ? "s" : ""}</p>
              <button onClick={() => setStaged((p) => p.map((s) => ({ ...s, expanded: false })))} className="text-xs text-slate-400 hover:text-slate-600">
                Colapsar todos
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {staged.map((s, i) => (
                <StagedFileRow key={s.file.name} staged={s} index={i}
                  onChange={(i, p) => setStaged((prev) => prev.map((st, idx) => idx === i ? { ...st, ...p } : st))}
                  onRemove={(i) => setStaged((p) => p.filter((_, idx) => idx !== i))}
                />
              ))}
            </div>
            <button onClick={handleUploadAll} disabled={uploading} className="btn-primary w-full">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Subiendo…" : `Subir ${staged.length} archivo${staged.length > 1 ? "s" : ""}`}
            </button>
          </div>
        )}

        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">Los archivos subidos no son consultables hasta compilarlos en la pestaña Estado KB.</p>
        </div>
      </div>

      {/* External sources */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5" />
            Fuentes externas
          </h3>
          <div className="flex-1 h-px bg-slate-200" />
          {!showAddSource && (
            <button onClick={() => setShowAddSource(true)} className="btn-primary text-xs">
              <FolderSync className="w-3.5 h-3.5" />
              Agregar fuente
            </button>
          )}
        </div>

        {showAddSource && (
          <div className="border border-brand-200 bg-brand-50/30 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-700">Nueva fuente externa</p>

            <div className="flex gap-2">
              {(["onedrive","gdrive"] as SourceType[]).map((t) => {
                const m = SOURCE_META[t];
                return (
                  <button key={t} type="button" onClick={() => setNewType(t)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      newType === t ? `${m.bg} ${m.border} ${m.color}` : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}>
                    <span className="font-bold">{m.icon}</span>
                    {m.label}
                  </button>
                );
              })}
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500 mb-1 block">Nombre de la fuente</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="input text-xs w-full" placeholder="Contratos locatarios, Reportes de ventas…" />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500 mb-1 block">Link de carpeta compartida *</label>
              <div className="relative">
                <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input type="url" value={newLink} onChange={(e) => setNewLink(e.target.value)} className="input pl-7 text-xs w-full" placeholder={SOURCE_META[newType].placeholder} autoFocus />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500 mb-1 block">Descripción / propósito</label>
              <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} className="input text-xs resize-none w-full" placeholder="Para qué sirve esta carpeta, qué archivos contiene…" />
            </div>

            <div className="flex gap-2">
              <button onClick={addSource} disabled={addingSrc || !newLink.trim()} className="btn-primary text-xs">
                {addingSrc ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderSync className="w-3 h-3" />}
                {addingSrc ? "Guardando…" : "Agregar fuente"}
              </button>
              <button onClick={() => { setShowAddSource(false); setNewName(""); setNewLink(""); setNewDesc(""); }} className="btn-ghost text-xs">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {syncSources.length === 0 && !showAddSource ? (
          <div className="flex flex-col items-center gap-3 border-2 border-dashed border-slate-200 rounded-xl py-8 text-center">
            <HardDrive className="w-8 h-8 text-slate-300" />
            <div>
              <p className="text-sm font-medium text-slate-600">Sin fuentes externas</p>
              <p className="text-xs text-slate-400 mt-0.5">Conecta carpetas de Google Drive o OneDrive.</p>
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
                onUpdate={(p) => updateSource(src.id, p)}
                onDelete={() => deleteSource(src.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

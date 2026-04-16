"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Zap, BookOpen, FileText, CheckCircle, Clock,
  Loader2, AlertCircle, FileSearch, Tag,
} from "lucide-react";

interface DocMeta {
  name: string;
  display_name?: string | null;
  description?: string | null;
  category?: string | null;
  tags?: string | null;
  compiled?: boolean;
}

interface DocList { raw: DocMeta[]; wiki: DocMeta[] }

interface CompileResult {
  compiled: number;
  total:    number;
  results:  { filename: string; success: boolean; error?: string }[];
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

export default function KBStatusTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [docs,      setDocs]      = useState<DocList>({ raw: [], wiki: [] });
  const [loading,   setLoading]   = useState(true);
  const [compiling, setCompiling] = useState(false);
  const [result,    setResult]    = useState<CompileResult | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/documents?clientId=${clientId}`);
    if (res.ok) setDocs(await res.json());
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  async function handleCompile() {
    setCompiling(true);
    setResult(null);
    const res = await fetch("/api/compile", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ clientId, clientName }),
    });
    if (res.ok) setResult(await res.json());
    setCompiling(false);
    fetchDocs();
  }

  const pending = docs.raw.length - docs.wiki.length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-display font-bold text-slate-900">{docs.raw.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Documentos raw</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-display font-bold text-emerald-700">{docs.wiki.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Artículos wiki</p>
        </div>
        <div className={`border rounded-xl px-4 py-3 text-center ${
          pending > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"
        }`}>
          <p className={`text-2xl font-display font-bold ${pending > 0 ? "text-amber-700" : "text-slate-400"}`}>
            {pending}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Pendientes</p>
        </div>
      </div>

      {/* Compile button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleCompile}
          disabled={compiling || docs.raw.length === 0}
          className="btn-primary"
        >
          {compiling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {compiling ? "Compilando…" : pending > 0 ? `Compilar ${pending} pendiente${pending > 1 ? "s" : ""}` : "Recompilar KB"}
        </button>
        {result && (
          <span className={`text-sm font-medium ${
            result.compiled === result.total ? "text-emerald-600" : "text-amber-600"
          }`}>
            {result.compiled === result.total
              ? `✓ ${result.compiled} artículos compilados`
              : `${result.compiled} de ${result.total} compilados`}
          </span>
        )}
      </div>

      {/* Compile errors */}
      {result && result.results.some((r) => !r.success) && (
        <div className="space-y-1">
          {result.results.filter((r) => !r.success).map((r) => (
            <div key={r.filename} className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium">{r.filename}:</span>
              <span>{r.error}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-6 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Cargando documentos…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Raw */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Raw (fuente)
              </h3>
              <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {docs.raw.length}
              </span>
            </div>
            {docs.raw.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Sin documentos. Sube archivos en la pestaña Fuentes.</p>
            ) : (
              <ul className="space-y-1.5 max-h-80 overflow-y-auto pr-0.5">
                {docs.raw.map((d) => {
                  const compiled = docs.wiki.some((w) => w.name === d.name);
                  return (
                    <li key={d.name} className="bg-white border border-slate-200 rounded-lg px-3 py-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-700 flex-1 truncate">
                          {d.display_name ?? d.name}
                        </span>
                        {compiled
                          ? <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                          : <Clock className="w-3 h-3 text-amber-500 shrink-0" />}
                      </div>
                      {(d.category || d.description) && (
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
                      )}
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
                Wiki (chat la lee)
              </h3>
              <span className="text-[10px] font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                {docs.wiki.length}
              </span>
            </div>
            {docs.wiki.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Ningún artículo compilado aún.</p>
            ) : (
              <ul className="space-y-1 max-h-80 overflow-y-auto pr-0.5">
                {docs.wiki.map((d) => (
                  <li key={d.name} className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 bg-emerald-50 border border-emerald-200">
                    <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="truncate text-emerald-700 flex-1">{d.name}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-start gap-2 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2.5 mt-3">
              <FileSearch className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
              <p className="text-xs text-brand-700 leading-relaxed">
                <strong>index.md</strong> se regenera en cada compilación. El asistente lo lee primero en cada consulta.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

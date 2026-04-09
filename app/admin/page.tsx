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
} from "lucide-react";

const CLIENT_ID = "plaza-demo";

interface DocList {
  raw: { name: string; path: string }[];
  wiki: { name: string; path: string }[];
}

interface CompileResult {
  compiled: number;
  total: number;
  results: { filename: string; success: boolean; error?: string }[];
}

export default function AdminPage() {
  const [docs, setDocs] = useState<DocList>({ raw: [], wiki: [] });
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [compileResult, setCompileResult] = useState<CompileResult | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

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

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

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
        {/* Compile result banner */}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Upload */}
          <div className="card space-y-4">
            <div>
              <h2 className="font-display font-semibold text-slate-900 flex items-center gap-2 text-sm">
                <Upload className="w-4 h-4 text-brand-600" />
                Subir documentos
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Archivos <code className="bg-slate-100 px-1 rounded">.md</code> o{" "}
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
                  {uploading ? "Subiendo archivos…" : "Arrastra o selecciona archivos"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  .md o .txt — sin límite de archivos
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
                    <p className="text-xs text-slate-400 italic px-1">
                      Sin documentos subidos.
                    </p>
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

                {/* Wiki */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                      Wiki compilada (chat)
                    </h3>
                    <span className="badge-green">{docs.wiki.length} artículos</span>
                  </div>
                  {docs.wiki.length === 0 ? (
                    <p className="text-xs text-slate-400 italic px-1">
                      Ningún artículo compilado aún.
                    </p>
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

        {/* How it works */}
        <div className="card">
          <h2 className="font-display font-semibold text-slate-900 text-sm mb-5">
            ¿Cómo funciona?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Subir documentos raw",
                desc: "Sube archivos .md con datos crudos: contratos, pagos, reglamentos, tarifas.",
                color: "text-brand-600",
                bg: "bg-brand-50",
                border: "border-brand-200",
              },
              {
                step: "02",
                title: "Compilar con IA",
                desc: "GPT-4o-mini transforma cada archivo en un artículo wiki estructurado con alertas y resúmenes.",
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

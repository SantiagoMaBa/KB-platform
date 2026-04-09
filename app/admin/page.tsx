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
    } catch {
      // ignore
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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientId", CLIENT_ID);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) uploaded++;
    }

    setUploadStatus(`${uploaded} de ${files.length} archivo(s) subido(s) correctamente.`);
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
      const data = await res.json();
      setCompileResult(data);
      fetchDocs();
    } catch {
      setCompileResult(null);
    } finally {
      setCompiling(false);
    }
  };

  return (
    <AppShell>
      <Header
        title="Administrar KB"
        subtitle="Plaza Centro Norte"
        actions={
          <button
            onClick={handleCompile}
            disabled={compiling || docs.raw.length === 0}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {compiling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {compiling ? "Compilando..." : "Compilar KB con IA"}
          </button>
        }
      />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Compile result */}
        {compileResult && (
          <div
            className={`rounded-xl p-4 border text-sm ${
              compileResult.compiled === compileResult.total
                ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-300"
                : "bg-amber-500/8 border-amber-500/20 text-amber-300"
            }`}
          >
            <p className="font-semibold">
              {compileResult.compiled === compileResult.total
                ? "✅ Compilación completada"
                : "⚠️ Compilación con errores"}
            </p>
            <p className="mt-1 text-xs opacity-80">
              {compileResult.compiled} de {compileResult.total} documentos compilados correctamente.
            </p>
            {compileResult.results.some((r) => !r.success) && (
              <ul className="mt-2 space-y-1">
                {compileResult.results
                  .filter((r) => !r.success)
                  .map((r) => (
                    <li key={r.filename} className="text-xs">
                      ❌ {r.filename}: {r.error}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload zone */}
          <div className="card space-y-4">
            <h2 className="font-display font-semibold text-surface-100 flex items-center gap-2">
              <Upload className="w-4 h-4 text-brand-400" />
              Subir documentos raw
            </h2>
            <p className="text-sm text-surface-400">
              Sube archivos <code className="text-brand-300">.md</code> o{" "}
              <code className="text-brand-300">.txt</code> con la información de
              la plaza. La IA los compilará en artículos wiki estructurados.
            </p>

            {/* Drop zone */}
            <label
              className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all duration-150 ${
                dragOver
                  ? "border-brand-500 bg-brand-500/8"
                  : "border-surface-700 hover:border-surface-600 hover:bg-surface-800/50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleUpload(e.dataTransfer.files);
              }}
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
                <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-surface-500" />
              )}
              <div className="text-center">
                <p className="text-sm text-surface-300 font-medium">
                  {uploading ? "Subiendo..." : "Arrastra archivos aquí"}
                </p>
                <p className="text-xs text-surface-500 mt-0.5">
                  o haz clic para seleccionar
                </p>
              </div>
            </label>

            {uploadStatus && (
              <div className="flex items-start gap-2 text-sm text-emerald-300 bg-emerald-500/8 border border-emerald-500/20 rounded-lg px-3 py-2">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {uploadStatus}
              </div>
            )}

            {/* Info */}
            <div className="bg-surface-800/50 rounded-lg p-3 text-xs text-surface-400 space-y-1">
              <p className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                Los archivos raw NO son consultados directamente por el chat.
              </p>
              <p className="pl-5">
                Debes compilar la KB con IA para que el asistente los use.
              </p>
            </div>
          </div>

          {/* Status panel */}
          <div className="card space-y-4">
            <h2 className="font-display font-semibold text-surface-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-400" />
              Estado de la KB
            </h2>

            {loadingDocs ? (
              <div className="flex items-center gap-2 text-surface-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando documentos...
              </div>
            ) : (
              <div className="space-y-5">
                {/* Raw docs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-surface-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-surface-500" />
                      Documentos raw
                    </h3>
                    <span className="badge-blue">{docs.raw.length} archivos</span>
                  </div>
                  {docs.raw.length === 0 ? (
                    <p className="text-xs text-surface-500 italic">
                      No hay documentos subidos.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {docs.raw.map((d) => (
                        <li
                          key={d.name}
                          className="flex items-center gap-2 text-xs text-surface-400 bg-surface-800/50 rounded px-3 py-2"
                        >
                          <FileText className="w-3 h-3 shrink-0" />
                          <span className="truncate">{d.name}</span>
                          <Clock className="w-3 h-3 ml-auto shrink-0 text-amber-400" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Wiki docs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-surface-300 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                      Wiki compilada (usada por el chat)
                    </h3>
                    <span className="badge-green">{docs.wiki.length} artículos</span>
                  </div>
                  {docs.wiki.length === 0 ? (
                    <p className="text-xs text-surface-500 italic">
                      No hay artículos compilados aún. Usa{" "}
                      <strong className="text-surface-400">Compilar KB con IA</strong>.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {docs.wiki.map((d) => (
                        <li
                          key={d.name}
                          className="flex items-center gap-2 text-xs text-surface-400 bg-surface-800/50 rounded px-3 py-2"
                        >
                          <CheckCircle className="w-3 h-3 shrink-0 text-emerald-400" />
                          <span className="truncate">{d.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* CTA */}
                {docs.raw.length > 0 && docs.wiki.length < docs.raw.length && (
                  <button
                    onClick={handleCompile}
                    disabled={compiling}
                    className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                  >
                    {compiling ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    {compiling ? "Compilando con IA..." : `Compilar ${docs.raw.length - docs.wiki.length} documento(s) pendiente(s)`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* How it works */}
        <div className="card space-y-4">
          <h2 className="font-display font-semibold text-surface-100">
            ¿Cómo funciona la KB?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            {[
              {
                step: "1",
                title: "Subir documentos raw",
                desc: "Sube archivos .md con datos crudos: contratos, pagos, reglamentos, tarifas.",
                color: "text-brand-400",
                bg: "bg-brand-500/10",
              },
              {
                step: "2",
                title: "Compilar con IA",
                desc: "GPT-4o-mini transforma cada archivo en un artículo wiki estructurado y con alertas.",
                color: "text-amber-400",
                bg: "bg-amber-500/10",
              },
              {
                step: "3",
                title: "Consultar en el chat",
                desc: "El asistente lee los artículos wiki y responde preguntas con contexto completo.",
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
            ].map((s) => (
              <div key={s.step} className="flex gap-3">
                <div
                  className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}
                >
                  <span className={`font-display font-bold text-sm ${s.color}`}>
                    {s.step}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-surface-200">{s.title}</p>
                  <p className="text-surface-400 text-xs mt-0.5 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

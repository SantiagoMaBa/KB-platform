"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import {
  TrendingUp, TrendingDown, Zap, AlertTriangle, Loader2,
  AlertCircle, BarChart2, RefreshCw,
} from "lucide-react";
import type { Insight } from "@/app/api/insights/route";
import type { MetricWithResult } from "@/lib/supabase";
import { useClientContext } from "@/lib/client-context";

// ── Helpers ──────────────────────────────────────────────────────────────���────

function formatMetricValue(metric: MetricWithResult): string {
  const result = metric.latest_result;
  if (!result) return "—";

  if (metric.display_format === "text") {
    return result.value_text ?? "—";
  }

  const num = result.value_numeric;
  if (num === null || num === undefined) return "—";

  let formatted: string;
  switch (metric.display_format) {
    case "currency_mxn":
      formatted = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(num);
      break;
    case "percentage":
      formatted = `${num.toFixed(1)}%`;
      break;
    case "decimal":
      formatted = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
      break;
    default:
      formatted = new Intl.NumberFormat("es-MX").format(num);
  }

  const prefix = metric.display_prefix ?? "";
  const suffix = metric.display_suffix ?? "";
  return `${prefix}${formatted}${suffix}`;
}

function alertTriggered(metric: MetricWithResult): boolean {
  if (!metric.alert_enabled || metric.alert_threshold === null || !metric.latest_result) return false;
  const val = metric.latest_result.value_numeric;
  if (val === null) return false;
  if (metric.alert_direction === "above") return val > metric.alert_threshold;
  if (metric.alert_direction === "below") return val < metric.alert_threshold;
  return false;
}

// ── Insight styles ────────────────────────────────────────────────────────────

const INSIGHT_STYLES: Record<Insight["type"], { bg: string; border: string; text: string; badge: string; dot: string }> = {
  alerta:      { bg: "bg-red-50",     border: "border-red-200",    text: "text-red-700",     badge: "bg-red-100 text-red-700",     dot: "bg-red-500"    },
  riesgo:      { bg: "bg-amber-50",   border: "border-amber-200",  text: "text-amber-700",   badge: "bg-amber-100 text-amber-700",  dot: "bg-amber-500"  },
  oportunidad: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
};

const PRIORITY_LABEL: Record<Insight["priority"], string> = { alta: "Alta", media: "Media", baja: "Baja" };

function InsightSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-200" />
            <div className="h-3 bg-slate-200 rounded w-3/4" />
          </div>
          <div className="h-3 bg-slate-200 rounded w-full" />
          <div className="h-3 bg-slate-200 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { clientId, clientName } = useClientContext();

  const [metrics,  setMetrics]  = useState<MetricWithResult[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  const [insights, setInsights] = useState<Insight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [insightsError, setInsightsError]     = useState<string | null>(null);

  // Fetch metrics
  useEffect(() => {
    if (!clientId) return;
    setLoadingMetrics(true);
    fetch(`/api/admin/metrics?clientId=${clientId}`)
      .then((r) => r.json())
      .then((data) => setMetrics(Array.isArray(data) ? data.filter((m: MetricWithResult) => m.is_visible) : []))
      .catch(() => setMetrics([]))
      .finally(() => setLoadingMetrics(false));
  }, [clientId]);

  // Fetch insights
  useEffect(() => {
    if (!clientId) return;
    setLoadingInsights(true);
    setInsightsError(null);
    fetch(`/api/insights?clientId=${clientId}&clientName=${encodeURIComponent(clientName)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) { setInsightsError(data.error ?? "Error al cargar insights."); return; }
        setInsights(data.insights ?? []);
      })
      .catch(() => setInsightsError("No se pudo conectar al servidor."))
      .finally(() => setLoadingInsights(false));
  }, [clientId, clientName]);

  const alertedMetrics = metrics.filter(alertTriggered);
  const visibleMetrics = metrics.filter((m) => m.is_visible);

  return (
    <AppShell>
      <Header
        title="Dashboard"
        subtitle={`${clientName} — ${new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" })}`}
        actions={
          <button
            onClick={() => {
              setLoadingInsights(true);
              fetch(`/api/insights?clientId=${clientId}&clientName=${encodeURIComponent(clientName)}&force=true`)
                .then((r) => r.json())
                .then((d) => setInsights(d.insights ?? []))
                .finally(() => setLoadingInsights(false));
            }}
            className="btn-ghost text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refrescar insights
          </button>
        }
      />

      <div className="flex-1 p-6 space-y-5 overflow-y-auto">

        {/* Active alerts */}
        {alertedMetrics.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                {alertedMetrics.length} alerta{alertedMetrics.length > 1 ? "s" : ""} activa{alertedMetrics.length > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                {alertedMetrics.map((m) => m.name).join(" · ")}
              </p>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        {loadingMetrics ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card-sm animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
                <div className="h-8 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-full" />
              </div>
            ))}
          </div>
        ) : visibleMetrics.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <BarChart2 className="w-8 h-8 text-slate-300" />
            <div>
              <p className="font-medium text-slate-600">Sin métricas configuradas</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Define las métricas de este cliente en el{" "}
                <a href="/admin" className="text-brand-600 hover:underline">panel de admin</a>.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {visibleMetrics.map((m) => {
              const triggered = alertTriggered(m);
              const hasResult = !!m.latest_result;

              return (
                <div
                  key={m.id}
                  className={`card-sm ${triggered ? "border-red-200 bg-red-50/50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium ${triggered ? "text-red-600" : "text-slate-500"}`}>
                        {m.name}
                      </p>
                      <p className={`text-2xl font-display font-bold mt-1 leading-none ${
                        triggered ? "text-red-700" : "text-slate-900"
                      }`}>
                        {formatMetricValue(m)}
                      </p>
                      {m.description && (
                        <p className="text-xs text-slate-400 mt-1 leading-tight">{m.description}</p>
                      )}
                    </div>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      triggered ? "bg-red-100" : "bg-slate-100"
                    }`}>
                      <BarChart2 className={`w-4.5 h-4.5 ${triggered ? "text-red-500" : "text-slate-400"}`} style={{ width: 18, height: 18 }} />
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {triggered ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Alerta activa
                      </span>
                    ) : hasResult ? (
                      <span className="text-xs text-slate-400">
                        {new Date(m.latest_result!.computed_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Sin datos</span>
                    )}
                    <span className="text-[10px] text-slate-300 capitalize">
                      {m.calc_type === "ai_query" ? "IA" : m.calc_type === "manual" ? "Manual" : "SQL"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-3 card">
            <h2 className="font-display font-semibold text-slate-900 text-sm flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-brand-500" />
              Insights IA
              {!loadingInsights && insights.length > 0 && (
                <span className="ml-auto badge-slate">{insights.length}</span>
              )}
              {loadingInsights && (
                <Loader2 className="ml-auto w-3.5 h-3.5 animate-spin text-slate-400" />
              )}
            </h2>

            {loadingInsights && <InsightSkeleton />}

            {!loadingInsights && insightsError && (
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-500">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                {insightsError}
              </div>
            )}

            {!loadingInsights && !insightsError && insights.length === 0 && (
              <p className="text-xs text-slate-400 italic px-1">
                No hay insights disponibles. Asegúrate de tener documentos compilados en la KB.
              </p>
            )}

            {!loadingInsights && insights.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {insights.map((insight, i) => {
                  const s = INSIGHT_STYLES[insight.type];
                  return (
                    <div key={i} className={`rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${s.bg} ${s.border}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                        <span className={`font-semibold flex-1 ${s.text}`}>{insight.title}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${s.badge}`}>
                          {PRIORITY_LABEL[insight.priority]}
                        </span>
                      </div>
                      <p className={`${s.text} opacity-80 leading-relaxed`}>{insight.description}</p>
                      {insight.action && (
                        <p className={`mt-1.5 font-medium ${s.text}`}>→ {insight.action}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </AppShell>
  );
}

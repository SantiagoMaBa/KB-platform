"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  DollarSign,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Calendar,
  Loader2,
  Zap,
  FlaskConical,
} from "lucide-react";
import type { Insight } from "@/app/api/insights/route";

const CLIENT_ID   = "plaza-demo";
const CLIENT_NAME = "Plaza Centro Norte";

// ── Hardcoded data (unchanged) ─────────────────────────────────────────────────

const metrics = [
  {
    label: "Ocupación",
    value: "100%",
    sub: "6 de 6 locales ocupados",
    icon: Users,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    trend: "Plena ocupación",
    trendUp: true,
  },
  {
    label: "Renta mensual",
    value: "$134,000",
    sub: "MXN facturado / mes",
    icon: DollarSign,
    iconColor: "text-brand-600",
    iconBg: "bg-brand-50",
    trend: "+2.1% vs enero",
    trendUp: true,
  },
  {
    label: "Adeudos actuales",
    value: "$54,810",
    sub: "2 locatarios en mora",
    icon: AlertTriangle,
    iconColor: "text-red-600",
    iconBg: "bg-red-50",
    trend: "39 días de retraso",
    trendUp: false,
  },
  {
    label: "Documentos KB",
    value: "5",
    sub: "Archivos base de conocimiento",
    icon: FileText,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    trend: "Sin compilar",
    trendUp: null,
  },
];

const locatarios = [
  { nombre: "Café Aroma Profundo",        local: "L-101", m2: "48",  renta: "$18,500", vencimiento: "dic 2026", status: "ok"     },
  { nombre: "Farmacia SaludPlus",          local: "L-104", m2: "72",  renta: "$26,800", vencimiento: "mar 2027", status: "ok"     },
  { nombre: "Óptica Visión Clara",         local: "L-205", m2: "35",  renta: "$14,200", vencimiento: "may 2026", status: "adeudo" },
  { nombre: "Rest. El Sabor Norteño",      local: "L-301", m2: "120", renta: "$38,000", vencimiento: "ago 2026", status: "adeudo" },
  { nombre: "Boutique Estilo Único",       local: "L-208", m2: "55",  renta: "$21,500", vencimiento: "nov 2027", status: "ok"     },
  { nombre: "Librería & Papelería Letras", local: "L-110", m2: "40",  renta: "$15,000", vencimiento: "dic 2027", status: "ok"     },
];

const eventos = [
  { date: "19–20 abr", name: "Feria del Libro Infantil",      area: "Plaza central",    status: "Aprobado",   color: "badge-green"  },
  { date: "25 abr",    name: "Degustación Café de Origen",    area: "Pasillo L-101",    status: "Aprobado",   color: "badge-green"  },
  { date: "10 may",    name: "Lanzamiento Colección Primavera", area: "Sala usos múlt.", status: "En revisión", color: "badge-yellow" },
  { date: "30–31 may", name: "Feria Salud y Bienestar",       area: "Terraza + Plaza",  status: "Pendiente",  color: "badge-yellow" },
  { date: "20 jun",    name: "Noche de Música Acústica",      area: "Terraza",          status: "Aprobado",   color: "badge-green"  },
];

// ── Insight styling ────────────────────────────────────────────────────────────

const INSIGHT_STYLES: Record<Insight["type"], { bg: string; border: string; text: string; badge: string; dot: string }> = {
  alerta:      { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-700",    badge: "bg-red-100 text-red-700",    dot: "bg-red-500"    },
  riesgo:      { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  badge: "bg-amber-100 text-amber-700",  dot: "bg-amber-500"  },
  oportunidad: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
};

const PRIORITY_LABEL: Record<Insight["priority"], string> = {
  alta:  "Alta",
  media: "Media",
  baja:  "Baja",
};

// ── Skeleton ───────────────────────────────────────────────────────────────────

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
  const [insights, setInsights]       = useState<Insight[]>([]);
  const [loadingInsights, setLoading] = useState(true);
  const [insightsError, setError]     = useState<string | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch(
          `/api/insights?clientId=${CLIENT_ID}&clientName=${encodeURIComponent(CLIENT_NAME)}`
        );
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Error al cargar insights.");
          return;
        }
        const data = await res.json();
        setInsights(data.insights ?? []);
      } catch {
        setError("No se pudo conectar al servidor.");
      } finally {
        setLoading(false);
      }
    }
    fetchInsights();
  }, []);

  return (
    <AppShell>
      <Header title="Dashboard" subtitle="Plaza Centro Norte — abril 2026" />

      <div className="flex-1 p-6 space-y-5 overflow-y-auto">

        {/* Demo data notice */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <FlaskConical className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">Datos de demostración:</span> las métricas, tabla de locatarios y eventos son valores de ejemplo para ilustrar cómo se vería el dashboard con datos reales. Los{" "}
            <span className="font-semibold">Insights IA</span> (columna derecha) son generados en tiempo real desde los documentos de la KB.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="card-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 font-medium">{m.label}</p>
                    <p className="text-2xl font-display font-bold text-slate-900 mt-1 leading-none">
                      {m.value}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{m.sub}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-lg ${m.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4.5 h-4.5 ${m.iconColor}`} style={{ width: 18, height: 18 }} />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
                  {m.trendUp === true  && <TrendingUp   className="w-3.5 h-3.5 text-emerald-500" />}
                  {m.trendUp === false && <TrendingDown  className="w-3.5 h-3.5 text-red-500" />}
                  <span className={`text-xs font-medium ${
                    m.trendUp === true  ? "text-emerald-600" :
                    m.trendUp === false ? "text-red-600"     :
                    "text-slate-400"
                  }`}>
                    {m.trend}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Locatarios table */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-slate-900 text-sm">
                Estado de Locatarios
              </h2>
              <div className="flex items-center gap-2">
                <span className="badge-slate">Q1 2026</span>
                <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                  <FlaskConical className="w-2.5 h-2.5" />
                  Demo
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-2.5 text-left text-xs text-slate-400 font-semibold uppercase tracking-wide">Locatario</th>
                    <th className="pb-2.5 text-left text-xs text-slate-400 font-semibold uppercase tracking-wide">Local</th>
                    <th className="pb-2.5 text-left text-xs text-slate-400 font-semibold uppercase tracking-wide">Renta</th>
                    <th className="pb-2.5 text-left text-xs text-slate-400 font-semibold uppercase tracking-wide">Vence</th>
                    <th className="pb-2.5 text-left text-xs text-slate-400 font-semibold uppercase tracking-wide">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {locatarios.map((l) => (
                    <tr key={l.local} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-2.5 text-slate-800 font-medium text-sm">{l.nombre}</td>
                      <td className="py-2.5">
                        <span className="badge-slate">{l.local}</span>
                      </td>
                      <td className="py-2.5 text-slate-600 font-mono text-xs">{l.renta}</td>
                      <td className="py-2.5 text-slate-500 text-xs">{l.vencimiento}</td>
                      <td className="py-2.5">
                        {l.status === "ok" ? (
                          <span className="badge-green">
                            <CheckCircle className="w-3 h-3" />
                            Al corriente
                          </span>
                        ) : (
                          <span className="badge-red">
                            <XCircle className="w-3 h-3" />
                            Adeudo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary row */}
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-lg font-display font-bold text-slate-900">88.9%</p>
                <p className="text-xs text-slate-400 mt-0.5">Cobranza puntual</p>
              </div>
              <div className="text-center border-x border-slate-100">
                <p className="text-lg font-display font-bold text-slate-900">370 m²</p>
                <p className="text-xs text-slate-400 mt-0.5">Área arrendada</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-display font-bold text-slate-900">2</p>
                <p className="text-xs text-slate-400 mt-0.5">Contratos por vencer</p>
              </div>
            </div>
          </div>

          {/* Insights (replaces hardcoded alertas) */}
          <div className="card">
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
              <div className="space-y-2">
                {insights.map((insight, i) => {
                  const s = INSIGHT_STYLES[insight.type];
                  return (
                    <div
                      key={i}
                      className={`rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${s.bg} ${s.border}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                        <span className={`font-semibold flex-1 ${s.text}`}>{insight.title}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${s.badge}`}>
                          {PRIORITY_LABEL[insight.priority]}
                        </span>
                      </div>
                      <p className={`${s.text} opacity-80 leading-relaxed`}>{insight.description}</p>
                      {insight.action && (
                        <p className={`mt-1.5 font-medium ${s.text}`}>
                          → {insight.action}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Events */}
        <div className="card">
          <h2 className="font-display font-semibold text-slate-900 text-sm flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-brand-500" />
            Próximos eventos — Q2 2026
            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full ml-auto">
              <FlaskConical className="w-2.5 h-2.5" />
              Demo
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {eventos.map((ev) => (
              <div key={ev.name} className="rounded-lg border border-slate-200 bg-slate-50 p-3 hover:border-slate-300 hover:bg-white transition-all duration-150">
                <p className="text-[10px] font-semibold text-brand-600 uppercase tracking-wide">{ev.date}</p>
                <p className="text-sm font-medium text-slate-800 mt-1 leading-tight">{ev.name}</p>
                <p className="text-xs text-slate-400 mt-1">{ev.area}</p>
                <div className="mt-2">
                  <span className={ev.color}>{ev.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  );
}

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
} from "lucide-react";

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
  {
    nombre: "Café Aroma Profundo",
    local: "L-101",
    m2: "48",
    renta: "$18,500",
    vencimiento: "dic 2026",
    status: "ok",
  },
  {
    nombre: "Farmacia SaludPlus",
    local: "L-104",
    m2: "72",
    renta: "$26,800",
    vencimiento: "mar 2027",
    status: "ok",
  },
  {
    nombre: "Óptica Visión Clara",
    local: "L-205",
    m2: "35",
    renta: "$14,200",
    vencimiento: "may 2026",
    status: "adeudo",
  },
  {
    nombre: "Rest. El Sabor Norteño",
    local: "L-301",
    m2: "120",
    renta: "$38,000",
    vencimiento: "ago 2026",
    status: "adeudo",
  },
  {
    nombre: "Boutique Estilo Único",
    local: "L-208",
    m2: "55",
    renta: "$21,500",
    vencimiento: "nov 2027",
    status: "ok",
  },
  {
    nombre: "Librería & Papelería Letras",
    local: "L-110",
    m2: "40",
    renta: "$15,000",
    vencimiento: "dic 2027",
    status: "ok",
  },
];

const alerts = [
  {
    type: "error",
    text: "El Sabor Norteño: adeudo de $38,000 — 39 días de mora",
  },
  {
    type: "error",
    text: "Óptica Visión Clara: adeudo de $14,200 — 39 días de mora",
  },
  {
    type: "warning",
    text: "Óptica Visión Clara: contrato vence mayo 2026 — iniciar renovación",
  },
  {
    type: "warning",
    text: "El Sabor Norteño: contrato vence agosto 2026 — negociar antes de mayo",
  },
  {
    type: "info",
    text: "Feria del Libro Infantil aprobada: 19–20 abril 2026",
  },
];

const eventos = [
  { date: "19–20 abr", name: "Feria del Libro Infantil", area: "Plaza central", status: "Aprobado", color: "badge-green" },
  { date: "25 abr", name: "Degustación Café de Origen", area: "Pasillo L-101", status: "Aprobado", color: "badge-green" },
  { date: "10 may", name: "Lanzamiento Colección Primavera", area: "Sala usos múlt.", status: "En revisión", color: "badge-yellow" },
  { date: "30–31 may", name: "Feria Salud y Bienestar", area: "Terraza + Plaza", status: "Pendiente", color: "badge-yellow" },
  { date: "20 jun", name: "Noche de Música Acústica", area: "Terraza", status: "Aprobado", color: "badge-green" },
];

export default function DashboardPage() {
  return (
    <AppShell>
      <Header title="Dashboard" subtitle="Plaza Centro Norte — abril 2026" />

      <div className="flex-1 p-6 space-y-5 overflow-y-auto">
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
                  {m.trendUp === true && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
                  {m.trendUp === false && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                  <span className={`text-xs font-medium ${
                    m.trendUp === true ? "text-emerald-600" :
                    m.trendUp === false ? "text-red-600" :
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
              <span className="badge-slate">Q1 2026</span>
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

          {/* Alerts */}
          <div className="card">
            <h2 className="font-display font-semibold text-slate-900 text-sm flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Alertas activas
              <span className="ml-auto badge-red">{alerts.length}</span>
            </h2>
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2.5 text-xs leading-relaxed ${
                    a.type === "error"
                      ? "bg-red-50 border border-red-200 text-red-700"
                      : a.type === "warning"
                      ? "bg-amber-50 border border-amber-200 text-amber-700"
                      : "bg-brand-50 border border-brand-200 text-brand-700"
                  }`}
                >
                  {a.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Events */}
        <div className="card">
          <h2 className="font-display font-semibold text-slate-900 text-sm flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-brand-500" />
            Próximos eventos — Q2 2026
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

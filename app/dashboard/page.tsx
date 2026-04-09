import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  Users,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";

const metrics = [
  {
    label: "Ocupación",
    value: "100%",
    sub: "6 de 6 locales ocupados",
    icon: Users,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    trend: "+0%",
    trendUp: true,
  },
  {
    label: "Renta mensual total",
    value: "$134,000",
    sub: "MXN / mes facturado",
    icon: DollarSign,
    color: "text-brand-400",
    bg: "bg-brand-500/10",
    trend: "+2.1%",
    trendUp: true,
  },
  {
    label: "Adeudos actuales",
    value: "$54,810",
    sub: "2 locatarios con mora",
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    trend: "+39 días",
    trendUp: false,
  },
  {
    label: "Documentos KB",
    value: "5",
    sub: "Archivos en base de conocimiento",
    icon: FileText,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    trend: "raw",
    trendUp: null,
  },
];

const locatarios = [
  {
    nombre: "Café Aroma Profundo",
    local: "L-101",
    renta: "$18,500",
    vencimiento: "dic 2026",
    pago: "Al corriente",
    status: "ok",
  },
  {
    nombre: "Farmacia SaludPlus",
    local: "L-104",
    renta: "$26,800",
    vencimiento: "mar 2027",
    pago: "Al corriente",
    status: "ok",
  },
  {
    nombre: "Óptica Visión Clara",
    local: "L-205",
    renta: "$14,200",
    vencimiento: "may 2026",
    pago: "$14,200 pendiente",
    status: "adeudo",
  },
  {
    nombre: "Rest. El Sabor Norteño",
    local: "L-301",
    renta: "$38,000",
    vencimiento: "ago 2026",
    pago: "$38,000 pendiente",
    status: "adeudo",
  },
  {
    nombre: "Boutique Estilo Único",
    local: "L-208",
    renta: "$21,500",
    vencimiento: "nov 2027",
    pago: "Al corriente",
    status: "ok",
  },
  {
    nombre: "Librería & Papelería Letras",
    local: "L-110",
    renta: "$15,000",
    vencimiento: "dic 2027",
    pago: "Al corriente",
    status: "ok",
  },
];

const alerts = [
  {
    type: "warning",
    text: "Óptica Visión Clara: contrato vence en mayo 2026 — iniciar renovación",
  },
  {
    type: "error",
    text: "El Sabor Norteño: adeudo de $38,000 con 39 días de retraso (cargo adicional $1,900)",
  },
  {
    type: "error",
    text: "Óptica Visión Clara: adeudo de $14,200 con 39 días de retraso (cargo adicional $710)",
  },
  {
    type: "warning",
    text: "Rest. El Sabor Norteño: contrato vence en agosto 2026 — negociar antes de mayo",
  },
  {
    type: "info",
    text: "Feria del Libro Infantil aprobada para 19–20 abril 2026 (plaza central)",
  },
];

export default function DashboardPage() {
  return (
    <AppShell>
      <Header
        title="Dashboard"
        subtitle="Plaza Centro Norte — abril 2026"
      />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="card-sm space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-surface-400">{m.label}</p>
                  <div className={`p-2 rounded-lg ${m.bg}`}>
                    <Icon className={`w-4 h-4 ${m.color}`} />
                  </div>
                </div>
                <div>
                  <p className={`text-2xl font-display font-bold ${m.color}`}>
                    {m.value}
                  </p>
                  <p className="text-xs text-surface-500 mt-0.5">{m.sub}</p>
                </div>
                <div className="flex items-center gap-1">
                  {m.trendUp !== null && (
                    <TrendingUp
                      className={`w-3 h-3 ${m.trendUp ? "text-emerald-400" : "text-red-400 rotate-180"}`}
                    />
                  )}
                  <span
                    className={`text-xs ${
                      m.trendUp === true
                        ? "text-emerald-400"
                        : m.trendUp === false
                        ? "text-red-400"
                        : "text-surface-500"
                    }`}
                  >
                    {m.trend}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Locatarios table */}
          <div className="lg:col-span-2 card space-y-4">
            <h2 className="font-display font-semibold text-surface-100">
              Estado de Locatarios
            </h2>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-surface-800">
                    <th className="pb-2 px-2 text-surface-500 font-medium">
                      Locatario
                    </th>
                    <th className="pb-2 px-2 text-surface-500 font-medium">
                      Local
                    </th>
                    <th className="pb-2 px-2 text-surface-500 font-medium">
                      Renta
                    </th>
                    <th className="pb-2 px-2 text-surface-500 font-medium">
                      Vence
                    </th>
                    <th className="pb-2 px-2 text-surface-500 font-medium">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/50">
                  {locatarios.map((l) => (
                    <tr
                      key={l.local}
                      className="hover:bg-surface-800/30 transition-colors"
                    >
                      <td className="py-3 px-2 text-surface-200 font-medium">
                        {l.nombre}
                      </td>
                      <td className="py-3 px-2 text-surface-400">{l.local}</td>
                      <td className="py-3 px-2 text-surface-300">{l.renta}</td>
                      <td className="py-3 px-2 text-surface-400">
                        {l.vencimiento}
                      </td>
                      <td className="py-3 px-2">
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
          </div>

          {/* Alerts panel */}
          <div className="card space-y-4">
            <h2 className="font-display font-semibold text-surface-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Alertas activas
            </h2>
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2.5 text-xs leading-relaxed border ${
                    a.type === "error"
                      ? "bg-red-500/8 border-red-500/20 text-red-300"
                      : a.type === "warning"
                      ? "bg-amber-500/8 border-amber-500/20 text-amber-300"
                      : "bg-brand-500/8 border-brand-500/20 text-brand-300"
                  }`}
                >
                  {a.text}
                </div>
              ))}
            </div>

            {/* Quick stats */}
            <div className="pt-2 border-t border-surface-800 space-y-2">
              <h3 className="text-xs text-surface-500 font-medium uppercase tracking-wider">
                Q1 2026
              </h3>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Cobranza puntual</span>
                <span className="text-emerald-400 font-semibold">88.9%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Próximos vencimientos</span>
                <span className="text-amber-400 font-semibold">2 contratos</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">Total área arrendada</span>
                <span className="text-surface-200 font-semibold">370 m²</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming events */}
        <div className="card space-y-4">
          <h2 className="font-display font-semibold text-surface-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-400" />
            Próximos eventos Q2 2026
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                date: "19–20 abr",
                name: "Feria del Libro Infantil",
                area: "Plaza central",
                status: "Aprobado",
                color: "badge-green",
              },
              {
                date: "25 abr",
                name: "Degustación Café de Origen",
                area: "Pasillo L-101",
                status: "Aprobado",
                color: "badge-green",
              },
              {
                date: "10 may",
                name: "Lanzamiento Colección Primavera",
                area: "Sala usos múlt.",
                status: "En revisión",
                color: "badge-yellow",
              },
              {
                date: "30–31 may",
                name: "Feria de Salud y Bienestar",
                area: "Terraza + Plaza",
                status: "Pendiente",
                color: "badge-yellow",
              },
              {
                date: "20 jun",
                name: "Noche de Música Acústica",
                area: "Terraza",
                status: "Aprobado",
                color: "badge-green",
              },
            ].map((ev) => (
              <div
                key={ev.name}
                className="bg-surface-800/50 rounded-lg p-3 border border-surface-700/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-brand-400 font-semibold">
                      {ev.date}
                    </p>
                    <p className="text-sm text-surface-200 font-medium mt-0.5 truncate">
                      {ev.name}
                    </p>
                    <p className="text-xs text-surface-500 mt-0.5">{ev.area}</p>
                  </div>
                  <span className={`${ev.color} shrink-0 mt-0.5`}>
                    {ev.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

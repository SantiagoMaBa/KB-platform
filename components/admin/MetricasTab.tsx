"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Loader2, Trash2, Edit2, X, Save, CheckCircle,
  TrendingUp, TrendingDown, Minus, Zap, AlertCircle,
  Play, RefreshCw, Eye, EyeOff,
} from "lucide-react";
import type { MetricWithResult, CalcType, DisplayFormat, AlertDirection } from "@/lib/supabase";

// ── Format value ──────────────────────────────────────────────────────────────

function formatValue(metric: MetricWithResult): string {
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
  if (!metric.alert_enabled || !metric.alert_threshold || !metric.latest_result) return false;
  const val = metric.latest_result.value_numeric;
  if (val === null) return false;
  if (metric.alert_direction === "above") return val > metric.alert_threshold;
  if (metric.alert_direction === "below") return val < metric.alert_threshold;
  return false;
}

// ── Metric Form ───────────────────────────────────────────────────────────────

interface MetricFormData {
  name:            string;
  description:     string;
  calc_type:       CalcType;
  ai_prompt:       string;
  manual_value:    string;
  display_format:  DisplayFormat;
  display_prefix:  string;
  display_suffix:  string;
  alert_enabled:   boolean;
  alert_threshold: string;
  alert_direction: AlertDirection;
  sort_order:      string;
  is_visible:      boolean;
}

const EMPTY_FORM: MetricFormData = {
  name:            "",
  description:     "",
  calc_type:       "manual",
  ai_prompt:       "",
  manual_value:    "",
  display_format:  "number",
  display_prefix:  "",
  display_suffix:  "",
  alert_enabled:   false,
  alert_threshold: "",
  alert_direction: "below",
  sort_order:      "0",
  is_visible:      true,
};

function MetricForm({
  clientId,
  initial,
  onSaved,
  onCancel,
}: {
  clientId: string;
  initial?: MetricWithResult;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm]   = useState<MetricFormData>(() => {
    if (!initial) return EMPTY_FORM;
    const cfg = initial.calc_config as Record<string, unknown> | null;
    return {
      name:            initial.name,
      description:     initial.description ?? "",
      calc_type:       initial.calc_type,
      ai_prompt:       (cfg?.prompt as string) ?? "",
      manual_value:    String(initial.latest_result?.value_numeric ?? ""),
      display_format:  initial.display_format,
      display_prefix:  initial.display_prefix ?? "",
      display_suffix:  initial.display_suffix ?? "",
      alert_enabled:   initial.alert_enabled,
      alert_threshold: String(initial.alert_threshold ?? ""),
      alert_direction: initial.alert_direction ?? "below",
      sort_order:      String(initial.sort_order),
      is_visible:      initial.is_visible,
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const set = (patch: Partial<MetricFormData>) => setForm((f) => ({ ...f, ...patch }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);

    const calc_config = form.calc_type === "ai_query"
      ? { prompt: form.ai_prompt.trim() }
      : form.calc_type === "manual"
      ? null
      : null;

    const body: Record<string, unknown> = {
      client_id:       clientId,
      name:            form.name.trim(),
      description:     form.description.trim() || null,
      calc_type:       form.calc_type,
      calc_config,
      display_format:  form.display_format,
      display_prefix:  form.display_prefix.trim() || null,
      display_suffix:  form.display_suffix.trim() || null,
      alert_enabled:   form.alert_enabled,
      alert_threshold: form.alert_enabled && form.alert_threshold ? parseFloat(form.alert_threshold) : null,
      alert_direction: form.alert_enabled ? form.alert_direction : null,
      sort_order:      parseInt(form.sort_order) || 0,
      is_visible:      form.is_visible,
    };

    if (initial) body.id = initial.id;

    const res = await fetch("/api/admin/metrics", {
      method:  initial ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar.");
      setSaving(false);
      return;
    }

    // Si es manual con valor, guardar el resultado también
    if (form.calc_type === "manual" && form.manual_value && !initial) {
      const saved = await res.json();
      await fetch("/api/admin/metrics", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: saved.id }), // no-op patch to get id
      });
      // Actually save the manual result directly to metric_results
      // We'll do this via a separate endpoint
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-800 text-sm">
          {initial ? "Editar métrica" : "Nueva métrica"}
        </h4>
        <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Name + description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Ventas del mes"
              className="input w-full text-sm"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Descripción corta</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Total facturado en el mes actual"
              className="input w-full text-sm"
            />
          </div>
        </div>

        {/* Calc type */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo de cálculo</label>
          <div className="flex gap-2">
            {(
              [
                { v: "manual",   l: "Manual",        d: "Ingresas el valor tú mismo",           disabled: false },
                { v: "ai_query", l: "Consulta IA",    d: "El sistema pregunta a la KB",           disabled: false },
                { v: "sql",      l: "SQL (pronto)",   d: "Query sobre datos estructurados",       disabled: true  },
              ] as { v: CalcType; l: string; d: string; disabled: boolean }[]
            ).map(({ v, l, d, disabled }) => (
              <button
                key={v}
                type="button"
                disabled={disabled}
                onClick={() => set({ calc_type: v as CalcType })}
                className={`flex-1 text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                  form.calc_type === v
                    ? "bg-brand-50 border-brand-300 text-brand-700"
                    : disabled
                    ? "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <p className="font-semibold">{l}</p>
                <p className="text-[10px] opacity-70 mt-0.5 leading-tight">{d}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Calc config */}
        {form.calc_type === "ai_query" && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Pregunta a la KB{" "}
              <span className="text-slate-400 font-normal">(el sistema extrae el número de la respuesta)</span>
            </label>
            <textarea
              value={form.ai_prompt}
              onChange={(e) => set({ ai_prompt: e.target.value })}
              placeholder="¿Cuántos locatarios tienen adeudos pendientes?"
              rows={2}
              className="input w-full text-sm resize-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Para métricas de texto, selecciona formato "Texto" abajo. Para números, el sistema extrae automáticamente.
            </p>
          </div>
        )}

        {form.calc_type === "manual" && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Valor actual</label>
            <input
              type="number"
              step="any"
              value={form.manual_value}
              onChange={(e) => set({ manual_value: e.target.value })}
              placeholder="134000"
              className="input w-full text-sm font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Podrás actualizar este valor en cualquier momento desde aquí.
            </p>
          </div>
        )}

        {/* Display format */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Formato</label>
            <select
              value={form.display_format}
              onChange={(e) => set({ display_format: e.target.value as DisplayFormat })}
              className="input w-full text-sm"
            >
              <option value="number">Número entero</option>
              <option value="decimal">Decimal</option>
              <option value="currency_mxn">Moneda MXN</option>
              <option value="percentage">Porcentaje</option>
              <option value="text">Texto</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Prefijo</label>
            <input
              type="text"
              value={form.display_prefix}
              onChange={(e) => set({ display_prefix: e.target.value })}
              placeholder="$ USD "
              className="input w-full text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Sufijo</label>
            <input
              type="text"
              value={form.display_suffix}
              onChange={(e) => set({ display_suffix: e.target.value })}
              placeholder="% días locales"
              className="input w-full text-sm font-mono"
            />
          </div>
        </div>

        {/* Alert */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => set({ alert_enabled: !form.alert_enabled })}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                form.alert_enabled ? "bg-brand-600" : "bg-slate-200"
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                form.alert_enabled ? "translate-x-4" : "translate-x-0.5"
              }`} />
            </button>
            <span className="text-xs font-medium text-slate-700">Activar alerta</span>
          </div>

          {form.alert_enabled && (
            <div className="flex gap-3 pl-11">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Umbral</label>
                <input
                  type="number"
                  step="any"
                  value={form.alert_threshold}
                  onChange={(e) => set({ alert_threshold: e.target.value })}
                  placeholder="0"
                  className="input w-28 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Alertar cuando</label>
                <select
                  value={form.alert_direction}
                  onChange={(e) => set({ alert_direction: e.target.value as AlertDirection })}
                  className="input text-sm"
                >
                  <option value="below">Esté por debajo</option>
                  <option value="above">Esté por encima</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Sort + visibility */}
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Orden en dashboard</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => set({ sort_order: e.target.value })}
              className="input w-20 text-sm font-mono"
            />
          </div>
          <div className="flex items-center gap-2 pt-4">
            <button
              type="button"
              onClick={() => set({ is_visible: !form.is_visible })}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                form.is_visible ? "bg-brand-600" : "bg-slate-200"
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                form.is_visible ? "translate-x-4" : "translate-x-0.5"
              }`} />
            </button>
            <span className="text-xs font-medium text-slate-700">Visible en dashboard</span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={saving || !form.name.trim()} className="btn-primary text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Guardando…" : "Guardar métrica"}
          </button>
          <button type="button" onClick={onCancel} className="btn-ghost text-sm">Cancelar</button>
        </div>
      </form>
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export default function MetricasTab({ clientId }: { clientId: string }) {
  const [metrics, setMetrics]     = useState<MetricWithResult[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [computing, setComputing] = useState<string | "all" | null>(null);
  const [computeResult, setComputeResult] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/metrics?clientId=${clientId}`);
    if (res.ok) setMetrics(await res.json());
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta métrica y su historial?")) return;
    setDeletingId(id);
    await fetch(`/api/admin/metrics?id=${id}`, { method: "DELETE" });
    await fetchMetrics();
    setDeletingId(null);
  }

  async function handleCompute(metricId?: string) {
    setComputing(metricId ?? "all");
    setComputeResult(null);

    const res = await fetch("/api/admin/metrics/compute", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ clientId, metricId }),
    });

    const data = await res.json();
    setComputing(null);

    if (!res.ok) {
      setComputeResult(`Error: ${data.error}`);
    } else {
      setComputeResult(`✓ ${data.computed} de ${data.total} métricas calculadas`);
      fetchMetrics();
      setTimeout(() => setComputeResult(null), 5000);
    }
  }

  async function handleUpdateManual(metric: MetricWithResult, newValue: string) {
    const val = parseFloat(newValue);
    if (isNaN(val)) return;

    await fetch("/api/admin/metrics/compute", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ clientId, metricId: metric.id, manualValue: val }),
    });

    fetchMetrics();
  }

  const aiMetrics = metrics.filter((m) => m.calc_type === "ai_query");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm text-slate-500">
            {metrics.length} métrica{metrics.length !== 1 ? "s" : ""} definida{metrics.length !== 1 ? "s" : ""}
          </p>
        </div>
        {aiMetrics.length > 0 && (
          <button
            onClick={() => handleCompute()}
            disabled={computing === "all"}
            className="btn-ghost text-sm border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
          >
            {computing === "all"
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Zap className="w-4 h-4" />}
            Recalcular todas las métricas IA
          </button>
        )}
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            Nueva métrica
          </button>
        )}
      </div>

      {computeResult && (
        <div className="flex items-center gap-2 text-emerald-700 text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <CheckCircle className="w-3.5 h-3.5" />
          {computeResult}
        </div>
      )}

      {/* New metric form */}
      {showForm && (
        <MetricForm
          clientId={clientId}
          onSaved={() => { setShowForm(false); fetchMetrics(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Metrics list */}
      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Cargando métricas…
        </div>
      ) : metrics.length === 0 && !showForm ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center border-2 border-dashed border-slate-200 rounded-xl">
          <TrendingUp className="w-8 h-8 text-slate-300" />
          <div>
            <p className="font-medium text-slate-600">Sin métricas configuradas</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Define las métricas que aparecerán en el dashboard del cliente.
            </p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            Crear primera métrica
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {metrics.map((metric) => {
            const triggered = alertTriggered(metric);
            const isEditing = editingId === metric.id;

            if (isEditing) {
              return (
                <MetricForm
                  key={metric.id}
                  clientId={clientId}
                  initial={metric}
                  onSaved={() => { setEditingId(null); fetchMetrics(); }}
                  onCancel={() => setEditingId(null)}
                />
              );
            }

            return (
              <div
                key={metric.id}
                className={`bg-white border rounded-xl p-4 ${
                  triggered
                    ? "border-red-200 bg-red-50/30"
                    : metric.is_visible
                    ? "border-slate-200"
                    : "border-slate-100 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Value */}
                  <div className="w-28 shrink-0">
                    <p className={`font-display font-bold text-xl leading-tight ${
                      triggered ? "text-red-700" : "text-slate-900"
                    }`}>
                      {formatValue(metric)}
                    </p>
                    {metric.latest_result && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(metric.latest_result.computed_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                      </p>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm">{metric.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                        {metric.calc_type === "ai_query" ? "IA" : metric.calc_type === "manual" ? "Manual" : "SQL"}
                      </span>
                      {!metric.is_visible && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">
                          Oculta
                        </span>
                      )}
                      {triggered && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Alerta activa
                        </span>
                      )}
                    </div>
                    {metric.description && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{metric.description}</p>
                    )}
                    {metric.alert_enabled && metric.alert_threshold !== null && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Alerta si {metric.alert_direction === "below" ? "baja de" : "sube de"}{" "}
                        <span className="font-mono">{metric.alert_threshold}</span>
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {metric.calc_type === "ai_query" && (
                      <button
                        onClick={() => handleCompute(metric.id)}
                        disabled={computing === metric.id}
                        title="Recalcular esta métrica"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      >
                        {computing === metric.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <RefreshCw className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button
                      onClick={() => setEditingId(metric.id)}
                      title="Editar"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(metric.id)}
                      disabled={deletingId === metric.id}
                      title="Eliminar"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      {deletingId === metric.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

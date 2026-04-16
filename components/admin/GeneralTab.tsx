"use client";

import { useState } from "react";
import { Save, Loader2, AlertCircle, LayoutDashboard, MessageSquare, ExternalLink } from "lucide-react";
import type { ClientRow, ClientStatus } from "@/lib/supabase";
import { impersonateUrl } from "@/lib/client-context";

const STATUS_OPTIONS: { value: ClientStatus; label: string; color: string }[] = [
  { value: "setup",    label: "En configuración", color: "text-amber-600"  },
  { value: "active",   label: "Activo",            color: "text-emerald-600" },
  { value: "paused",   label: "Pausado",           color: "text-orange-600" },
  { value: "inactive", label: "Inactivo",          color: "text-slate-500"  },
];

const INDUSTRY_SUGGESTIONS = [
  "Retail / Plazas comerciales",
  "Manufactura",
  "Distribución y logística",
  "Servicios profesionales",
  "Salud y bienestar",
  "Educación",
  "Bienes raíces / Inmobiliario",
  "Alimentos y bebidas",
  "Tecnología",
  "Construcción",
];

export default function GeneralTab({
  client,
  onUpdated,
}: {
  client: ClientRow;
  onUpdated: (updated: ClientRow) => void;
}) {
  const [name,    setName]    = useState(client.name);
  const [slug,    setSlug]    = useState(client.slug);
  const [industry, setIndustry] = useState(client.industry ?? "");
  const [contact, setContact] = useState(client.contact_name ?? "");
  const [email,   setEmail]   = useState(client.contact_email ?? "");
  const [status,  setStatus]  = useState<ClientStatus>(client.status);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [saved,   setSaved]   = useState(false);
  const [showIndustrySuggestions, setShowIndustrySuggestions] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/clients", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        id:            client.id,
        name:          name.trim(),
        slug:          slug.trim(),
        industry:      industry.trim() || null,
        contact_name:  contact.trim()  || null,
        contact_email: email.trim()    || null,
        status,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Error al guardar.");
    } else {
      setSaved(true);
      onUpdated(data);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Impersonation quick links */}
      <div className="flex items-center gap-3 p-4 bg-brand-50 border border-brand-200 rounded-xl">
        <p className="text-sm font-medium text-brand-800 flex-1">Ver el sistema como este cliente:</p>
        <a
          href={impersonateUrl("dashboard", client.id, client.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-white border border-brand-300 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Dashboard
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
        <a
          href={impersonateUrl("chat", client.id, client.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-white border border-brand-300 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Chat
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nombre */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del cliente *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Slug <span className="text-slate-400 font-normal">(identificador único en la URL)</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              className="input w-full font-mono text-sm"
              required
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ClientStatus)}
              className="input w-full"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Industry */}
          <div className="sm:col-span-2 relative">
            <label className="block text-xs font-medium text-slate-600 mb-1">Giro / Industria</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              onFocus={() => setShowIndustrySuggestions(true)}
              onBlur={() => setTimeout(() => setShowIndustrySuggestions(false), 150)}
              placeholder="Retail, Manufactura, Servicios…"
              className="input w-full"
            />
            {showIndustrySuggestions && (
              <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-md py-1.5 max-h-48 overflow-y-auto">
                {INDUSTRY_SUGGESTIONS.filter(
                  (s) => !industry || s.toLowerCase().includes(industry.toLowerCase())
                ).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={() => { setIndustry(s); setShowIndustrySuggestions(false); }}
                    className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contact name */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del contacto</label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Nombre completo"
              className="input w-full"
            />
          </div>

          {/* Contact email */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email del contacto</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contacto@empresa.com"
              className="input w-full"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
          {saved && (
            <span className="text-emerald-600 text-sm font-medium animate-fade-in">
              ✓ Guardado
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

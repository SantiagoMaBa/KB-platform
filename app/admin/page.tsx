"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Users, Building2, CheckCircle2, Clock, PauseCircle,
  XCircle, ChevronRight, Loader2, AlertCircle, Trash2,
  LayoutDashboard, MessageSquare,
} from "lucide-react";
import type { ClientRow, ClientStatus } from "@/lib/supabase";
import { impersonateUrl } from "@/lib/client-context";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<ClientStatus, { label: string; icon: typeof CheckCircle2; color: string; bg: string; border: string }> = {
  active:   { label: "Activo",            icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" },
  setup:    { label: "En configuración",  icon: Clock,        color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200"   },
  paused:   { label: "Pausado",           icon: PauseCircle,  color: "text-orange-700",  bg: "bg-orange-50",   border: "border-orange-200"  },
  inactive: { label: "Inactivo",          icon: XCircle,      color: "text-slate-600",   bg: "bg-slate-100",   border: "border-slate-200"   },
};

function StatusBadge({ status }: { status: ClientStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.setup;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${m.bg} ${m.border} ${m.color}`}>
      <Icon className="w-3 h-3" />
      {m.label}
    </span>
  );
}

// ── New client form ───────────────────────────────────────────────────────────

function NewClientForm({ onCreated, onCancel }: {
  onCreated: (client: ClientRow) => void;
  onCancel: () => void;
}) {
  const [name, setName]       = useState("");
  const [industry, setIndustry] = useState("");
  const [email, setEmail]     = useState("");
  const [contact, setContact] = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Auto-generate slug from name
  const slug = name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    const res = await fetch("/api/clients", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name: name.trim(),
        slug,
        industry:      industry.trim() || null,
        contact_name:  contact.trim()  || null,
        contact_email: email.trim()    || null,
        status: "setup",
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Error al crear el cliente.");
    } else {
      onCreated(data);
    }
  }

  return (
    <div className="bg-white border border-brand-200 rounded-2xl p-5 shadow-sm mb-6">
      <h3 className="font-display font-semibold text-slate-900 text-sm mb-4">Nuevo cliente</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del cliente *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Plaza Jardines del Norte"
            className="input text-sm w-full"
            autoFocus
            required
          />
          {slug && (
            <p className="text-[11px] text-slate-400 mt-1">
              Slug: <code className="bg-slate-100 px-1 rounded">{slug}</code>
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Giro / Industria</label>
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Retail, Manufactura, Servicios…"
            className="input text-sm w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Contacto principal</label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Nombre del contacto"
            className="input text-sm w-full"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Email del contacto</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contacto@empresa.com"
            className="input text-sm w-full"
          />
        </div>

        {error && (
          <div className="sm:col-span-2 flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="sm:col-span-2 flex gap-2">
          <button type="submit" disabled={saving || !name.trim()} className="btn-primary text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? "Creando…" : "Crear cliente"}
          </button>
          <button type="button" onClick={onCancel} className="btn-ghost text-sm">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdminClientsPage() {
  const [clients, setClients]     = useState<ClientRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este cliente y todos sus datos? Esta acción no se puede deshacer.")) return;
    setDeletingId(id);
    await fetch(`/api/clients?id=${id}`, { method: "DELETE" });
    await fetchClients();
    setDeletingId(null);
  }

  const statusCounts = clients.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900">Clientes</h1>
          <p className="text-slate-500 text-sm mt-1">{clients.length} cliente{clients.length !== 1 ? "s" : ""} registrado{clients.length !== 1 ? "s" : ""}</p>
        </div>
        {!showNew && (
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Nuevo cliente
          </button>
        )}
      </div>

      {/* Summary row */}
      {clients.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {(["active","setup","paused","inactive"] as ClientStatus[]).map((s) => {
            const m = STATUS_META[s];
            const Icon = m.icon;
            return (
              <div key={s} className={`rounded-xl border px-4 py-3 ${m.bg} ${m.border}`}>
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${m.color}`} />
                  <span className={`text-xs font-semibold ${m.color}`}>{m.label}</span>
                </div>
                <p className={`font-display font-bold text-2xl mt-1 ${m.color}`}>
                  {statusCounts[s] ?? 0}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* New client form */}
      {showNew && (
        <NewClientForm
          onCreated={(c) => { setClients((prev) => [...prev, c]); setShowNew(false); }}
          onCancel={() => setShowNew(false)}
        />
      )}

      {/* Clients list */}
      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
          Cargando clientes…
        </div>
      ) : clients.length === 0 && !showNew ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-700">Sin clientes aún</p>
            <p className="text-sm text-slate-400 mt-1">Crea el primer cliente para comenzar.</p>
          </div>
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Crear primer cliente
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-brand-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-sm">{client.name}</span>
                    <StatusBadge status={client.status} />
                    {client.industry && (
                      <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {client.industry}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <code className="text-[11px] text-slate-400">{client.slug}</code>
                    {client.contact_name && (
                      <span className="text-[11px] text-slate-400">
                        {client.contact_name}
                        {client.contact_email && ` · ${client.contact_email}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={impersonateUrl("dashboard", client.id, client.name)}
                    title="Ver dashboard del cliente"
                    className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                  </a>
                  <a
                    href={impersonateUrl("chat", client.id, client.name)}
                    title="Ver chat del cliente"
                    className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(client.id)}
                    disabled={deletingId === client.id}
                    title="Eliminar cliente"
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    {deletingId === client.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                  <Link
                    href={`/admin/clients/${client.id}`}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

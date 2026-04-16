"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2, AlertCircle, Building2, Database, BarChart2, BookOpen, Info } from "lucide-react";
import type { ClientRow } from "@/lib/supabase";
import GeneralTab   from "@/components/admin/GeneralTab";
import FuentesTab   from "@/components/admin/FuentesTab";
import MetricasTab  from "@/components/admin/MetricasTab";
import KBStatusTab  from "@/components/admin/KBStatusTab";

type Tab = "general" | "fuentes" | "metricas" | "kb";

const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: "general",  label: "General",    icon: Info       },
  { id: "fuentes",  label: "Fuentes",    icon: Database   },
  { id: "metricas", label: "Métricas",   icon: BarChart2  },
  { id: "kb",       label: "Estado KB",  icon: BookOpen   },
];

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [client,  setClient]  = useState<ClientRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tab,     setTab]     = useState<Tab>("general");

  useEffect(() => {
    async function fetchClient() {
      const res = await fetch("/api/clients");
      if (!res.ok) { setError("Error al cargar clientes."); setLoading(false); return; }
      const all: ClientRow[] = await res.json();
      const found = all.find((c) => c.id === id);
      if (!found) { setError("Cliente no encontrado."); setLoading(false); return; }
      setClient(found);
      setLoading(false);
    }
    fetchClient();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center gap-3 min-h-screen justify-center">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-slate-700 font-medium">{error ?? "Cliente no encontrado"}</p>
        <Link href="/admin" className="text-brand-600 text-sm hover:underline">← Volver a clientes</Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Link href="/admin" className="hover:text-slate-600 transition-colors flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          Clientes
        </Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">{client.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center shrink-0">
          <Building2 className="w-6 h-6 text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-2xl text-slate-900">{client.name}</h1>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <code className="text-xs text-slate-400">{client.slug}</code>
            {client.industry && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {client.industry}
              </span>
            )}
            {client.contact_name && (
              <span className="text-xs text-slate-400">
                {client.contact_name}
                {client.contact_email && ` · ${client.contact_email}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-0">
          {TABS.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === tabId
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {tab === "general" && (
          <GeneralTab
            client={client}
            onUpdated={(updated) => setClient(updated)}
          />
        )}
        {tab === "fuentes" && (
          <FuentesTab clientId={client.id} clientName={client.name} />
        )}
        {tab === "metricas" && (
          <MetricasTab clientId={client.id} />
        )}
        {tab === "kb" && (
          <KBStatusTab clientId={client.id} clientName={client.name} />
        )}
      </div>
    </div>
  );
}

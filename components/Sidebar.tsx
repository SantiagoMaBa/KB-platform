"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, MessageSquare, Building2,
  ChevronDown, Sparkles, Settings2, ArrowLeft,
} from "lucide-react";
import { useClientContext, impersonateUrl } from "@/lib/client-context";

export default function Sidebar() {
  const pathname = usePathname();
  const { clientId, clientName, isImpersonating } = useClientContext();

  // Build nav links preserving impersonation params
  const params = isImpersonating
    ? `?c=${encodeURIComponent(clientId)}&cn=${encodeURIComponent(clientName)}`
    : "";

  const navItems = [
    { href: `/dashboard${params}`, match: "/dashboard", label: "Dashboard",    icon: LayoutDashboard },
    { href: `/chat${params}`,      match: "/chat",       label: "Asistente IA", icon: MessageSquare  },
  ];

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-white border-r border-slate-200 h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0 shadow-sm">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-display font-bold text-slate-900 text-sm leading-tight truncate">
            KB Platform
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium tracking-wide uppercase">
            Copiloto Operacional
          </p>
        </div>
      </div>

      {/* Active client */}
      <div className="px-3 py-3 border-b border-slate-100">
        <div className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${
          isImpersonating
            ? "bg-amber-50 border-amber-200"
            : "bg-slate-50 border-slate-200"
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full shrink-0 ${isImpersonating ? "bg-amber-500" : "bg-emerald-500"}`} />
            <span className="text-slate-700 font-medium truncate text-sm">{clientName}</span>
          </div>
          {isImpersonating && <ChevronDown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
        </div>
      </div>

      {/* Impersonation banner */}
      {isImpersonating && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-[10px] text-amber-700 font-medium leading-tight">
            Vista de administrador
          </p>
          <a
            href="/admin"
            className="text-[10px] text-amber-600 flex items-center gap-1 mt-0.5 hover:underline"
          >
            <ArrowLeft className="w-3 h-3" />
            Volver al admin
          </a>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold px-3 mb-2">
          Navegación
        </p>
        {navItems.map(({ href, match, label, icon: Icon }) => {
          const isActive = pathname.startsWith(match);
          return (
            <Link
              key={match}
              href={href}
              className={isActive ? "sidebar-link-active" : "sidebar-link"}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-100 space-y-2">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 px-1 transition-colors"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Panel de admin
        </Link>
        <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>Powered by GPT-4o mini</span>
        </div>
      </div>
    </aside>
  );
}

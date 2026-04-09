"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  FolderOpen,
  Building2,
  ChevronDown,
  Sparkles,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Asistente IA", icon: MessageSquare },
  { href: "/admin", label: "Administrar KB", icon: FolderOpen },
];

export default function Sidebar() {
  const pathname = usePathname();

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
            Plazas Comerciales
          </p>
        </div>
      </div>

      {/* Active client */}
      <div className="px-3 py-3 border-b border-slate-100">
        <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors text-sm group">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-slate-700 font-medium truncate text-sm">
              Plaza Centro Norte
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 group-hover:text-slate-600 transition-colors" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold px-3 mb-2">
          Navegación
        </p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
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
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>Powered by GPT-4o mini</span>
        </div>
        <p className="text-[10px] text-slate-300 mt-1.5">KB Platform v0.1.0</p>
      </div>
    </aside>
  );
}

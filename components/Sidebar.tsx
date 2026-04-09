"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  FolderOpen,
  Settings,
  Building2,
  ChevronDown,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Asistente IA", icon: MessageSquare },
  { href: "/admin", label: "Administrar KB", icon: FolderOpen },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-surface-950 border-r border-surface-800 h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-surface-800">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-display font-bold text-surface-50 text-sm leading-none truncate">
            KB Platform
          </p>
          <p className="text-xs text-surface-500 mt-0.5">Plazas Comerciales</p>
        </div>
      </div>

      {/* Client selector */}
      <div className="px-3 py-3 border-b border-surface-800">
        <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-surface-100 font-medium truncate">
              Plaza Centro Norte
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-surface-400 shrink-0" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] uppercase tracking-widest text-surface-600 font-semibold px-3 mb-2">
          Navegación
        </p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                isActive ? "sidebar-link-active" : "sidebar-link"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-surface-800">
        <Link href="/admin" className="sidebar-link">
          <Settings className="w-4 h-4 shrink-0" />
          Configuración
        </Link>
        <div className="mt-3 px-3">
          <p className="text-[10px] text-surface-600">
            KB Platform v0.1.0
          </p>
        </div>
      </div>
    </aside>
  );
}

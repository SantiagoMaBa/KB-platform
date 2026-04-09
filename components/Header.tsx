"use client";

import { Bell } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-6 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div>
        <h1 className="font-display font-bold text-slate-900 text-[15px] leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {actions}
        <button className="btn-ghost relative p-2.5" title="Notificaciones">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-brand-500" />
        </button>
      </div>
    </header>
  );
}

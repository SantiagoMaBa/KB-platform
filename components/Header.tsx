"use client";

import { Bell, Search } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-6 bg-surface-950/80 backdrop-blur-md border-b border-surface-800">
      <div>
        <h1 className="font-display font-bold text-surface-50 text-base leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-surface-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <button className="btn-ghost p-2 relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-500" />
        </button>
        <button className="btn-ghost p-2">
          <Search className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

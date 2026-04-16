"use client";

import { useState, useEffect } from "react";

export const DEFAULT_CLIENT_ID   = process.env.NEXT_PUBLIC_DEFAULT_CLIENT_ID   ?? "plaza-demo";
export const DEFAULT_CLIENT_NAME = process.env.NEXT_PUBLIC_DEFAULT_CLIENT_NAME ?? "Plaza Centro Norte";

/**
 * Lee el cliente activo desde la URL (?c=id&cn=nombre).
 * En modo impersonación (admin viendo como cliente), la URL contiene esos params.
 * Si no hay params, regresa al cliente por defecto.
 */
export function useClientContext() {
  const [clientId, setClientId]     = useState(DEFAULT_CLIENT_ID);
  const [clientName, setClientName] = useState(DEFAULT_CLIENT_NAME);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id   = params.get("c");
    const name = params.get("cn");

    if (id) {
      setClientId(id);
      setIsImpersonating(true);
    }
    if (name) {
      setClientName(decodeURIComponent(name));
    }
  }, []);

  return { clientId, clientName, isImpersonating };
}

/** Construye la URL de impersonación para un cliente dado */
export function impersonateUrl(page: "dashboard" | "chat", clientId: string, clientName: string) {
  return `/${page}?c=${encodeURIComponent(clientId)}&cn=${encodeURIComponent(clientName)}`;
}

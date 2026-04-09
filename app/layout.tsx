import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KB Platform — Plazas Comerciales",
  description: "Plataforma inteligente de gestión de conocimiento para plazas comerciales",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KB Platform",
  },
};

export const viewport: Viewport = {
  themeColor: "#141621",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body>{children}</body>
    </html>
  );
}

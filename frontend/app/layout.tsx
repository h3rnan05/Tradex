import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tradex — Simulador educativo de inversión",
  description: "Plataforma educativa para practicar inversiones en grupo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import TickerTape from "@/components/TickerTape";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tradex — Simulador educativo de inversión",
  description: "Plataforma educativa para practicar inversiones en grupo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <TickerTape />
        {children}
      </body>
    </html>
  );
}

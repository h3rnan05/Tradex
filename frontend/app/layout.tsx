import type { Metadata } from "next";
import TickerTape from "@/components/TickerTape";
import BannerVerificacion from "@/components/BannerVerificacion";
import { ToastProvider } from "@/components/Toast";
import Notificaciones from "@/components/Notificaciones";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tradex — Simulador educativo de inversión",
  description: "Plataforma educativa para practicar inversiones en grupo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LanguageProvider>
          <ToastProvider>
            <BannerVerificacion />
            <TickerTape />
            {children}
            <Notificaciones />
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

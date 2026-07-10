import type { Metadata } from "next";
import TickerTape from "@/components/TickerTape";
import BannerVerificacion from "@/components/BannerVerificacion";
import { ToastProvider } from "@/components/Toast";
import Notificaciones from "@/components/Notificaciones";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://trademx.lat"),
  title: {
    default: "Tradex — Simulador educativo de inversión",
    template: "%s · Tradex",
  },
  description:
    "Tradex es una plataforma educativa para practicar inversiones en bolsa con capital virtual, en grupos guiados por tu maestro. Aprende a comprar y vender acciones sin riesgo.",
  keywords: [
    "simulador de inversión",
    "simulador de bolsa",
    "invertir en acciones",
    "educación financiera",
    "trading educativo",
    "Tradex",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Tradex — Simulador educativo de inversión",
    description:
      "Practica comprar y vender acciones con capital virtual, en grupos guiados por tu maestro.",
    url: "https://trademx.lat",
    siteName: "Tradex",
    locale: "es_MX",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;0,800;0,900;1,400;1,700&display=swap"
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

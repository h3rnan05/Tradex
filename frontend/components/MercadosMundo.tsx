"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { calcularEstadoMercado, MERCADOS } from "@/lib/mercados";
import { useLanguage } from "@/lib/i18n";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

interface PuntoMercado {
  codigo: string;
  nombre: string;
  ciudad: string;
  lat: number;
  lng: number;
  abierto: boolean;
  descripcion: string;
  horaLocal: string;
}

export default function MercadosMundo({ compacto = false }: { compacto?: boolean }) {
  const { t } = useLanguage();
  const contenedorRef = useRef<HTMLDivElement>(null);
  const globoRef = useRef<any>(null);
  const [ahora, setAhora] = useState<Date | null>(null);
  const [tamano, setTamano] = useState({ ancho: 400, alto: 400 });

  useEffect(() => {
    setAhora(new Date());
    const intervalo = setInterval(() => setAhora(new Date()), 30000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    function medir() {
      if (contenedorRef.current) {
        const ancho = contenedorRef.current.clientWidth;
        setTamano({ ancho, alto: compacto ? Math.min(ancho, 240) : Math.max(ancho, 320) });
      }
    }
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [compacto]);

  useEffect(() => {
    if (globoRef.current) {
      globoRef.current.controls().autoRotate = true;
      globoRef.current.controls().autoRotateSpeed = 0.4;
      globoRef.current.pointOfView({ lat: 20, lng: -30, altitude: 2.2 });
    }
  }, [tamano]);

  const puntos: PuntoMercado[] = useMemo(() => {
    if (!ahora) return [];
    return MERCADOS.map((mercado) => {
      const estado = calcularEstadoMercado(mercado, ahora);
      return {
        codigo: mercado.codigo,
        nombre: mercado.nombre,
        ciudad: mercado.ciudad,
        lat: mercado.lat,
        lng: mercado.lng,
        abierto: estado.abierto,
        descripcion: estado.descripcion,
        horaLocal: estado.horaLocal,
      };
    });
  }, [ahora]);

  return (
    <div
      className={`flex h-full flex-col rounded-none border border-fg/20 bg-canvas p-3 ${
        compacto ? "min-h-[260px]" : "min-h-[300px]"
      }`}
    >
      <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-fg/40">
        {t("globe.title")}
      </p>

      <div ref={contenedorRef} className="relative w-full flex-1 overflow-hidden">
        {ahora && (
          <Globe
            ref={globoRef}
            width={tamano.ancho}
            height={tamano.alto}
            globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            backgroundColor="#faf6ed"
            pointsData={puntos}
            pointLat="lat"
            pointLng="lng"
            pointColor={(p: any) => (p.abierto ? "#00ff66" : "#ff3b3b")}
            pointAltitude={0.01}
            pointRadius={0.45}
            htmlElementsData={puntos}
            htmlLat="lat"
            htmlLng="lng"
            htmlAltitude={0.015}
            htmlElement={(p: any) => {
              const el = document.createElement("div");
              el.style.pointerEvents = "none";
              el.style.fontFamily = "IBM Plex Mono, monospace";
              el.style.whiteSpace = "nowrap";
              el.style.transform = "translate(6px, -8px)";
              el.innerHTML = `
                <div style="
                  background:rgba(250,246,237,0.92);
                  border:1px solid rgba(26,14,0,0.18);
                  padding:2px 5px;
                  font-size:8px;
                  line-height:1.4;
                  color:#1a0e00;
                  box-shadow:0 1px 2px rgba(0,0,0,0.12);
                  backdrop-filter:blur(2px);
                ">
                  <span style="font-weight:700;font-size:8px;">${p.ciudad}</span>
                  <span style="color:${p.abierto ? "#007a2e" : "#cc1a1a"};font-weight:600;margin-left:4px;">${p.abierto ? "●" : "●"} ${p.horaLocal}</span>
                </div>
              `;
              return el;
            }}
          />
        )}
      </div>

      <p className="mt-2 text-center font-mono text-[10px] text-fg/30">
        {t("globe.drag")}
      </p>
    </div>
  );
}

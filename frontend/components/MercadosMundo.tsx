"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { calcularEstadoMercado, MERCADOS } from "@/lib/mercados";

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

export default function MercadosMundo() {
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
        setTamano({ ancho, alto: Math.max(ancho, 320) });
      }
    }
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

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
    <div className="flex h-full min-h-[300px] flex-col rounded-none border border-fg/20 bg-canvas p-3">
      <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-fg/40">
        Mercados globales en vivo
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
              el.style.display = "flex";
              el.style.alignItems = "center";
              el.style.gap = "4px";
              el.style.pointerEvents = "none";
              el.style.fontFamily = "IBM Plex Mono, monospace";
              el.style.whiteSpace = "nowrap";
              el.style.transform = "translate(8px, -10px)";
              el.innerHTML = `
                <div style="
                  background:#faf6ed;
                  border:1px solid rgba(26,14,0,0.25);
                  padding:3px 6px;
                  font-size:10px;
                  line-height:1.3;
                  color:#1a0e00;
                  box-shadow:0 1px 3px rgba(0,0,0,0.15);
                ">
                  <div style="font-weight:700;">${p.ciudad} · ${p.codigo}</div>
                  <div style="color:${p.abierto ? "#007a2e" : "#cc1a1a"};font-weight:600;">
                    ${p.abierto ? "Abierta" : "Cerrada"} · ${p.horaLocal}
                  </div>
                  <div style="color:rgba(26,14,0,0.55);">${p.descripcion}</div>
                </div>
              `;
              return el;
            }}
          />
        )}
      </div>

      <p className="mt-2 text-center font-mono text-[10px] text-fg/30">
        Arrastra el globo para explorar · puntos verdes = abierto · busca un ticker arriba para ver su cotización.
      </p>
    </div>
  );
}

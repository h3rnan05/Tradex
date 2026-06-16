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
  const [seleccionado, setSeleccionado] = useState<PuntoMercado | null>(null);

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
    <div className="flex h-full min-h-[300px] flex-col rounded-none border border-fg/20 bg-white p-3">
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
            backgroundColor="rgba(255,255,255,1)"
            pointsData={puntos}
            pointLat="lat"
            pointLng="lng"
            pointColor={(p: any) => (p.abierto ? "#00ff66" : "#ff3b3b")}
            pointAltitude={0.01}
            pointRadius={0.45}
            pointLabel={(p: any) => `${p.nombre}`}
            onPointClick={(p: any) => setSeleccionado(p)}
            onPointHover={(p: any) => setSeleccionado(p ?? null)}
            labelsData={puntos}
            labelLat="lat"
            labelLng="lng"
            labelText={(p: any) => `${p.codigo} · ${p.ciudad}`}
            labelSize={0.5}
            labelDotRadius={0}
            labelColor={(p: any) => (p.abierto ? "#007a2e" : "#cc1a1a")}
            labelAltitude={0.01}
            labelResolution={3}
          />
        )}

        {seleccionado && (
          <div className="absolute left-2 top-2 max-w-[200px] border border-fg/20 bg-panel/90 p-2 font-mono">
            <p className="text-[11px] font-bold text-fg">{seleccionado.ciudad}</p>
            <p className="text-[10px] text-fg/50">{seleccionado.nombre}</p>
            <p className="mt-1 text-[10px] tabular-nums text-fg/70">{seleccionado.horaLocal} local</p>
            <p className={`text-[10px] font-semibold ${seleccionado.abierto ? "text-ganancia" : "text-perdida"}`}>
              {seleccionado.descripcion}
            </p>
          </div>
        )}
      </div>

      <p className="mt-2 text-center font-mono text-[10px] text-fg/30">
        Arrastra el globo para explorar · puntos verdes = abierto · busca un ticker arriba para ver su cotización.
      </p>
    </div>
  );
}

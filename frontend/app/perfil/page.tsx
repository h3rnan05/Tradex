"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { api, ApiError } from "@/lib/api";
import { obtenerSesion, guardarSesion } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { useLanguage } from "@/lib/i18n";

interface UserProfile {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  escuela: string | null;
  ciudad: string | null;
  estado: string | null;
}

export default function PerfilPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [nombre, setNombre] = useState("");
  const [escuela, setEscuela] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [estado, setEstado] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const sesion = obtenerSesion();
    if (!sesion) {
      router.replace("/login");
      return;
    }
    api.get<UserProfile>("/auth/me")
      .then((data) => {
        setPerfil(data);
        setNombre(data.nombre);
        setEscuela(data.escuela ?? "");
        setCiudad(data.ciudad ?? "");
        setEstado(data.estado ?? "");
      })
      .catch(() => toast("No se pudo cargar el perfil", "error"))
      .finally(() => setCargando(false));
  }, [router, toast]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const actualizado = await api.patch<UserProfile>("/auth/me", {
        nombre: nombre || undefined,
        escuela: escuela || undefined,
        ciudad: ciudad || undefined,
        estado: estado || undefined,
      });
      setPerfil(actualizado);
      const sesion = obtenerSesion();
      if (sesion) guardarSesion({ ...sesion, nombre: actualizado.nombre });
      toast(t("profile.success"), "success");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Error al guardar", "error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-lg p-6">
        <h1 className="mb-6 text-2xl font-bold text-fg">{t("profile.title")}</h1>

        {cargando ? (
          <div className="h-64 animate-pulse border border-fg/10 bg-panel" />
        ) : perfil ? (
          <form onSubmit={guardar} className="border border-fg/10 bg-panel p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center bg-accent font-mono text-sm font-bold text-black">
                {perfil.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-mono text-sm font-bold text-fg">{perfil.nombre}</p>
                <p className="font-mono text-xs text-fg/40">{perfil.email} · {perfil.rol}</p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-fg/70">{t("profile.name")}</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border border-fg/20 bg-canvas px-3 py-2 text-sm text-fg"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-fg/70">Escuela</label>
              <input
                type="text"
                value={escuela}
                onChange={(e) => setEscuela(e.target.value)}
                className="w-full border border-fg/20 bg-canvas px-3 py-2 text-sm text-fg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-fg/70">Ciudad</label>
                <input
                  type="text"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  className="w-full border border-fg/20 bg-canvas px-3 py-2 text-sm text-fg"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-fg/70">Estado</label>
                <input
                  type="text"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full border border-fg/20 bg-canvas px-3 py-2 text-sm text-fg"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="mt-2 bg-accent px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-black hover:opacity-90 disabled:opacity-50"
            >
              {guardando ? t("profile.saving") : t("profile.save")}
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}

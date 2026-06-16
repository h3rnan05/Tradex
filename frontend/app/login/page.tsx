"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { guardarSesion } from "@/lib/auth";

interface TokenResponse {
  access_token: string;
  user_id: string;
  nombre: string;
  rol: "maestro" | "alumno";
}

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<"maestro" | "alumno">("alumno");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const ruta = modo === "login" ? "/auth/login" : "/auth/register";
      const payload =
        modo === "login" ? { email, password } : { email, password, nombre, rol };
      const data = await api.post<TokenResponse>(ruta, payload);

      guardarSesion({
        token: data.access_token,
        userId: data.user_id,
        nombre: data.nombre,
        rol: data.rol,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo conectar con el servidor");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-sm rounded-xl border border-term-green/20 bg-panel p-8 shadow-[0_0_30px_rgba(0,255,140,0.06)]">
        <h1 className="mb-1 font-mono text-2xl font-bold uppercase tracking-widest text-fg drop-shadow-[0_0_8px_rgba(0,255,140,0.5)]">
          <span className="text-term-green">■</span> Tradex
        </h1>
        <p className="mb-6 text-sm text-fg/40">
          {modo === "login" ? "Inicia sesión en tu cuenta" : "Crea una nueva cuenta"}
        </p>

        <form onSubmit={manejarSubmit} className="flex flex-col gap-4">
          {modo === "registro" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-fg/70">Nombre</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-md border border-fg/20 px-3 py-2 text-sm"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-fg/70">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-fg/20 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-fg/70">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-fg/20 px-3 py-2 text-sm"
            />
          </div>

          {modo === "registro" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-fg/70">Rol</label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value as "maestro" | "alumno")}
                className="w-full rounded-md border border-fg/20 px-3 py-2 text-sm"
              >
                <option value="alumno">Alumno</option>
                <option value="maestro">Maestro</option>
              </select>
            </div>
          )}

          {error && <p className="text-sm text-perdida">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="rounded-md bg-term-green px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-term hover:opacity-90 disabled:opacity-50"
          >
            {cargando ? "Cargando..." : modo === "login" ? "Iniciar sesión" : "Registrarme"}
          </button>
        </form>

        <button
          onClick={() => setModo(modo === "login" ? "registro" : "login")}
          className="mt-4 w-full text-center text-sm text-fg/40 hover:text-fg/70"
        >
          {modo === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </div>
    </main>
  );
}

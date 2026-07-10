"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { guardarSesion, type Rol } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";

interface TokenResponse {
  access_token: string;
  user_id: string;
  nombre: string;
  rol: Rol;
  email_verificado?: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [codigoGrupo, setCodigoGrupo] = useState("");
  const [esMaestro, setEsMaestro] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const ruta = modo === "login" ? "/auth/login" : "/auth/register";
      const payload =
        modo === "login"
          ? { email, password }
          : {
              email,
              password,
              nombre,
              es_maestro: esMaestro,
              ...(!esMaestro && codigoGrupo.trim() ? { codigo_grupo: codigoGrupo.trim().toUpperCase() } : {}),
            };
      const data = await api.post<TokenResponse>(ruta, payload);

      guardarSesion({
        token: data.access_token,
        userId: data.user_id,
        nombre: data.nombre,
        rol: data.rol,
        emailVerificado: data.email_verificado ?? false,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.error.noConnection"));
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-sm rounded-none border-2 border-accent bg-panel p-8 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.15)]">
        <h1 className="mb-1 font-mono text-2xl font-bold uppercase tracking-widest text-fg">
          <span className="text-accent">■</span> Tradex
        </h1>
        <p className="mb-6 text-sm text-fg/40">
          {modo === "login" ? t("login.subtitle.login") : t("login.subtitle.register")}
        </p>

        <form onSubmit={manejarSubmit} className="flex flex-col gap-4">
          {modo === "registro" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg/70">{t("login.accountType")}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEsMaestro(false)}
                  className={`rounded-none border px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors ${!esMaestro ? "border-accent bg-accent text-black" : "border-fg/20 text-fg/50 hover:text-fg"}`}
                >
                  {t("login.iAmStudent")}
                </button>
                <button
                  type="button"
                  onClick={() => setEsMaestro(true)}
                  className={`rounded-none border px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors ${esMaestro ? "border-accent bg-accent text-black" : "border-fg/20 text-fg/50 hover:text-fg"}`}
                >
                  {t("login.iAmTeacher")}
                </button>
              </div>
            </div>
          )}

          {modo === "registro" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-fg/70">{t("login.name")}</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-none border border-fg/20 px-3 py-2 text-sm"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-fg/70">{t("login.email")}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-none border border-fg/20 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-fg/70">{t("login.password")}</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-none border border-fg/20 px-3 py-2 text-sm"
            />
          </div>

          {modo === "registro" && !esMaestro && (
            <div>
              <label className="mb-1 block text-sm font-medium text-fg/70">
                {t("login.groupCode")} <span className="text-fg/40">{t("login.groupCodeOptional")}</span>
              </label>
              <input
                type="text"
                maxLength={6}
                value={codigoGrupo}
                onChange={(e) => setCodigoGrupo(e.target.value.toUpperCase())}
                placeholder={t("login.groupCodePlaceholder")}
                className="w-full rounded-none border border-fg/20 px-3 py-2 font-mono text-sm uppercase tracking-widest"
              />
              <p className="mt-1 text-xs text-fg/40">{t("login.groupCodeHint")}</p>
            </div>
          )}

          {error && <p className="text-sm text-perdida">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="rounded-none bg-accent px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-black hover:opacity-90 disabled:opacity-50"
          >
            {cargando ? t("login.loading") : modo === "login" ? t("login.submit.login") : t("login.submit.register")}
          </button>
        </form>

        <button
          onClick={() => setModo(modo === "login" ? "registro" : "login")}
          className="mt-4 w-full text-center text-sm text-fg/40 hover:text-fg/70"
        >
          {modo === "login" ? t("login.toggle.toRegister") : t("login.toggle.toLogin")}
        </button>

        {modo === "login" && (
          <Link href="/forgot-password" className="mt-2 block text-center text-sm text-fg/30 hover:text-fg/60">
            {t("login.forgotPassword")}
          </Link>
        )}
      </div>
    </main>
  );
}

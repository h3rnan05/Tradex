export type Rol = "maestro" | "alumno" | "admin" | "sponsor";

export interface Sesion {
  token: string;
  userId: string;
  nombre: string;
  rol: Rol;
}

const STORAGE_KEY = "tradex_token";
const SESSION_KEY = "tradex_session";

export function guardarSesion(sesion: Sesion) {
  localStorage.setItem(STORAGE_KEY, sesion.token);
  const serialized = JSON.stringify(sesion);
  localStorage.setItem(SESSION_KEY, serialized);
  // Also write a cookie so Next.js middleware can do coarse role checks
  document.cookie = `tradex_session=${encodeURIComponent(serialized)}; path=/; SameSite=Strict`;
}


export function obtenerSesion(): Sesion | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.userId || !parsed?.rol) return null;
    return parsed as Sesion;
  } catch {
    return null;
  }
}

export function cerrarSesion() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_KEY);
  if (typeof document !== "undefined") {
    document.cookie = "tradex_session=; path=/; max-age=0; SameSite=Strict";
  }
}

// Clase (grupo) activa del alumno.
//
// Un alumno puede pertenecer a varias clases y cada una tiene su propio
// portafolio (capital, posiciones, órdenes) aislado en el backend por
// grupo_id. Aquí guardamos cuál clase está viendo/operando actualmente
// para pasar ese grupo_id de forma consistente en todas las llamadas.

const CLAVE = "tradex_grupo_id";

export function getGrupoActivo(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CLAVE);
}

export function setGrupoActivo(grupoId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CLAVE, grupoId);
}

/** Añade ?grupo_id=... a una ruta si hay clase activa. */
export function conGrupo(path: string, grupoId?: string | null): string {
  const id = grupoId ?? getGrupoActivo();
  if (!id) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}grupo_id=${id}`;
}

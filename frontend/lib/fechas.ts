// Helpers para convertir entre <input type="date"> (YYYY-MM-DD, día local del
// usuario) y los timestamps ISO que guarda el API.
//
// Importante: `new Date("YYYY-MM-DD")` se interpreta como medianoche UTC, que
// en México es las 6pm del día ANTERIOR — por eso los grupos se marcaban como
// finalizados un día antes de la fecha elegida. Agregar la parte de hora hace
// que el string se interprete en la zona local del navegador.

/** Inicio del día local (00:00:00) como ISO UTC. Para fechas de inicio. */
export function inicioDeDiaISO(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toISOString();
}

/** Fin del día local (23:59:59.999) como ISO UTC. Para fechas de cierre:
 *  el grupo sigue activo durante todo el día elegido. */
export function finDeDiaISO(fecha: string): string {
  return new Date(`${fecha}T23:59:59.999`).toISOString();
}

/** Convierte un timestamp ISO del API al YYYY-MM-DD del día local,
 *  para rellenar un <input type="date">. No usar `.slice(0, 10)`: eso corta
 *  la fecha en UTC y puede caer en el día equivocado. */
export function aFechaLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

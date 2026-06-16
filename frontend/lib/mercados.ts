export interface Mercado {
  codigo: string;
  nombre: string;
  ciudad: string;
  timezone: string;
  apertura: string; // "HH:MM" en hora local del mercado
  cierre: string;
}

export const MERCADOS: Mercado[] = [
  { codigo: "NYSE", nombre: "New York Stock Exchange", ciudad: "Nueva York", timezone: "America/New_York", apertura: "09:30", cierre: "16:00" },
  { codigo: "LSE", nombre: "London Stock Exchange", ciudad: "Londres", timezone: "Europe/London", apertura: "08:00", cierre: "16:30" },
  { codigo: "FRA", nombre: "Deutsche Börse", ciudad: "Fráncfort", timezone: "Europe/Berlin", apertura: "09:00", cierre: "17:30" },
  { codigo: "TSE", nombre: "Tokyo Stock Exchange", ciudad: "Tokio", timezone: "Asia/Tokyo", apertura: "09:00", cierre: "15:00" },
  { codigo: "HKEX", nombre: "Hong Kong Stock Exchange", ciudad: "Hong Kong", timezone: "Asia/Hong_Kong", apertura: "09:30", cierre: "16:00" },
  { codigo: "ASX", nombre: "Australian Securities Exchange", ciudad: "Sídney", timezone: "Australia/Sydney", apertura: "10:00", cierre: "16:00" },
];

const DIAS_HABILES = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);

function parsearHora(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function partesEnZona(fecha: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const partes = formatter.formatToParts(fecha);
  const obtener = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return {
    horas: Number(obtener("hour")),
    minutos: Number(obtener("minute")),
    diaSemana: obtener("weekday"),
  };
}

export interface EstadoMercado {
  abierto: boolean;
  esDeNoche: boolean;
  horaLocal: string;
  minutosLocales: number;
  inicioUtcMin: number;
  finUtcMin: number;
  descripcion: string;
}

export function calcularEstadoMercado(mercado: Mercado, ahora: Date): EstadoMercado {
  const local = partesEnZona(ahora, mercado.timezone);
  const utc = partesEnZona(ahora, "UTC");

  const minutosLocales = local.horas * 60 + local.minutos;
  const minutosUtc = utc.horas * 60 + utc.minutos;

  const aperturaMin = parsearHora(mercado.apertura);
  const cierreMin = parsearHora(mercado.cierre);
  const esDiaHabil = DIAS_HABILES.has(local.diaSemana);
  const abierto = esDiaHabil && minutosLocales >= aperturaMin && minutosLocales < cierreMin;
  const esDeNoche = local.horas < 6 || local.horas >= 18;

  let descripcion: string;
  if (abierto) {
    const transcurridos = minutosLocales - aperturaMin;
    descripcion = `Abierta hace ${Math.floor(transcurridos / 60)}h ${transcurridos % 60}m`;
  } else if (esDiaHabil && minutosLocales < aperturaMin) {
    const faltan = aperturaMin - minutosLocales;
    descripcion = `Abre en ${Math.floor(faltan / 60)}h ${faltan % 60}m`;
  } else {
    descripcion = "Cerrada";
  }

  let offsetMin = minutosLocales - minutosUtc;
  if (offsetMin > 720) offsetMin -= 1440;
  if (offsetMin < -720) offsetMin += 1440;

  const inicioUtcMin = ((aperturaMin - offsetMin) % 1440 + 1440) % 1440;
  const finUtcMin = ((cierreMin - offsetMin) % 1440 + 1440) % 1440;

  return {
    abierto,
    esDeNoche,
    horaLocal: `${String(local.horas).padStart(2, "0")}:${String(local.minutos).padStart(2, "0")}`,
    minutosLocales,
    inicioUtcMin,
    finUtcMin,
    descripcion,
  };
}

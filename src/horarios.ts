// Cálculo de turnos libres. Lo usan la página (para mostrar horarios) y el servidor (para validar),
// así los dos cuentan igual. Todo en hora de Paraná.

import type { Catalogo, Tramo } from "./data";

export const ZONA_HORARIA = "America/Argentina/Buenos_Aires";
export const PASO_MIN = 30; // cada cuánto arranca un turno
export const MARGEN_HOY_MIN = 120; // para hoy, no se ofrecen turnos que arranquen en menos de 2 h

export type Intervalo = [number, number]; // minutos desde las 00:00

export const aMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const deMin = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export const esHora = (v: unknown): v is string =>
  typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

export function formatoDuracion(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

// Fecha y hora actuales en Paraná, sin importar dónde corra el código.
export function ahoraEnParana(): { hoy: string; minutos: number } {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONA_HORARIA,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return { hoy: `${partes.year}-${partes.month}-${partes.day}`, minutos: Number(partes.hour) * 60 + Number(partes.minute) };
}

export function diaDeSemana(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function sumarDias(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(y, m - 1, d + n));
  return f.toISOString().slice(0, 10);
}

export function tramosDe(cat: Catalogo, iso: string): Tramo[] {
  return cat.excepciones[iso] ?? cat.semana[diaDeSemana(iso)] ?? [];
}

// Ordena, descarta tramos inválidos y une los que se pisan.
export function limpiarTramos(tramos: Tramo[]): Tramo[] {
  const validos = tramos
    .filter((t) => esHora(t.desde) && esHora(t.hasta) && aMin(t.desde) < aMin(t.hasta))
    .sort((a, b) => aMin(a.desde) - aMin(b.desde));
  const unidos: Tramo[] = [];
  for (const t of validos) {
    const ultimo = unidos[unidos.length - 1];
    if (ultimo && aMin(t.desde) <= aMin(ultimo.hasta)) {
      if (aMin(t.hasta) > aMin(ultimo.hasta)) ultimo.hasta = t.hasta;
    } else unidos.push({ ...t });
  }
  return unidos.slice(0, 6);
}

export function turnosLibres(cat: Catalogo, iso: string, duracion: number, ocupados: Intervalo[]): string[] {
  const { hoy, minutos } = ahoraEnParana();
  if (iso < hoy || iso > sumarDias(hoy, cat.diasAMostrar)) return [];
  const minimo = iso === hoy ? minutos + MARGEN_HOY_MIN : 0;
  const libres: string[] = [];
  for (const t of tramosDe(cat, iso)) {
    for (let ini = aMin(t.desde); ini + duracion <= aMin(t.hasta); ini += PASO_MIN) {
      if (ini < minimo) continue;
      const fin = ini + duracion;
      if (ocupados.some(([a, b]) => ini < b && a < fin)) continue;
      libres.push(deMin(ini));
    }
  }
  return libres;
}

// Fechas que se pueden ofrecer: desde hoy hasta el alcance configurado.
export function fechasOfrecidas(cat: Catalogo): string[] {
  const { hoy } = ahoraEnParana();
  return Array.from({ length: cat.diasAMostrar + 1 }, (_, i) => sumarDias(hoy, i));
}

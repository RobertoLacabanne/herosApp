// Datos fijos del negocio y catálogo inicial. El catálogo vigente lo edita la profesional
// desde /panel y se guarda en Netlify Blobs; esto es solo el punto de partida.

import { limpiarTramos } from "./horarios";

export const NEGOCIO = {
  nombre: "ERHOS Estética",
  profesional: "Rocío",
  whatsapp: "5493434532914", // +54 9 343 453-2914
  whatsappVisible: "343 453-2914",
  direccion: "La Paz 668, Paraná, Entre Ríos",
  instagram: "erhosestetica",
};

export type ServicioId = "laser" | "facial";
export type Publico = "ella" | "el";

export interface Combo {
  id: string;
  nombre: string;
  items: string[];
}

export interface Tratamiento {
  nombre: string;
  detalle: string;
}

export interface Tramo {
  desde: string; // HH:MM
  hasta: string;
}

export interface Catalogo {
  duracionMin: Record<ServicioId, number>;
  zonas: Record<Publico, string[]>;
  combosLaser: Record<Publico, Combo[]>;
  tratamientos: Tratamiento[];
  combosFaciales: Combo[];
  semana: Tramo[][]; // índice 0 = domingo … 6 = sábado; vacío = no atiende
  excepciones: Record<string, Tramo[]>; // AAAA-MM-DD → horario de ese día; [] = no atiende
  diasAMostrar: number;
  horariosRevisados: boolean; // false mientras sigan los horarios de ejemplo
}

export const SERVICIOS: Record<ServicioId, { titulo: string; bajada: string }> = {
  laser: {
    titulo: "Depilación láser",
    bajada: "Elegí las zonas que querés tratar.",
  },
  facial: {
    titulo: "Tratamientos faciales",
    bajada: "Limpiezas, peeling y dermaplaning.",
  },
};

// Horario de ejemplo hasta que la profesional cargue el suyo (el panel le avisa que lo revise).
const MANANA_Y_TARDE: Tramo[] = [
  { desde: "09:00", hasta: "13:00" },
  { desde: "16:00", hasta: "20:00" },
];

export const CATALOGO_INICIAL: Catalogo = {
  duracionMin: { laser: 30, facial: 90 },
  zonas: {
    ella: ["Rostro completo", "Axilas", "Cavado completo", "Tiro de cola", "Media pierna", "Pierna completa"],
    el: [
      "Pecho",
      "Abdomen",
      "Espalda",
      "Hombros",
      "Axilas",
      "Glúteos",
      "Piernas completas",
      "Cavado completo",
      "Tiro de cola",
    ],
  },
  combosLaser: {
    ella: [
      { id: "ella-1", nombre: "Combo 1", items: ["Cavado completo", "Tiro de cola", "Axilas"] },
      { id: "ella-2", nombre: "Combo 2", items: ["Cavado completo", "Tiro de cola", "Axilas", "Media pierna"] },
      { id: "ella-3", nombre: "Combo 3", items: ["Cavado completo", "Tiro de cola", "Axilas", "Pierna completa"] },
      { id: "ella-4", nombre: "Combo 4", items: ["Rostro completo"] },
    ],
    el: [
      { id: "el-1", nombre: "Combo 1", items: ["Pecho", "Espalda", "Abdomen"] },
      { id: "el-2", nombre: "Combo 2", items: ["Piernas completas", "Glúteos"] },
      { id: "el-3", nombre: "Combo 3", items: ["Espalda", "Axilas", "Hombros"] },
      { id: "el-4", nombre: "Combo 4", items: ["Cavado completo", "Tiro de cola"] },
    ],
  },
  tratamientos: [
    { nombre: "Limpieza facial", detalle: "Higiene, extracción e hidratación." },
    { nombre: "Limpieza facial profunda", detalle: "Para pieles con más impurezas." },
    { nombre: "Peeling químico", detalle: "Renueva la textura y unifica el tono." },
    { nombre: "Dermaplaning", detalle: "Exfoliación que deja la piel suave y luminosa." },
  ],
  combosFaciales: [
    { id: "f-1", nombre: "Combo 1", items: ["Limpieza facial profunda", "Peeling químico"] },
    { id: "f-2", nombre: "Combo 2", items: ["Limpieza facial", "Dermaplaning"] },
    { id: "f-3", nombre: "Combo 3", items: ["Limpieza facial", "Dermaplaning", "Peeling químico"] },
  ],
  semana: [[], MANANA_Y_TARDE, MANANA_Y_TARDE, MANANA_Y_TARDE, MANANA_Y_TARDE, MANANA_Y_TARDE, [MANANA_Y_TARDE[0]]],
  excepciones: {},
  diasAMostrar: 21,
  horariosRevisados: false,
};

export const DURACIONES_POSIBLES = [15, 30, 45, 60, 75, 90, 120];

// Pedidos viejos (antes de los horarios) guardaban una franja en vez de una hora.
export const FRANJAS = [
  { id: "manana", nombre: "Mañana" },
  { id: "tarde", nombre: "Tarde" },
  { id: "indistinto", nombre: "Me da igual" },
] as const;

export type FranjaId = (typeof FRANJAS)[number]["id"];

// Normaliza un catálogo que viene de afuera (Blobs o el panel): descarta lo que no tenga la forma esperada.
export function normalizarCatalogo(entrada: unknown): Catalogo {
  const c = (entrada ?? {}) as Partial<Record<keyof Catalogo, unknown>>;
  const base = CATALOGO_INICIAL;

  const texto = (v: unknown, max = 80) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const textos = (v: unknown, max = 60) =>
    Array.isArray(v) ? [...new Set(v.map((x) => texto(x, max)).filter(Boolean))].slice(0, 40) : null;
  const combos = (v: unknown, validos: string[]): Combo[] | null =>
    Array.isArray(v)
      ? v
          .map((x, i) => {
            const o = (x ?? {}) as Record<string, unknown>;
            const items = (textos(o.items) ?? []).filter((it) => validos.includes(it));
            return { id: texto(o.id, 40) || `c-${Date.now()}-${i}`, nombre: texto(o.nombre, 40), items };
          })
          .filter((x) => x.nombre && x.items.length)
          .slice(0, 12)
      : null;

  const d = (c.duracionMin ?? {}) as Record<string, unknown>;
  const duracion = (v: unknown, base: number) => (DURACIONES_POSIBLES.includes(Number(v)) ? Number(v) : base);
  const tramos = (v: unknown): Tramo[] =>
    Array.isArray(v)
      ? limpiarTramos(
          v.map((t) => {
            const o = (t ?? {}) as Record<string, unknown>;
            return { desde: texto(o.desde, 5), hasta: texto(o.hasta, 5) };
          }),
        )
      : [];
  const viejo = entrada as { diasAtencion?: unknown; diasBloqueados?: unknown } | null;

  // Semana: la nueva forma, o la migración desde "días de atención" con el horario de ejemplo.
  let semana: Tramo[][];
  if (Array.isArray(c.semana) && c.semana.length === 7) semana = c.semana.map(tramos);
  else if (Array.isArray(viejo?.diasAtencion)) {
    const dias = viejo.diasAtencion as unknown[];
    semana = base.semana.map((t, i) => (dias.includes(i) ? (t.length ? t : MANANA_Y_TARDE) : []));
  } else semana = base.semana;

  const excepciones: Record<string, Tramo[]> = {};
  const fechaOk = (k: string) => /^\d{4}-\d{2}-\d{2}$/.test(k);
  if (c.excepciones && typeof c.excepciones === "object") {
    for (const [k, v] of Object.entries(c.excepciones as Record<string, unknown>).slice(0, 300)) {
      if (fechaOk(k)) excepciones[k] = tramos(v);
    }
  }
  if (Array.isArray(viejo?.diasBloqueados)) {
    for (const k of viejo.diasBloqueados as unknown[]) if (typeof k === "string" && fechaOk(k)) excepciones[k] ??= [];
  }
  const z = (c.zonas ?? {}) as Record<string, unknown>;
  const cl = (c.combosLaser ?? {}) as Record<string, unknown>;

  const zonas = { ella: textos(z.ella) ?? base.zonas.ella, el: textos(z.el) ?? base.zonas.el };
  const tratamientos = Array.isArray(c.tratamientos)
    ? c.tratamientos
        .map((x) => {
          const o = (x ?? {}) as Record<string, unknown>;
          return { nombre: texto(o.nombre, 60), detalle: texto(o.detalle, 120) };
        })
        .filter((x) => x.nombre)
        .slice(0, 20)
    : base.tratamientos;
  const nombresTrat = tratamientos.map((t) => t.nombre);

  const mostrar = Number(c.diasAMostrar);

  return {
    duracionMin: { laser: duracion(d.laser, base.duracionMin.laser), facial: duracion(d.facial, base.duracionMin.facial) },
    zonas,
    combosLaser: {
      ella: combos(cl.ella, zonas.ella) ?? base.combosLaser.ella,
      el: combos(cl.el, zonas.el) ?? base.combosLaser.el,
    },
    tratamientos,
    combosFaciales: combos(c.combosFaciales, nombresTrat) ?? base.combosFaciales,
    semana,
    excepciones,
    diasAMostrar: Number.isInteger(mostrar) && mostrar >= 7 && mostrar <= 90 ? mostrar : base.diasAMostrar,
    horariosRevisados: c.horariosRevisados === true,
  };
}

// Datos fijos del negocio y catálogo inicial. El catálogo vigente lo edita la profesional
// desde /panel y se guarda en Netlify Blobs; esto es solo el punto de partida.

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

export interface Catalogo {
  duraciones: Record<ServicioId, string>;
  zonas: Record<Publico, string[]>;
  combosLaser: Record<Publico, Combo[]>;
  tratamientos: Tratamiento[];
  combosFaciales: Combo[];
  diasAtencion: number[]; // 0 = domingo … 6 = sábado
  diasAMostrar: number;
  diasBloqueados: string[]; // AAAA-MM-DD
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

export const CATALOGO_INICIAL: Catalogo = {
  duraciones: {
    laser: "30 min aprox.",
    facial: "1 h 30 aprox.",
  },
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
  diasAtencion: [1, 2, 3, 4, 5, 6],
  diasAMostrar: 21,
  diasBloqueados: [],
};

export const FRANJAS = [
  { id: "manana", nombre: "Mañana", detalle: "Antes del mediodía" },
  { id: "tarde", nombre: "Tarde", detalle: "Después del mediodía" },
  { id: "indistinto", nombre: "Me da igual", detalle: "Lo que tengas libre" },
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

  const d = (c.duraciones ?? {}) as Record<string, unknown>;
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

  const dias = Array.isArray(c.diasAtencion)
    ? [...new Set(c.diasAtencion.filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= 6))]
    : base.diasAtencion;
  const mostrar = Number(c.diasAMostrar);

  return {
    duraciones: { laser: texto(d.laser, 30) || base.duraciones.laser, facial: texto(d.facial, 30) || base.duraciones.facial },
    zonas,
    combosLaser: {
      ella: combos(cl.ella, zonas.ella) ?? base.combosLaser.ella,
      el: combos(cl.el, zonas.el) ?? base.combosLaser.el,
    },
    tratamientos,
    combosFaciales: combos(c.combosFaciales, nombresTrat) ?? base.combosFaciales,
    diasAtencion: dias.length ? dias.sort() : base.diasAtencion,
    diasAMostrar: Number.isInteger(mostrar) && mostrar >= 7 && mostrar <= 90 ? mostrar : base.diasAMostrar,
    diasBloqueados: Array.isArray(c.diasBloqueados)
      ? [...new Set(c.diasBloqueados.filter((x): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x)))]
          .sort()
          .slice(0, 200)
      : base.diasBloqueados,
  };
}

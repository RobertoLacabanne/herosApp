// Catálogo y datos del negocio. Para cambiar zonas, combos u horarios, editá este archivo.

export const NEGOCIO = {
  nombre: "ERHOS Estética",
  profesional: "Rocío",
  whatsapp: "5493434532914", // +54 9 343 453-2914
  whatsappVisible: "343 453-2914",
  direccion: "La Paz 668, Paraná, Entre Ríos",
  instagram: "erhosestetica",
};

// Días en que se pueden pedir turnos (0 = domingo … 6 = sábado).
export const DIAS_DE_ATENCION = [1, 2, 3, 4, 5, 6];
export const DIAS_A_MOSTRAR = 21;

export type ServicioId = "laser" | "facial";
export type Publico = "ella" | "el";

export interface Combo {
  id: string;
  nombre: string;
  items: string[];
}

export const SERVICIOS: Record<
  ServicioId,
  { titulo: string; bajada: string; duracion: string }
> = {
  laser: {
    titulo: "Depilación láser",
    bajada: "Elegí las zonas que querés tratar.",
    duracion: "30 min aprox.",
  },
  facial: {
    titulo: "Tratamientos faciales",
    bajada: "Limpiezas, peeling y dermaplaning.",
    duracion: "1 h 30 aprox.",
  },
};

export const ZONAS: Record<Publico, string[]> = {
  ella: [
    "Rostro completo",
    "Axilas",
    "Cavado completo",
    "Tiro de cola",
    "Media pierna",
    "Pierna completa",
  ],
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
};

export const COMBOS_LASER: Record<Publico, Combo[]> = {
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
};

export const TRATAMIENTOS_FACIALES: { nombre: string; detalle: string }[] = [
  { nombre: "Limpieza facial", detalle: "Higiene, extracción e hidratación." },
  { nombre: "Limpieza facial profunda", detalle: "Para pieles con más impurezas." },
  { nombre: "Peeling químico", detalle: "Renueva la textura y unifica el tono." },
  { nombre: "Dermaplaning", detalle: "Exfoliación que deja la piel suave y luminosa." },
];

export const COMBOS_FACIALES: Combo[] = [
  { id: "f-1", nombre: "Combo 1", items: ["Limpieza facial profunda", "Peeling químico"] },
  { id: "f-2", nombre: "Combo 2", items: ["Limpieza facial", "Dermaplaning"] },
  { id: "f-3", nombre: "Combo 3", items: ["Limpieza facial", "Dermaplaning", "Peeling químico"] },
];

export const FRANJAS = [
  { id: "manana", nombre: "Mañana", detalle: "Antes del mediodía" },
  { id: "tarde", nombre: "Tarde", detalle: "Después del mediodía" },
  { id: "indistinto", nombre: "Me da igual", detalle: "Lo que tengas libre" },
] as const;

export type FranjaId = (typeof FRANJAS)[number]["id"];

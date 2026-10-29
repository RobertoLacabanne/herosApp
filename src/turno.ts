import {
  FRANJAS,
  NEGOCIO,
  SERVICIOS,
  type Catalogo,
  type Combo,
  type FranjaId,
  type Publico,
  type ServicioId,
} from "./data";

export interface Pedido {
  servicio: ServicioId | null;
  publico: Publico;
  items: string[];
  otraZona: string;
  fecha: string | null; // AAAA-MM-DD
  franja: FranjaId | null;
  nombre: string;
  telefono: string;
  primeraVez: boolean | null;
  comentario: string;
}

export interface Solicitud {
  id: string;
  creado: string;
  estado: "pendiente" | "confirmado" | "cancelado";
  servicio: ServicioId;
  publico: Publico | null;
  combo: string | null;
  items: string[];
  otraZona: string;
  fecha: string;
  franja: FranjaId;
  nombre: string;
  telefono: string;
  primeraVez: boolean | null;
  comentario: string;
}

export const pedidoVacio: Pedido = {
  servicio: null,
  publico: "ella",
  items: [],
  otraZona: "",
  fecha: null,
  franja: null,
  nombre: "",
  telefono: "",
  primeraVez: null,
  comentario: "",
};

export function combosDe(p: Pick<Pedido, "servicio" | "publico">, cat: Catalogo): Combo[] {
  if (p.servicio === "laser") return cat.combosLaser[p.publico];
  if (p.servicio === "facial") return cat.combosFaciales;
  return [];
}

const mismoConjunto = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

export function comboElegido(p: Pedido, cat: Catalogo): Combo | null {
  return combosDe(p, cat).find((c) => mismoConjunto(c.items, p.items)) ?? null;
}

export function parseFecha(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isoDe(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

export function fechaLarga(iso: string): string {
  const txt = parseFecha(iso).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export function nombreFranja(id: FranjaId): string {
  return FRANJAS.find((f) => f.id === id)?.nombre ?? id;
}

export function codigoNuevo(): string {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

export function pedidoListo(p: Pedido): boolean {
  return (
    !!p.servicio &&
    (p.items.length > 0 || p.otraZona.trim().length > 0) &&
    !!p.fecha &&
    !!p.franja &&
    p.nombre.trim().length > 1
  );
}

export type Borrador = Omit<Solicitud, "fecha" | "franja"> & {
  fecha: string | null;
  franja: FranjaId | null;
};

export function aSolicitud(p: Pedido, id: string, cat: Catalogo): Solicitud {
  return aBorrador(p, id, cat) as Solicitud;
}

export function aBorrador(p: Pedido, id: string, cat: Catalogo): Borrador {
  return {
    id,
    creado: new Date().toISOString(),
    estado: "pendiente",
    servicio: p.servicio ?? "laser",
    publico: p.servicio === "laser" ? p.publico : null,
    combo: comboElegido(p, cat)?.nombre ?? null,
    items: p.items,
    otraZona: p.otraZona.trim(),
    fecha: p.fecha,
    franja: p.franja,
    nombre: p.nombre.trim(),
    telefono: p.telefono.trim(),
    primeraVez: p.primeraVez,
    comentario: p.comentario.trim(),
  };
}

const FRANJA_EN_MENSAJE: Record<FranjaId, string> = {
  manana: "por la mañana",
  tarde: "por la tarde",
  indistinto: "en el horario que tengas libre",
};

export function mensajeWhatsApp(s: Borrador): string {
  const servicio = SERVICIOS[s.servicio].titulo;
  const titulo =
    s.servicio === "laser"
      ? `${servicio}${s.publico === "el" ? " (hombre)" : ""}`
      : servicio;
  const etiquetaItems = s.servicio === "laser" ? "Zonas" : "Tratamiento";
  const lineas = [
    `¡Hola ${NEGOCIO.profesional}! Quiero pedir un turno 🌿`,
    "",
    `*${titulo}*`,
  ];
  if (s.items.length) {
    lineas.push(`${etiquetaItems}${s.combo ? ` (${s.combo})` : ""}: ${s.items.join(", ")}`);
  }
  if (s.otraZona) lineas.push(`${s.items.length ? "Además" : etiquetaItems}: ${s.otraZona}`);
  if (s.fecha || s.nombre) lineas.push("");
  if (s.fecha) {
    lineas.push(`📅 ${fechaLarga(s.fecha)}${s.franja ? `, ${FRANJA_EN_MENSAJE[s.franja]}` : ""}`);
  }
  if (s.nombre) lineas.push(`👤 ${s.nombre}`);
  if (s.primeraVez !== null) {
    lineas.push(s.primeraVez ? "Es mi primera vez en ERHOS." : "Ya me atendí antes con vos.");
  }
  if (s.comentario) lineas.push("", `📝 ${s.comentario}`);
  if (s.id) lineas.push("", `Pedido #${s.id}`);
  return lineas.join("\n");
}

export function linkWhatsApp(texto: string, numero = NEGOCIO.whatsapp): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

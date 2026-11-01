import type { Config, Context } from "@netlify/functions";
import { esHora, turnosLibres } from "../../src/horarios.ts";
import { sesionActual } from "../lib/sesion.mts";
import { leerCatalogo, listarSolicitudes, ocupados, storeSolicitudes } from "../lib/solicitudes.mts";

const ESTADOS = ["pendiente", "confirmado", "cancelado"] as const;
const SERVICIOS = ["laser", "facial"] as const;

const json = (data: unknown, status = 200) => Response.json(data, { status });

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function crear(req: Request, context: Context) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return json({ error: "Pedido inválido" }, 400);
  }

  // La profesional puede anotar turnos a mano desde el panel (por ejemplo, los que le piden por teléfono).
  const manual = b.manual === true && !!(await sesionActual(context));

  const id = texto(b.id, 8).toUpperCase();
  const fecha = texto(b.fecha, 10);
  const hora = texto(b.hora, 5);
  const servicio = b.servicio as (typeof SERVICIOS)[number];
  const items = Array.isArray(b.items)
    ? b.items.filter((x): x is string => typeof x === "string").slice(0, 20).map((x) => x.slice(0, 60))
    : [];
  const otraZona = texto(b.otraZona, 200);
  const nombre = texto(b.nombre, 80);

  if (
    !/^[A-Z0-9]{5}$/.test(id) ||
    !SERVICIOS.includes(servicio) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    !esHora(hora) ||
    (!manual && items.length === 0 && !otraZona) ||
    nombre.length < 2
  ) {
    return json({ error: "Faltan datos del turno" }, 400);
  }

  const catalogo = await leerCatalogo();
  const duracion = catalogo.duracionMin[servicio];

  if (!manual) {
    const libres = turnosLibres(catalogo, fecha, duracion, ocupados(await listarSolicitudes(), fecha));
    if (!libres.includes(hora)) {
      return json({ error: "Ese horario se acaba de ocupar. Elegí otro, por favor.", codigo: "ocupado" }, 409);
    }
  }

  const solicitud = {
    id,
    creado: new Date().toISOString(),
    estado: manual ? "confirmado" : "pendiente",
    servicio,
    publico: servicio === "laser" && (b.publico === "el" || b.publico === "ella") ? b.publico : null,
    combo: texto(b.combo, 40) || null,
    items,
    otraZona,
    fecha,
    hora,
    duracion,
    manual: manual || undefined,
    nombre,
    telefono: texto(b.telefono, 30),
    primeraVez: typeof b.primeraVez === "boolean" ? b.primeraVez : null,
    comentario: texto(b.comentario, 500),
  };

  const { modified } = await storeSolicitudes().setJSON(id, solicitud, { onlyIfNew: true });
  if (!modified) return json({ error: "Ese pedido ya existe" }, 409);
  return json({ ok: true, id }, 201);
}

async function listar() {
  const solicitudes = (await listarSolicitudes()).sort((a, b) => (a.creado < b.creado ? 1 : -1));
  return json({ solicitudes });
}

async function actualizar(req: Request, id: string) {
  const { estado } = await req.json().catch(() => ({}));
  if (!ESTADOS.includes(estado)) return json({ error: "Estado inválido" }, 400);
  const s = storeSolicitudes();
  const actual = await s.get(id, { type: "json" });
  if (!actual) return json({ error: "No encontré ese pedido" }, 404);
  await s.setJSON(id, { ...actual, estado });
  return json({ ok: true });
}

async function borrar(id: string) {
  await storeSolicitudes().delete(id);
  return json({ ok: true });
}

export default async (req: Request, context: Context) => {
  const id = context.params.id;

  if (req.method === "POST" && !id) return crear(req, context);

  if (!(await sesionActual(context))) return json({ error: "Sin sesión" }, 401);

  if (req.method === "GET" && !id) return listar();
  if (req.method === "PATCH" && id) return actualizar(req, id);
  if (req.method === "DELETE" && id) return borrar(id);

  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: ["/api/turnos", "/api/turnos/:id"],
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

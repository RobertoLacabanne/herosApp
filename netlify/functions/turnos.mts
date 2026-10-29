import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";

const ESTADOS = ["pendiente", "confirmado", "cancelado"] as const;
const SERVICIOS = ["laser", "facial"];
const FRANJAS = ["manana", "tarde", "indistinto"];

const store = () => getStore({ name: "solicitudes", consistency: "strong" });

const json = (data: unknown, status = 200) => Response.json(data, { status });

const texto = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

function autorizado(req: Request) {
  const pin = Netlify.env.get("PANEL_PIN");
  return !!pin && req.headers.get("x-panel-pin") === pin;
}

async function crear(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return json({ error: "Pedido inválido" }, 400);
  }

  const id = texto(b.id, 8).toUpperCase();
  const fecha = texto(b.fecha, 10);
  const items = Array.isArray(b.items)
    ? b.items.filter((x): x is string => typeof x === "string").slice(0, 20).map((x) => x.slice(0, 60))
    : [];
  const otraZona = texto(b.otraZona, 200);
  const nombre = texto(b.nombre, 80);

  if (
    !/^[A-Z0-9]{5}$/.test(id) ||
    !SERVICIOS.includes(b.servicio as string) ||
    !FRANJAS.includes(b.franja as string) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    (items.length === 0 && !otraZona) ||
    nombre.length < 2
  ) {
    return json({ error: "Faltan datos del turno" }, 400);
  }

  const solicitud = {
    id,
    creado: new Date().toISOString(),
    estado: "pendiente",
    servicio: b.servicio,
    publico: b.publico === "el" || b.publico === "ella" ? b.publico : null,
    combo: texto(b.combo, 40) || null,
    items,
    otraZona,
    fecha,
    franja: b.franja,
    nombre,
    telefono: texto(b.telefono, 30),
    primeraVez: typeof b.primeraVez === "boolean" ? b.primeraVez : null,
    comentario: texto(b.comentario, 500),
  };

  const { modified } = await store().setJSON(id, solicitud, { onlyIfNew: true });
  if (!modified) return json({ error: "Ese pedido ya existe" }, 409);
  return json({ ok: true, id }, 201);
}

async function listar() {
  const s = store();
  const { blobs } = await s.list();
  const todas = await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })));
  const solicitudes = todas
    .filter(Boolean)
    .sort((a, b) => (a.creado < b.creado ? 1 : -1));
  return json({ solicitudes });
}

async function actualizar(req: Request, id: string) {
  const { estado } = await req.json().catch(() => ({}));
  if (!ESTADOS.includes(estado)) return json({ error: "Estado inválido" }, 400);
  const s = store();
  const actual = await s.get(id, { type: "json" });
  if (!actual) return json({ error: "No encontré ese pedido" }, 404);
  await s.setJSON(id, { ...actual, estado });
  return json({ ok: true });
}

async function borrar(id: string) {
  await store().delete(id);
  return json({ ok: true });
}

export default async (req: Request, context: Context) => {
  const id = context.params.id;

  if (req.method === "POST" && !id) return crear(req);

  if (!autorizado(req)) return json({ error: "PIN incorrecto" }, 401);

  if (req.method === "GET" && !id) return listar();
  if (req.method === "PATCH" && id) return actualizar(req, id);
  if (req.method === "DELETE" && id) return borrar(id);

  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: ["/api/turnos", "/api/turnos/:id"],
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

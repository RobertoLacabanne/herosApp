import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import { CATALOGO_INICIAL, normalizarCatalogo } from "../../src/data.ts";
import { json, sesionActual } from "../lib/sesion.mts";

const store = () => getStore({ name: "config", consistency: "strong" });

export default async (req: Request, context: Context) => {
  if (req.method === "GET") {
    const guardado = await store().get("catalogo", { type: "json" });
    return json(guardado ? normalizarCatalogo(guardado) : CATALOGO_INICIAL);
  }

  if (req.method === "PUT") {
    if (!(await sesionActual(context))) return json({ error: "Sin sesión" }, 401);
    const entrada = await req.json().catch(() => null);
    if (!entrada) return json({ error: "Catálogo inválido" }, 400);
    const catalogo = normalizarCatalogo(entrada);
    await store().setJSON("catalogo", catalogo);
    return json(catalogo);
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: "/api/catalogo",
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

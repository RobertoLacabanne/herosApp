import type { Config, Context } from "@netlify/functions";
import { normalizarCatalogo } from "../../src/data.ts";
import { ahoraEnParana } from "../../src/horarios.ts";
import { json, sesionActual } from "../lib/sesion.mts";
import { guardarCatalogo, leerCatalogo } from "../lib/solicitudes.mts";

export default async (req: Request, context: Context) => {
  if (req.method === "GET") {
    return Response.json(await leerCatalogo(), { headers: { "cache-control": "no-store" } });
  }

  if (req.method === "PUT") {
    if (!(await sesionActual(context))) return json({ error: "Sin sesión" }, 401);
    const entrada = await req.json().catch(() => null);
    if (!entrada) return json({ error: "Catálogo inválido" }, 400);
    const catalogo = normalizarCatalogo(entrada);
    // los días especiales que ya pasaron no hacen falta
    const { hoy } = ahoraEnParana();
    catalogo.excepciones = Object.fromEntries(Object.entries(catalogo.excepciones).filter(([k]) => k >= hoy));
    await guardarCatalogo(catalogo);
    return json(catalogo);
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: "/api/catalogo",
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

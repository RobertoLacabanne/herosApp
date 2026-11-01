import type { Config } from "@netlify/functions";
import type { Intervalo } from "../../src/horarios.ts";
import { listarSolicitudes, ocupados } from "../lib/solicitudes.mts";

// Público: solo devuelve qué horarios están tomados, sin ningún dato de las personas.
export default async (req: Request) => {
  const url = new URL(req.url);
  const desde = url.searchParams.get("desde") ?? "";
  const hasta = url.searchParams.get("hasta") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta) || hasta < desde) {
    return Response.json({ error: "Rango inválido" }, { status: 400 });
  }
  const lista = (await listarSolicitudes()).filter((s) => s.fecha >= desde && s.fecha <= hasta);
  const porFecha: Record<string, Intervalo[]> = {};
  for (const fecha of new Set(lista.map((s) => s.fecha))) {
    const o = ocupados(lista, fecha);
    if (o.length) porFecha[fecha] = o;
  }
  return Response.json({ ocupados: porFecha }, { headers: { "cache-control": "no-store" } });
};

export const config: Config = {
  path: "/api/ocupados",
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

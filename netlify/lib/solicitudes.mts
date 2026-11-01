import { getStore } from "@netlify/blobs";
import { CATALOGO_INICIAL, normalizarCatalogo, type Catalogo } from "../../src/data.ts";
import { aMin, type Intervalo } from "../../src/horarios.ts";
import type { Solicitud } from "../../src/turno.ts";

export const storeSolicitudes = () => getStore({ name: "solicitudes", consistency: "strong" });
const storeConfig = () => getStore({ name: "config", consistency: "strong" });

export async function leerCatalogo(): Promise<Catalogo> {
  const guardado = await storeConfig().get("catalogo", { type: "json" });
  return guardado ? normalizarCatalogo(guardado) : CATALOGO_INICIAL;
}

export async function guardarCatalogo(c: Catalogo) {
  await storeConfig().setJSON("catalogo", c);
}

export async function listarSolicitudes(): Promise<Solicitud[]> {
  const s = storeSolicitudes();
  const { blobs } = await s.list();
  const todas = await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" }) as Promise<Solicitud | null>));
  return todas.filter((x): x is Solicitud => !!x);
}

// Turnos que ocupan la agenda: los no cancelados que tienen hora.
export function ocupados(lista: Solicitud[], fecha: string): Intervalo[] {
  return lista
    .filter((s) => s.fecha === fecha && s.estado !== "cancelado" && s.hora)
    .map((s) => {
      const ini = aMin(s.hora!);
      return [ini, ini + (s.duracion ?? 30)] as Intervalo;
    });
}

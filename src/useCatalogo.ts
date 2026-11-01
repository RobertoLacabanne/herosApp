import { useEffect, useState } from "react";
import { CATALOGO_INICIAL, normalizarCatalogo, type Catalogo } from "./data";

export async function traerCatalogo(): Promise<Catalogo> {
  const res = await fetch("/api/catalogo");
  if (!res.ok) throw new Error("catalogo");
  return normalizarCatalogo(await res.json());
}

export function useCatalogo(): Catalogo {
  const [catalogo, setCatalogo] = useState<Catalogo>(CATALOGO_INICIAL);
  useEffect(() => {
    traerCatalogo()
      .then(setCatalogo)
      .catch(() => {
        /* sin red: queda el catálogo inicial */
      });
  }, []);
  return catalogo;
}

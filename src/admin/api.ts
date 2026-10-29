export class SinSesion extends Error {}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...init.headers },
  });
  if (res.status === 401 && !path.endsWith("/login")) throw new SinSesion();
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(datos.error ?? "Algo salió mal. Probá de nuevo.");
  return datos as T;
}

export type Aviso = { texto: string; tipo?: "ok" | "error" };

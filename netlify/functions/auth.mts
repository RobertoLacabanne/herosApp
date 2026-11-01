import type { Config, Context } from "@netlify/functions";
import {
  abrirSesion,
  cambiarPassword,
  cerrarSesion,
  json,
  obtenerCuenta,
  passwordValida,
  sesionActual,
} from "../lib/sesion.mts";

async function leer(req: Request): Promise<Record<string, unknown>> {
  return req.json().catch(() => ({}));
}

export default async (req: Request, context: Context) => {
  const accion = context.params.accion;

  if (accion === "yo" && req.method === "GET") {
    const cuenta = await sesionActual(context);
    return cuenta ? json({ usuario: cuenta.usuario }) : json({ error: "Sin sesión" }, 401);
  }

  if (accion === "login" && req.method === "POST") {
    const { usuario, password } = await leer(req);
    const cuenta = await obtenerCuenta();
    if (!cuenta) return json({ error: "La cuenta todavía no está configurada" }, 503);
    const okUsuario = typeof usuario === "string" && usuario.trim().toLowerCase() === cuenta.usuario;
    const okPass = typeof password === "string" && (await passwordValida(cuenta, password));
    if (!okUsuario || !okPass) return json({ error: "Usuario o contraseña incorrectos" }, 401);
    abrirSesion(context, cuenta);
    return json({ usuario: cuenta.usuario });
  }

  if (accion === "logout" && req.method === "POST") {
    cerrarSesion(context);
    return json({ ok: true });
  }

  if (accion === "password" && req.method === "POST") {
    const cuenta = await sesionActual(context);
    if (!cuenta) return json({ error: "Sin sesión" }, 401);
    const { actual, nueva } = await leer(req);
    if (typeof actual !== "string" || !(await passwordValida(cuenta, actual))) {
      return json({ error: "La contraseña actual no es correcta" }, 400);
    }
    if (typeof nueva !== "string" || nueva.length < 8 || nueva.length > 100) {
      return json({ error: "La nueva contraseña tiene que tener al menos 8 caracteres" }, 400);
    }
    // Cambiar la contraseña invalida las sesiones abiertas en otros dispositivos.
    abrirSesion(context, await cambiarPassword(cuenta, nueva));
    return json({ ok: true });
  }

  return json({ error: "No encontrado" }, 404);
};

export const config: Config = {
  path: "/api/auth/:accion",
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

const scryptAsync = promisify(scrypt) as (pass: string, salt: string, len: number) => Promise<Buffer>;

export const COOKIE = "erhos_sesion";
const DURACION_MS = 60 * 24 * 60 * 60 * 1000; // 60 días: la sesión queda abierta en su celular

interface Cuenta {
  usuario: string;
  salt: string;
  hash: string;
  version: number;
}

const store = () => getStore({ name: "admin", consistency: "strong" });

export const json = (data: unknown, status = 200) => Response.json(data, { status });

function secreto() {
  const s = Netlify.env.get("SESSION_SECRET");
  if (!s || s.length < 32) throw new Error("Falta SESSION_SECRET");
  return s;
}

async function hashear(password: string, salt: string) {
  return (await scryptAsync(password, salt, 64)).toString("hex");
}

export async function obtenerCuenta(): Promise<Cuenta | null> {
  const s = store();
  const cuenta = (await s.get("cuenta", { type: "json" })) as Cuenta | null;
  if (cuenta) return cuenta;

  // Primera vez: crea la cuenta con los datos iniciales cargados en las variables de entorno.
  const usuario = Netlify.env.get("ADMIN_USUARIO");
  const inicial = Netlify.env.get("ADMIN_PASSWORD_INICIAL");
  if (!usuario || !inicial) return null;
  const salt = randomBytes(16).toString("hex");
  const nueva: Cuenta = { usuario: usuario.toLowerCase(), salt, hash: await hashear(inicial, salt), version: 1 };
  await s.setJSON("cuenta", nueva, { onlyIfNew: true });
  return (await s.get("cuenta", { type: "json" })) as Cuenta;
}

export async function passwordValida(cuenta: Cuenta, password: string) {
  const a = Buffer.from(await hashear(password, cuenta.salt), "hex");
  const b = Buffer.from(cuenta.hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function cambiarPassword(cuenta: Cuenta, nueva: string): Promise<Cuenta> {
  const salt = randomBytes(16).toString("hex");
  const actualizada = { ...cuenta, salt, hash: await hashear(nueva, salt), version: cuenta.version + 1 };
  await store().setJSON("cuenta", actualizada);
  return actualizada;
}

const firmar = (datos: string) => createHmac("sha256", secreto()).update(datos).digest("base64url");

export function abrirSesion(context: Context, cuenta: Cuenta) {
  const exp = Date.now() + DURACION_MS;
  const datos = Buffer.from(JSON.stringify({ u: cuenta.usuario, v: cuenta.version, exp })).toString("base64url");
  context.cookies.set({
    name: COOKIE,
    value: `${datos}.${firmar(datos)}`,
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    expires: new Date(exp),
  });
}

export function cerrarSesion(context: Context) {
  context.cookies.delete({ name: COOKIE, path: "/" });
}

// Devuelve la cuenta si la cookie es válida, vigente y de la versión actual de la contraseña.
export async function sesionActual(context: Context): Promise<Cuenta | null> {
  const valor = context.cookies.get(COOKIE);
  if (!valor) return null;
  const [datos, firma] = valor.split(".");
  if (!datos || !firma) return null;
  const esperada = Buffer.from(firmar(datos));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
  try {
    const { u, v, exp } = JSON.parse(Buffer.from(datos, "base64url").toString());
    if (typeof exp !== "number" || exp < Date.now()) return null;
    const cuenta = await obtenerCuenta();
    if (!cuenta || cuenta.usuario !== u || cuenta.version !== v) return null;
    return cuenta;
  } catch {
    return null;
  }
}

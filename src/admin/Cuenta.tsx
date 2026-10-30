import { useState } from "react";
import { BookOpen, ExternalLink, KeyRound, LogOut, Share, Smartphone, SquarePlus, EllipsisVertical } from "lucide-react";
import { NEGOCIO } from "../data";
import { api, SinSesion, type Aviso } from "./api";

export function Cuenta({
  usuario,
  onAviso,
  onSalir,
}: {
  usuario: string;
  onAviso: (a: Aviso) => void;
  onSalir: () => void;
}) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const esIphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalada = window.matchMedia("(display-mode: standalone)").matches;

  const problema =
    nueva && nueva.length < 8
      ? "Tiene que tener al menos 8 caracteres"
      : repetida && nueva !== repetida
        ? "Las dos contraseñas no coinciden"
        : "";

  async function cambiar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      await api("/api/auth/password", { method: "POST", body: JSON.stringify({ actual, nueva }) });
      setActual("");
      setNueva("");
      setRepetida("");
      onAviso({ texto: "Contraseña actualizada" });
    } catch (err) {
      if (err instanceof SinSesion) onSalir();
      else setError((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function salir() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    onSalir();
  }

  return (
    <>
      <div className="panel-cabecera">
        <div>
          <span className="eyebrow">Tu cuenta</span>
          <h1>Hola, {NEGOCIO.profesional}</h1>
        </div>
      </div>

      <section className="ed-bloque cuenta-perfil">
        <span className="avatar" aria-hidden="true">
          {NEGOCIO.profesional.charAt(0)}
        </span>
        <div>
          <strong>Usuario: {usuario}</strong>
          <span>Tu sesión queda abierta en este dispositivo.</span>
        </div>
      </section>

      {!instalada && (
        <section className="ed-bloque">
          <h2 className="ed-titulo">
            <Smartphone /> Tenelo como app en tu celular
          </h2>
          <p className="ed-bajada">Así entrás al panel con un toque desde la pantalla de inicio.</p>
          <ol className="pasos-instalar">
            {esIphone ? (
              <>
                <li>
                  Abrí esta página en <strong>Safari</strong>.
                </li>
                <li>
                  Tocá <Share aria-label="Compartir" /> <strong>Compartir</strong>, abajo en el centro.
                </li>
                <li>
                  Elegí <SquarePlus aria-hidden="true" /> <strong>Agregar a inicio</strong> y después <strong>Agregar</strong>.
                </li>
              </>
            ) : (
              <>
                <li>
                  Abrí esta página en <strong>Chrome</strong>.
                </li>
                <li>
                  Tocá <EllipsisVertical aria-label="Menú" /> <strong>el menú</strong>, arriba a la derecha.
                </li>
                <li>
                  Elegí <strong>Instalar app</strong> o <strong>Agregar a pantalla principal</strong>.
                </li>
              </>
            )}
          </ol>
        </section>
      )}

      <section className="ed-bloque">
        <h2 className="ed-titulo">
          <KeyRound /> Cambiar contraseña
        </h2>
        <form onSubmit={cambiar}>
          <input type="text" autoComplete="username" value={usuario} readOnly hidden />
          <div className="campo">
            <label htmlFor="pass-actual">Contraseña actual</label>
            <input
              id="pass-actual"
              className="input"
              type="password"
              autoComplete="current-password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="pass-nueva">Nueva contraseña</label>
            <input
              id="pass-nueva"
              className="input"
              type="password"
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="pass-repetida">Repetila</label>
            <input
              id="pass-repetida"
              className="input"
              type="password"
              autoComplete="new-password"
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
            />
            {problema && <span className="ayuda ayuda-error">{problema}</span>}
          </div>
          <button
            type="submit"
            className="btn btn-primario"
            style={{ marginTop: "var(--s-5)" }}
            disabled={!actual || nueva.length < 8 || nueva !== repetida || guardando}
          >
            {guardando ? "Guardando…" : "Cambiar contraseña"}
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      </section>

      <div className="cuenta-acciones">
        <a className="btn btn-borde" href="/manual" target="_blank" rel="noopener">
          <BookOpen /> Ver el manual
        </a>
        <a className="btn btn-borde" href="/" target="_blank" rel="noopener">
          <ExternalLink /> Ver la página de turnos
        </a>
        <button type="button" className="btn btn-fantasma" onClick={salir}>
          <LogOut /> Cerrar sesión
        </button>
      </div>
    </>
  );
}

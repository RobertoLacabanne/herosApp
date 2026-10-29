import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CalendarDays, Check, CircleAlert, Inbox, RefreshCw, Sparkles, UserRound } from "lucide-react";
import { CATALOGO_INICIAL, normalizarCatalogo, type Catalogo } from "../data";
import { Logo, Ramita } from "../icons";
import { traerCatalogo } from "../useCatalogo";
import { Acceso } from "./Acceso";
import { Agenda } from "./Agenda";
import { api, SinSesion, type Aviso } from "./api";
import { Cuenta } from "./Cuenta";
import { Pedidos } from "./Pedidos";
import { Servicios } from "./Servicios";

type Pestana = "pedidos" | "servicios" | "agenda" | "cuenta";

const PESTANAS: { id: Pestana; nombre: string; icono: ReactNode }[] = [
  { id: "pedidos", nombre: "Pedidos", icono: <Inbox /> },
  { id: "servicios", nombre: "Servicios", icono: <Sparkles /> },
  { id: "agenda", nombre: "Agenda", icono: <CalendarDays /> },
  { id: "cuenta", nombre: "Cuenta", icono: <UserRound /> },
];

const pestanaDeUrl = (): Pestana => {
  const h = window.location.hash.slice(1);
  return PESTANAS.some((p) => p.id === h) ? (h as Pestana) : "pedidos";
};

export function Panel() {
  // undefined = todavía no sé si hay sesión
  const [usuario, setUsuario] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    api<{ usuario: string }>("/api/auth/yo")
      .then((r) => setUsuario(r.usuario))
      .catch(() => setUsuario(null));
  }, []);

  if (usuario === undefined) {
    return (
      <main className="acceso-pantalla">
        <div className="cargando">
          <Logo />
        </div>
      </main>
    );
  }
  if (!usuario) return <Acceso onEntrar={setUsuario} />;
  return <Admin usuario={usuario} onSalir={() => setUsuario(null)} />;
}

function Admin({ usuario, onSalir }: { usuario: string; onSalir: () => void }) {
  const [pestana, setPestana] = useState<Pestana>(pestanaDeUrl);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [pendientes, setPendientes] = useState<number | null>(null);
  const [original, setOriginal] = useState<Catalogo>(CATALOGO_INICIAL);
  const [borrador, setBorrador] = useState<Catalogo>(CATALOGO_INICIAL);
  const [guardando, setGuardando] = useState(false);
  // null = cargando; false = falló (no se puede editar para no pisar lo guardado con los valores por defecto)
  const [catalogoListo, setCatalogoListo] = useState<boolean | null>(null);

  const hayCambios = JSON.stringify(original) !== JSON.stringify(borrador);
  const onAviso = useCallback((a: Aviso) => setAviso(a), []);

  const cargarCatalogo = useCallback(() => {
    setCatalogoListo(null);
    traerCatalogo()
      .then((c) => {
        setOriginal(c);
        setBorrador(c);
        setCatalogoListo(true);
      })
      .catch(() => setCatalogoListo(false));
  }, []);

  useEffect(cargarCatalogo, [cargarCatalogo]);

  useEffect(() => {
    const alVolver = () => setPestana(pestanaDeUrl());
    window.addEventListener("hashchange", alVolver);
    return () => window.removeEventListener("hashchange", alVolver);
  }, []);

  useEffect(() => {
    if (!hayCambios) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [hayCambios]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 2600);
    return () => clearTimeout(t);
  }, [aviso]);

  function ir(p: Pestana) {
    setPestana(p);
    history.replaceState(null, "", `#${p}`);
    window.scrollTo({ top: 0 });
  }

  async function guardar() {
    setGuardando(true);
    try {
      const guardado = normalizarCatalogo(
        await api<Catalogo>("/api/catalogo", { method: "PUT", body: JSON.stringify(borrador) }),
      );
      setOriginal(guardado);
      setBorrador(guardado);
      setAviso({ texto: "Cambios guardados. Ya se ven en la página." });
    } catch (e) {
      if (e instanceof SinSesion) onSalir();
      else setAviso({ texto: (e as Error).message, tipo: "error" });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="admin">
      <header className="barra barra-angosta">
        <Logo />
        <nav className="nav-admin" aria-label="Secciones del panel">
          {PESTANAS.map((p) => (
            <button key={p.id} type="button" aria-current={pestana === p.id ? "page" : undefined} onClick={() => ir(p.id)}>
              <span className="nav-icono">{p.icono}</span>
              {p.nombre}
              {p.id === "pedidos" && !!pendientes && (
                <span className="nav-globo" aria-label={`${pendientes} pendientes`}>
                  {pendientes}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="panel">
        <div hidden={pestana !== "pedidos"}>
          <Pedidos onAviso={onAviso} onSinSesion={onSalir} onPendientes={setPendientes} />
        </div>
        {(pestana === "servicios" || pestana === "agenda") && catalogoListo !== true && (
          <EsperandoCatalogo fallo={catalogoListo === false} onReintentar={cargarCatalogo} />
        )}
        {pestana === "servicios" && catalogoListo && <Servicios cat={borrador} set={setBorrador} />}
        {pestana === "agenda" && catalogoListo && <Agenda cat={borrador} set={setBorrador} />}
        {pestana === "cuenta" && <Cuenta usuario={usuario} onAviso={onAviso} onSalir={onSalir} />}
      </main>

      {hayCambios && (
        <div className="barra-guardar" role="region" aria-label="Cambios sin guardar">
          <span>Cambios sin guardar</span>
          <button type="button" className="btn btn-fantasma btn-sm" onClick={() => setBorrador(original)} disabled={guardando}>
            Descartar
          </button>
          <button type="button" className="btn btn-primario btn-sm" onClick={guardar} disabled={guardando}>
            <Check /> {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      )}

      {aviso && (
        <div className={`toast ${aviso.tipo === "error" ? "toast-error" : ""}`} role="status">
          {aviso.tipo === "error" ? <CircleAlert /> : <Check />} {aviso.texto}
        </div>
      )}
    </div>
  );
}

function EsperandoCatalogo({ fallo, onReintentar }: { fallo: boolean; onReintentar: () => void }) {
  if (!fallo) {
    return (
      <div className="solicitudes" style={{ marginTop: "var(--s-8)" }}>
        <div className="esqueleto" style={{ height: 220 }} />
        <div className="esqueleto" style={{ height: 160 }} />
      </div>
    );
  }
  return (
    <div className="vacio" style={{ marginTop: "var(--s-8)" }}>
      <Ramita />
      <strong>No pude cargar tus servicios</strong>
      <p>Revisá la conexión y probá de nuevo. Hasta que carguen no se puede editar, así no se pierde nada.</p>
      <button type="button" className="btn btn-borde btn-sm" style={{ marginTop: "var(--s-4)" }} onClick={onReintentar}>
        <RefreshCw /> Reintentar
      </button>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock, LockKeyhole, LogOut, Phone, RefreshCw, Search, Trash2, Undo2, X } from "lucide-react";
import { NEGOCIO, SERVICIOS } from "./data";
import { IconoWhatsApp, Logo, Ramita } from "./icons";
import { fechaLarga, linkWhatsApp, nombreFranja, type Solicitud } from "./turno";

type Estado = Solicitud["estado"];
type Filtro = Estado | "todos";

const CLAVE_PIN = "erhos-panel-pin";

function leerPin() {
  try {
    return localStorage.getItem(CLAVE_PIN) ?? "";
  } catch {
    return "";
  }
}

function guardarPin(pin: string) {
  try {
    if (pin) localStorage.setItem(CLAVE_PIN, pin);
    else localStorage.removeItem(CLAVE_PIN);
  } catch {
    /* sin almacenamiento: se pide el PIN cada vez */
  }
}

async function api(pin: string, path = "", init: RequestInit = {}) {
  const res = await fetch(`/api/turnos${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-panel-pin": pin, ...init.headers },
  });
  if (res.status === 401) throw new Error("pin");
  if (!res.ok) throw new Error("red");
  return res.json();
}

export function Panel() {
  const [pin, setPin] = useState(leerPin);
  const [solicitudes, setSolicitudes] = useState<Solicitud[] | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const cargar = useCallback(
    async (p = pin) => {
      setError("");
      try {
        const { solicitudes } = await api(p);
        setSolicitudes(solicitudes);
        guardarPin(p);
        setPin(p);
      } catch (e) {
        if ((e as Error).message === "pin") {
          guardarPin("");
          setPin("");
          setError("Ese PIN no es correcto.");
        } else setError("No pude cargar los pedidos. Probá de nuevo.");
      }
    },
    [pin],
  );

  useEffect(() => {
    if (pin) cargar(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  async function cambiarEstado(s: Solicitud, estado: Estado) {
    const previo = solicitudes;
    setSolicitudes((l) => l?.map((x) => (x.id === s.id ? { ...x, estado } : x)) ?? null);
    try {
      await api(pin, `/${s.id}`, { method: "PATCH", body: JSON.stringify({ estado }) });
      setToast(
        estado === "confirmado" ? `Turno de ${s.nombre} confirmado` : estado === "cancelado" ? "Pedido cancelado" : "Volvió a pendientes",
      );
    } catch {
      setSolicitudes(previo);
      setToast("No se pudo guardar el cambio");
    }
  }

  async function borrar(s: Solicitud) {
    if (!confirm(`¿Borrar el pedido de ${s.nombre}? No se puede deshacer.`)) return;
    const previo = solicitudes;
    setSolicitudes((l) => l?.filter((x) => x.id !== s.id) ?? null);
    try {
      await api(pin, `/${s.id}`, { method: "DELETE" });
      setToast("Pedido borrado");
    } catch {
      setSolicitudes(previo);
      setToast("No se pudo borrar");
    }
  }

  if (!pin || (error && !solicitudes)) {
    return <Acceso error={error} onEntrar={(p) => cargar(p)} />;
  }

  return (
    <>
      <header className="barra barra-angosta">
        <Logo />
        <button
          type="button"
          className="btn btn-fantasma btn-sm"
          onClick={() => {
            guardarPin("");
            setPin("");
            setSolicitudes(null);
          }}
        >
          <LogOut /> Salir
        </button>
      </header>
      <main className="panel">
        {solicitudes ? (
          <Lista
            solicitudes={solicitudes}
            onEstado={cambiarEstado}
            onBorrar={borrar}
            onRecargar={async () => {
              await cargar();
              setToast("Lista actualizada");
            }}
          />
        ) : (
          <>
            <div className="panel-cabecera">
              <div>
                <span className="eyebrow">Panel de {NEGOCIO.profesional}</span>
                <h1>Pedidos de turno</h1>
              </div>
            </div>
            <div className="solicitudes">
              <div className="esqueleto" />
              <div className="esqueleto" />
              <div className="esqueleto" />
            </div>
          </>
        )}
        {error && <p className="error">{error}</p>}
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check /> {toast}
        </div>
      )}
    </>
  );
}

function Acceso({ error, onEntrar }: { error: string; onEntrar: (pin: string) => void }) {
  const [valor, setValor] = useState("");
  return (
    <main className="panel">
      <form
        className="tarjeta acceso"
        onSubmit={(e) => {
          e.preventDefault();
          if (valor.trim()) onEntrar(valor.trim());
        }}
      >
        <Logo />
        <h1>Panel de turnos</h1>
        <p>Ingresá tu PIN para ver los pedidos.</p>
        <label htmlFor="pin" className="sr-only">
          PIN
        </label>
        <input
          id="pin"
          className="input"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="••••••"
        />
        <button className="btn btn-primario" type="submit" disabled={!valor.trim()}>
          <LockKeyhole /> Entrar
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </main>
  );
}

function Lista({
  solicitudes,
  onEstado,
  onBorrar,
  onRecargar,
}: {
  solicitudes: Solicitud[];
  onEstado: (s: Solicitud, e: Estado) => void;
  onBorrar: (s: Solicitud) => void;
  onRecargar: () => void;
}) {
  const [filtro, setFiltro] = useState<Filtro>("pendiente");
  const [busqueda, setBusqueda] = useState("");

  const cuentas = useMemo(() => {
    const c: Record<Filtro, number> = { pendiente: 0, confirmado: 0, cancelado: 0, todos: solicitudes.length };
    solicitudes.forEach((s) => c[s.estado]++);
    return c;
  }, [solicitudes]);

  const grupos = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtradas = solicitudes.filter(
      (s) =>
        (filtro === "todos" || s.estado === filtro) &&
        (!q || [s.nombre, s.telefono, s.id, ...s.items, s.otraZona].join(" ").toLowerCase().includes(q)),
    );
    const porFecha = new Map<string, Solicitud[]>();
    [...filtradas]
      .sort((a, b) => (a.fecha === b.fecha ? (a.creado < b.creado ? -1 : 1) : a.fecha < b.fecha ? -1 : 1))
      .forEach((s) => porFecha.set(s.fecha, [...(porFecha.get(s.fecha) ?? []), s]));
    return [...porFecha.entries()];
  }, [solicitudes, filtro, busqueda]);

  const filtros: [Filtro, string][] = [
    ["pendiente", "Pendientes"],
    ["confirmado", "Confirmados"],
    ["cancelado", "Cancelados"],
    ["todos", "Todos"],
  ];

  return (
    <>
      <div className="panel-cabecera">
        <div>
          <span className="eyebrow">Panel de {NEGOCIO.profesional}</span>
          <h1>Pedidos de turno</h1>
        </div>
        <button type="button" className="btn btn-borde btn-sm" onClick={onRecargar}>
          <RefreshCw /> Actualizar
        </button>
      </div>

      <div className="panel-herramientas">
        <div className="filtros" role="group" aria-label="Filtrar por estado">
          {filtros.map(([id, txt]) => (
            <button key={id} type="button" aria-pressed={filtro === id} onClick={() => setFiltro(id)}>
              {txt} <span className="cuenta">{cuentas[id]}</span>
            </button>
          ))}
        </div>
        <div className="buscador">
          <Search />
          <input
            className="input"
            placeholder="Buscar por nombre, zona o código"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar"
          />
        </div>
      </div>

      {grupos.length === 0 ? (
        <div className="vacio">
          <Ramita />
          <strong>{solicitudes.length === 0 ? "Todavía no hay pedidos" : "Nada por acá"}</strong>
          <p>
            {solicitudes.length === 0
              ? "Cuando alguien saque turno desde la página, el pedido aparece en esta lista."
              : "No hay pedidos con este filtro. Probá con otro o borrá la búsqueda."}
          </p>
        </div>
      ) : (
        grupos.map(([fecha, lista]) => (
          <section key={fecha} className="grupo">
            <h2 className="grupo-titulo">
              {fechaLarga(fecha)} <small>{lista.length === 1 ? "1 pedido" : `${lista.length} pedidos`}</small>
            </h2>
            <div className="solicitudes">
              {lista.map((s) => (
                <Tarjeta key={s.id} s={s} onEstado={onEstado} onBorrar={onBorrar} />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}

function soloDigitos(tel: string) {
  let d = tel.replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  if (d.startsWith("54")) return d;
  // número local de Entre Ríos/AR sin código de país: se le agrega 54 9
  return `549${d.replace(/^(\d{2,4})15/, "$1")}`;
}

function Tarjeta({
  s,
  onEstado,
  onBorrar,
}: {
  s: Solicitud;
  onEstado: (s: Solicitud, e: Estado) => void;
  onBorrar: (s: Solicitud) => void;
}) {
  const creado = new Date(s.creado).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const detalle = [s.combo ? `${s.combo}: ` : "", s.items.join(", "), s.otraZona ? `${s.items.length ? " · " : ""}${s.otraZona}` : ""].join("");
  const etiquetaEstado = { pendiente: "Pendiente", confirmado: "Confirmado", cancelado: "Cancelado" }[s.estado];
  const respuesta = `¡Hola ${s.nombre.split(" ")[0]}! Te escribo por tu pedido de turno #${s.id}. `;

  return (
    <article className={`solicitud ${s.estado}`}>
      <div>
        <div className="sol-cabeza">
          <span className="sol-nombre">{s.nombre}</span>
          <span className={`etiqueta et-${s.servicio}`}>
            {SERVICIOS[s.servicio].titulo}
            {s.servicio === "laser" && s.publico === "el" ? " · él" : ""}
          </span>
          <span className={`etiqueta et-${s.estado}`}>{etiquetaEstado}</span>
          {s.primeraVez && <span className="etiqueta et-nuevo">Primera vez</span>}
        </div>
        <p className="sol-items">{detalle}</p>
        <div className="sol-meta">
          <span>
            <CalendarDays /> {nombreFranja(s.franja)}
          </span>
          {s.telefono && (
            <span>
              <Phone /> {s.telefono}
            </span>
          )}
          <span>
            <Clock /> Pedido el {creado} · #{s.id}
          </span>
        </div>
        {s.comentario && <p className="sol-comentario">{s.comentario}</p>}
      </div>

      <div className="sol-acciones">
        {s.estado === "pendiente" ? (
          <button type="button" className="btn btn-sm btn-confirmar" onClick={() => onEstado(s, "confirmado")}>
            <Check /> Confirmar
          </button>
        ) : (
          <button type="button" className="btn btn-sm btn-borde" onClick={() => onEstado(s, "pendiente")}>
            <Undo2 /> A pendientes
          </button>
        )}
        {s.telefono && (
          <a
            className="btn btn-sm btn-borde"
            href={linkWhatsApp(respuesta, soloDigitos(s.telefono))}
            target="_blank"
            rel="noopener"
          >
            <IconoWhatsApp /> Escribirle
          </a>
        )}
        <div className="sol-acciones-fila">
          {s.estado !== "cancelado" && (
            <button type="button" className="btn btn-sm btn-fantasma" onClick={() => onEstado(s, "cancelado")}>
              <X /> Cancelar
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm btn-fantasma btn-icono"
            aria-label="Borrar pedido"
            title="Borrar pedido"
            onClick={() => onBorrar(s)}
          >
            <Trash2 />
          </button>
        </div>
      </div>
    </article>
  );
}

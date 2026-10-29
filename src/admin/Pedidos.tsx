import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock, Phone, RefreshCw, Search, Trash2, Undo2, X } from "lucide-react";
import { SERVICIOS } from "../data";
import { IconoWhatsApp, Ramita } from "../icons";
import { fechaLarga, linkWhatsApp, nombreFranja, type Solicitud } from "../turno";
import { api, SinSesion, type Aviso } from "./api";

type Estado = Solicitud["estado"];
type Filtro = Estado | "todos";

export function Pedidos({
  onAviso,
  onSinSesion,
  onPendientes,
}: {
  onAviso: (a: Aviso) => void;
  onSinSesion: () => void;
  onPendientes: (n: number) => void;
}) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[] | null>(null);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("pendiente");
  const [busqueda, setBusqueda] = useState("");

  function manejar(e: unknown) {
    if (e instanceof SinSesion) onSinSesion();
    else onAviso({ texto: (e as Error).message, tipo: "error" });
  }

  async function cargar(avisar = false) {
    setError("");
    try {
      const r = await api<{ solicitudes: Solicitud[] }>("/api/turnos");
      setSolicitudes(r.solicitudes);
      if (avisar) onAviso({ texto: "Lista actualizada" });
    } catch (e) {
      if (e instanceof SinSesion) onSinSesion();
      else setError("No pude cargar los pedidos. Revisá la conexión y probá de nuevo.");
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (solicitudes) onPendientes(solicitudes.filter((s) => s.estado === "pendiente").length);
  }, [solicitudes, onPendientes]);

  async function cambiarEstado(s: Solicitud, estado: Estado) {
    const previo = solicitudes;
    setSolicitudes((l) => l?.map((x) => (x.id === s.id ? { ...x, estado } : x)) ?? null);
    try {
      await api(`/api/turnos/${s.id}`, { method: "PATCH", body: JSON.stringify({ estado }) });
      onAviso({
        texto:
          estado === "confirmado"
            ? `Turno de ${s.nombre.split(" ")[0]} confirmado`
            : estado === "cancelado"
              ? "Pedido cancelado"
              : "Volvió a pendientes",
      });
    } catch (e) {
      setSolicitudes(previo);
      manejar(e);
    }
  }

  async function borrar(s: Solicitud) {
    if (!confirm(`¿Borrar el pedido de ${s.nombre}? No se puede deshacer.`)) return;
    const previo = solicitudes;
    setSolicitudes((l) => l?.filter((x) => x.id !== s.id) ?? null);
    try {
      await api(`/api/turnos/${s.id}`, { method: "DELETE" });
      onAviso({ texto: "Pedido borrado" });
    } catch (e) {
      setSolicitudes(previo);
      manejar(e);
    }
  }

  const cuentas = useMemo(() => {
    const c: Record<Filtro, number> = { pendiente: 0, confirmado: 0, cancelado: 0, todos: solicitudes?.length ?? 0 };
    solicitudes?.forEach((s) => c[s.estado]++);
    return c;
  }, [solicitudes]);

  const grupos = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtradas = (solicitudes ?? []).filter(
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
          <span className="eyebrow">Tu agenda</span>
          <h1>Pedidos de turno</h1>
        </div>
        <button type="button" className="btn btn-borde btn-sm" onClick={() => cargar(true)}>
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

      {error ? (
        <div className="vacio">
          <Ramita />
          <strong>Sin conexión</strong>
          <p>{error}</p>
          <button type="button" className="btn btn-borde btn-sm" style={{ marginTop: "var(--s-4)" }} onClick={() => cargar()}>
            <RefreshCw /> Reintentar
          </button>
        </div>
      ) : !solicitudes ? (
        <div className="solicitudes">
          <div className="esqueleto" />
          <div className="esqueleto" />
          <div className="esqueleto" />
        </div>
      ) : grupos.length === 0 ? (
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
                <Tarjeta key={s.id} s={s} onEstado={cambiarEstado} onBorrar={borrar} />
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
  // número argentino sin código de país: se le agrega 54 9 y se saca el 15
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
  const detalle = [
    s.combo ? `${s.combo}: ` : "",
    s.items.join(", "),
    s.otraZona ? `${s.items.length ? " · " : ""}${s.otraZona}` : "",
  ].join("");
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
          <a className="btn btn-sm btn-borde" href={linkWhatsApp(respuesta, soloDigitos(s.telefono))} target="_blank" rel="noopener">
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

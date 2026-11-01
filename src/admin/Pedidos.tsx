import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Check, Phone, RefreshCw, Search, Trash2, TriangleAlert, Undo2, X } from "lucide-react";
import { SERVICIOS, type Catalogo, type ServicioId } from "../data";
import { ahoraEnParana, aMin, formatoDuracion, tramosDe, turnosLibres, type Intervalo } from "../horarios";
import { IconoWhatsApp, Ramita } from "../icons";
import { codigoNuevo, fechaLarga, horaDe, linkWhatsApp, type Solicitud } from "../turno";
import { api, SinSesion, type Aviso } from "./api";
import { Hoja } from "./Hoja";
import { SelectorHora } from "./Tramos";

type Estado = Solicitud["estado"];
type Filtro = "proximos" | Estado | "todos";

export function Pedidos({
  cat,
  onAviso,
  onSinSesion,
  onPendientes,
}: {
  cat: Catalogo;
  onAviso: (a: Aviso) => void;
  onSinSesion: () => void;
  onPendientes: (n: number) => void;
}) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[] | null>(null);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("proximos");
  const [busqueda, setBusqueda] = useState("");
  const [anotando, setAnotando] = useState(false);
  const { hoy } = ahoraEnParana();

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
    if (solicitudes) onPendientes(solicitudes.filter((s) => s.estado === "pendiente" && s.fecha >= hoy).length);
  }, [solicitudes, onPendientes, hoy]);

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
              ? "Turno cancelado: el horario quedó libre"
              : "Volvió a pendientes",
      });
    } catch (e) {
      setSolicitudes(previo);
      manejar(e);
    }
  }

  async function borrar(s: Solicitud) {
    if (!confirm(`¿Borrar el turno de ${s.nombre}? No se puede deshacer.`)) return;
    const previo = solicitudes;
    setSolicitudes((l) => l?.filter((x) => x.id !== s.id) ?? null);
    try {
      await api(`/api/turnos/${s.id}`, { method: "DELETE" });
      onAviso({ texto: "Turno borrado" });
    } catch (e) {
      setSolicitudes(previo);
      manejar(e);
    }
  }

  const coincide = (s: Solicitud, f: Filtro) =>
    f === "todos" ? true : f === "proximos" ? s.estado !== "cancelado" && s.fecha >= hoy : s.estado === f;

  const cuentas = useMemo(() => {
    const c = { proximos: 0, pendiente: 0, confirmado: 0, cancelado: 0, todos: 0 } as Record<Filtro, number>;
    for (const s of solicitudes ?? []) for (const f of Object.keys(c) as Filtro[]) if (coincide(s, f)) c[f]++;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudes, hoy]);

  const grupos = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtradas = (solicitudes ?? []).filter(
      (s) => coincide(s, filtro) && (!q || [s.nombre, s.telefono, s.id, ...s.items, s.otraZona].join(" ").toLowerCase().includes(q)),
    );
    const clave = (s: Solicitud) => `${s.fecha} ${s.hora ?? "99"}`;
    const porFecha = new Map<string, Solicitud[]>();
    [...filtradas]
      .sort((a, b) => (clave(a) < clave(b) ? -1 : clave(a) > clave(b) ? 1 : 0))
      .forEach((s) => porFecha.set(s.fecha, [...(porFecha.get(s.fecha) ?? []), s]));
    const lista = [...porFecha.entries()];
    // en "Todos" y "Cancelados" lo más nuevo primero
    return filtro === "todos" || filtro === "cancelado" ? lista.reverse() : lista;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudes, filtro, busqueda, hoy]);

  const filtros: [Filtro, string][] = [
    ["proximos", "Próximos"],
    ["pendiente", "Sin confirmar"],
    ["confirmado", "Confirmados"],
    ["cancelado", "Cancelados"],
    ["todos", "Todos"],
  ];

  return (
    <>
      <div className="panel-cabecera">
        <div>
          <span className="eyebrow">Tu agenda</span>
          <h1>Turnos</h1>
        </div>
        <div className="cabecera-acciones">
          <button type="button" className="btn btn-borde btn-sm btn-icono-movil" onClick={() => cargar(true)} aria-label="Actualizar">
            <RefreshCw /> <span>Actualizar</span>
          </button>
          <button type="button" className="btn btn-primario btn-sm" onClick={() => setAnotando(true)}>
            <CalendarPlus /> Anotar turno
          </button>
        </div>
      </div>

      <div className="panel-herramientas">
        <div className="filtros" role="group" aria-label="Filtrar">
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
          <strong>{solicitudes.length === 0 ? "Todavía no hay turnos" : "Nada por acá"}</strong>
          <p>
            {solicitudes.length === 0
              ? "Cuando alguien reserve desde la página, el turno aparece en esta lista."
              : "No hay turnos con este filtro. Probá con otro o borrá la búsqueda."}
          </p>
        </div>
      ) : (
        grupos.map(([fecha, lista]) => (
          <section key={fecha} className="grupo">
            <h2 className="grupo-titulo">
              {fecha === hoy ? "Hoy" : fechaLarga(fecha)}
              {fecha === hoy && <span className="grupo-fecha">{fechaLarga(fecha)}</span>}
              <small>{lista.length === 1 ? "1 turno" : `${lista.length} turnos`}</small>
            </h2>
            <div className="solicitudes">
              {lista.map((s) => (
                <Tarjeta key={s.id} s={s} onEstado={cambiarEstado} onBorrar={borrar} />
              ))}
            </div>
          </section>
        ))
      )}

      <AnotarTurno
        abierta={anotando}
        cat={cat}
        solicitudes={solicitudes ?? []}
        onCerrar={() => setAnotando(false)}
        onListo={async (nombre) => {
          setAnotando(false);
          await cargar();
          onAviso({ texto: `Turno de ${nombre} anotado` });
        }}
        onError={manejar}
      />
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
  const creado = new Date(s.creado).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const detalle = [
    s.combo ? `${s.combo}: ` : "",
    s.items.join(", "),
    s.otraZona ? `${s.items.length ? " · " : ""}${s.otraZona}` : "",
  ].join("");
  const etiquetaEstado = { pendiente: "Sin confirmar", confirmado: "Confirmado", cancelado: "Cancelado" }[s.estado];
  const cuando = s.hora ? ` del ${fechaLarga(s.fecha).toLowerCase()} a las ${s.hora}` : "";
  const respuesta = `¡Hola ${s.nombre.split(" ")[0]}! Te escribo por tu turno${cuando}. `;

  return (
    <article className={`solicitud ${s.estado}`}>
      <div className="sol-hora">
        <strong>{horaDe(s) || "—"}</strong>
        {s.duracion && <span>{formatoDuracion(s.duracion)}</span>}
      </div>
      <div className="sol-cuerpo">
        <div className="sol-cabeza">
          <span className="sol-nombre">{s.nombre}</span>
          <span className={`etiqueta et-${s.servicio}`}>
            {SERVICIOS[s.servicio].titulo}
            {s.servicio === "laser" && s.publico === "el" ? " · él" : ""}
          </span>
          <span className={`etiqueta et-${s.estado}`}>{etiquetaEstado}</span>
          {s.primeraVez && <span className="etiqueta et-nuevo">Primera vez</span>}
          {s.manual && <span className="etiqueta et-manual">Anotado por vos</span>}
        </div>
        {detalle && <p className="sol-items">{detalle}</p>}
        <div className="sol-meta">
          {s.telefono && (
            <span>
              <Phone /> {s.telefono}
            </span>
          )}
          <span>
            #{s.id} · {s.manual ? "anotado" : "reservado"} el {creado}
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
            <Undo2 /> {s.estado === "cancelado" ? "Reactivar" : "Sin confirmar"}
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
            aria-label="Borrar turno"
            title="Borrar turno"
            onClick={() => onBorrar(s)}
          >
            <Trash2 />
          </button>
        </div>
      </div>
    </article>
  );
}

/* ───────────── Anotar un turno a mano ───────────── */

function AnotarTurno({
  abierta,
  cat,
  solicitudes,
  onCerrar,
  onListo,
  onError,
}: {
  abierta: boolean;
  cat: Catalogo;
  solicitudes: Solicitud[];
  onCerrar: () => void;
  onListo: (nombre: string) => void;
  onError: (e: unknown) => void;
}) {
  const { hoy } = ahoraEnParana();
  const [servicio, setServicio] = useState<ServicioId>("laser");
  const [fecha, setFecha] = useState(hoy);
  const [hora, setHora] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [detalle, setDetalle] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierta) {
      setFecha(hoy);
      setHora("");
      setNombre("");
      setTelefono("");
      setDetalle("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta]);

  const duracion = cat.duracionMin[servicio];
  const ocupados: Intervalo[] = solicitudes
    .filter((s) => s.fecha === fecha && s.estado !== "cancelado" && s.hora)
    .map((s) => [aMin(s.hora!), aMin(s.hora!) + (s.duracion ?? 30)]);
  const sugeridos = fecha ? turnosLibres(cat, fecha, duracion, ocupados).slice(0, 12) : [];

  // Se puede anotar fuera de horario o encimado; solo se avisa.
  const aviso = (() => {
    if (!fecha || !hora) return "";
    const ini = aMin(hora);
    const fin = ini + duracion;
    if (ocupados.some(([a, b]) => ini < b && a < fin)) return "Se pisa con otro turno de ese día.";
    if (!tramosDe(cat, fecha).some((t) => ini >= aMin(t.desde) && fin <= aMin(t.hasta))) return "Queda fuera de tu horario de ese día.";
    return "";
  })();

  async function guardar() {
    setGuardando(true);
    try {
      await api("/api/turnos", {
        method: "POST",
        body: JSON.stringify({
          manual: true,
          id: codigoNuevo(),
          servicio,
          fecha,
          hora,
          nombre,
          telefono,
          items: [],
          otraZona: detalle,
          primeraVez: null,
          comentario: "",
        }),
      });
      onListo(nombre.trim());
    } catch (e) {
      onError(e);
    } finally {
      setGuardando(false);
    }
  }

  const listo = nombre.trim().length > 1 && !!fecha && !!hora;

  return (
    <Hoja
      abierta={abierta}
      onCerrar={onCerrar}
      titulo="Anotar un turno"
      bajada="Para los turnos que te piden por teléfono o en persona. Así ese horario queda ocupado en la página."
      pie={
        <>
          <button type="button" className="btn btn-fantasma" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primario" disabled={!listo || guardando} onClick={guardar}>
            <Check /> {guardando ? "Guardando…" : "Anotar"}
          </button>
        </>
      }
    >
      <div className="campo">
        <label htmlFor="m-nombre">Nombre</label>
        <input id="m-nombre" className="input" autoFocus maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div className="campo">
        <label htmlFor="m-tel">
          Teléfono <small>(opcional)</small>
        </label>
        <input id="m-tel" className="input" type="tel" inputMode="tel" maxLength={30} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
      </div>
      <div className="campo">
        <span className="campo-label">Servicio</span>
        <div className="segmentado" role="radiogroup" aria-label="Servicio">
          {(["laser", "facial"] as ServicioId[]).map((id) => (
            <button key={id} type="button" role="radio" aria-checked={servicio === id} onClick={() => setServicio(id)}>
              {id === "laser" ? "Láser" : "Facial"} · {formatoDuracion(cat.duracionMin[id])}
            </button>
          ))}
        </div>
      </div>
      <div className="campo">
        <label htmlFor="m-detalle">
          Zonas o tratamiento <small>(opcional)</small>
        </label>
        <input
          id="m-detalle"
          className="input"
          maxLength={200}
          placeholder={servicio === "laser" ? "Ej.: axilas y cavado" : "Ej.: limpieza profunda"}
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
        />
      </div>
      <div className="campo-fila">
        <div className="campo">
          <label htmlFor="m-fecha">Día</label>
          <input
            id="m-fecha"
            className="input"
            type="date"
            min={hoy}
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              setHora("");
            }}
          />
        </div>
        <div className="campo">
          <span className="campo-label">Hora</span>
          <SelectorHora etiqueta="Hora" vacio="Elegí" value={hora} onChange={setHora} />
        </div>
      </div>
      {sugeridos.length > 0 && (
        <div className="campo">
          <span className="campo-label">
            Libres ese día <small>(tocá uno)</small>
          </span>
          <div className="horas horas-chicas">
            {sugeridos.map((h) => (
              <button key={h} type="button" className="hora" aria-checked={hora === h} role="radio" onClick={() => setHora(h)}>
                {h}
              </button>
            ))}
          </div>
        </div>
      )}
      {aviso && (
        <p className="aviso-suave">
          <TriangleAlert /> {aviso} Lo podés anotar igual.
        </p>
      )}
    </Hoja>
  );
}

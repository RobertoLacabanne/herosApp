import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, AtSign, CalendarCheck, Check, ChevronLeft, CircleAlert, Clock, Info, MapPin, RotateCcw } from "lucide-react";
import { NEGOCIO, SERVICIOS, type Catalogo, type Publico, type ServicioId } from "./data";
import {
  ahoraEnParana,
  aMin,
  diaDeSemana,
  fechasOfrecidas,
  formatoDuracion,
  sumarDias,
  tramosDe,
  turnosLibres,
  type Intervalo,
} from "./horarios";
import { IconoWhatsApp, IlusFacial, IlusLaser, Logo } from "./icons";
import {
  aBorrador,
  aSolicitud,
  codigoNuevo,
  comboElegido,
  combosDe,
  fechaLarga,
  linkWhatsApp,
  mensajeWhatsApp,
  parseFecha,
  pedidoListo,
  pedidoVacio,
  type Pedido,
  type Solicitud,
} from "./turno";
import { useCatalogo } from "./useCatalogo";

const PASOS = ["Servicio", "Detalle", "Día y hora", "Tus datos"];

type Ocupados = Record<string, Intervalo[]>;

export function Booking() {
  const [paso, setPaso] = useState(0);
  const [pedido, setPedido] = useState<Pedido>(pedidoVacio);
  const [codigo, setCodigo] = useState(codigoNuevo);
  const [enviado, setEnviado] = useState<Solicitud | null>(null);
  const [reservando, setReservando] = useState(false);
  const [error, setError] = useState("");
  const [ocupados, setOcupados] = useState<Ocupados | null>(null);
  const [falloOcupados, setFalloOcupados] = useState(false);
  const cat = useCatalogo();

  const set = (cambios: Partial<Pedido>) => setPedido((p) => ({ ...p, ...cambios }));

  const borrador = aBorrador(pedido, paso === 3 ? codigo : "", cat);
  const mensaje = pedido.servicio ? mensajeWhatsApp(borrador) : "";
  const listo = pedidoListo(pedido);

  const cargarOcupados = useCallback(() => {
    const { hoy } = ahoraEnParana();
    setFalloOcupados(false);
    fetch(`/api/ocupados?desde=${hoy}&hasta=${sumarDias(hoy, cat.diasAMostrar)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((r) => setOcupados(r.ocupados))
      .catch(() => setFalloOcupados(true));
  }, [cat.diasAMostrar]);

  // Cada vez que se entra al paso del día se actualiza qué horarios están tomados.
  useEffect(() => {
    if (paso === 2) cargarOcupados();
  }, [paso, cargarOcupados]);

  const puedeSeguir = [
    !!pedido.servicio,
    pedido.items.length > 0 || pedido.otraZona.trim().length > 0,
    !!pedido.fecha && !!pedido.hora,
    listo,
  ][paso];

  const ayuda = [
    "Elegí un servicio para seguir",
    pedido.servicio === "laser" ? "Elegí al menos una zona" : "Elegí al menos un tratamiento",
    !pedido.fecha ? "Elegí un día" : "Elegí un horario",
    "Contanos tu nombre",
  ][paso];

  async function reservar() {
    setReservando(true);
    setError("");
    const solicitud = aSolicitud(pedido, codigo, cat);
    try {
      const res = await fetch("/api/turnos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(solicitud),
      });
      const datos = await res.json().catch(() => ({}));
      if (res.status === 409 && datos.codigo === "ocupado") {
        set({ hora: null });
        setError(datos.error);
        irA(2);
        return;
      }
      if (!res.ok) throw new Error();
      setEnviado(solicitud);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("No pudimos guardar el turno. Revisá tu conexión y probá de nuevo.");
    } finally {
      setReservando(false);
    }
  }

  function reiniciar() {
    setPedido(pedidoVacio);
    setCodigo(codigoNuevo());
    setEnviado(null);
    setError("");
    setPaso(0);
  }

  function irA(n: number) {
    setPaso(n);
    document.getElementById("tarjeta")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <header className="barra">
        <Logo />
        <a className="barra-link" href={linkWhatsApp(`¡Hola ${NEGOCIO.profesional}! Tengo una consulta.`)} target="_blank" rel="noopener">
          <IconoWhatsApp />
          <span>¿Dudas? Escribime</span>
        </a>
      </header>

      <main className="reserva">
        <aside className="lateral">
          <span className="eyebrow">Turnos online · Paraná</span>
          <h1 className="titular">
            Tu turno,
            <br />
            <em>en un minuto.</em>
          </h1>
          <p className="intro">
            Elegí el tratamiento, el día y el horario libre que te quede cómodo. Reservás desde acá, sin descargar
            nada, y le avisás a {NEGOCIO.profesional} por WhatsApp.
          </p>
          <ul className="datos-local">
            <li>
              <MapPin /> {NEGOCIO.direccion.replace(", Entre Ríos", "")}
            </li>
            <li>
              <Clock /> Láser {formatoDuracion(cat.duracionMin.laser)} · Facial {formatoDuracion(cat.duracionMin.facial)}
            </li>
            <li>
              <AtSign /> {NEGOCIO.instagram}
            </li>
          </ul>
          <Preview mensaje={mensaje} />
        </aside>

        <section className="tarjeta" id="tarjeta" aria-live="polite">
          {enviado ? (
            <Listo solicitud={enviado} onOtro={reiniciar} />
          ) : (
            <>
              <div className="pasos-cabecera">
                <nav className="progreso" aria-label="Pasos">
                  {PASOS.map((nombre, i) => (
                    <button
                      key={nombre}
                      type="button"
                      className={`progreso-item ${i === paso ? "actual" : i < paso ? "hecho" : ""}`}
                      disabled={i >= paso}
                      onClick={() => irA(i)}
                      aria-current={i === paso ? "step" : undefined}
                    >
                      {nombre}
                    </button>
                  ))}
                </nav>
                <p className="paso-num">
                  Paso {paso + 1} de {PASOS.length}
                </p>
                {paso === 0 && <Cabecera titulo="¿Qué te querés hacer?" bajada="Elegí el servicio y seguimos." />}
                {paso === 1 && pedido.servicio && (
                  <Cabecera titulo={SERVICIOS[pedido.servicio].titulo} bajada={SERVICIOS[pedido.servicio].bajada} />
                )}
                {paso === 2 && <Cabecera titulo="¿Cuándo te queda bien?" bajada="Elegí un día y uno de los horarios libres." />}
                {paso === 3 && <Cabecera titulo="Último paso" bajada="Así sabe quién sos cuando le llegue tu turno." />}
              </div>

              <div className="pasos-cuerpo" key={paso}>
                {error && (
                  <p className="aviso-error" role="alert">
                    <CircleAlert /> {error}
                  </p>
                )}
                {paso === 0 && (
                  <PasoServicio
                    cat={cat}
                    valor={pedido.servicio}
                    onElegir={(servicio) => {
                      if (servicio !== pedido.servicio) set({ servicio, items: [], otraZona: "", hora: null });
                      irA(1);
                    }}
                  />
                )}
                {paso === 1 && <PasoDetalle cat={cat} pedido={pedido} set={set} />}
                {paso === 2 && (
                  <PasoDia
                    cat={cat}
                    pedido={pedido}
                    set={(c) => {
                      setError("");
                      set(c);
                    }}
                    ocupados={ocupados}
                    fallo={falloOcupados}
                    onReintentar={cargarOcupados}
                  />
                )}
                {paso === 3 && <PasoDatos pedido={pedido} set={set} mensaje={mensaje} />}
              </div>

              <footer className="pasos-pie">
                {paso > 0 && (
                  <button type="button" className="btn btn-fantasma" aria-label="Atrás" onClick={() => irA(paso - 1)}>
                    <ChevronLeft /> <span>Atrás</span>
                  </button>
                )}
                {!puedeSeguir && <span className="pie-ayuda">{ayuda}</span>}
                {paso < 3 ? (
                  <button
                    type="button"
                    className="btn btn-primario"
                    style={{ marginLeft: "auto" }}
                    disabled={!puedeSeguir}
                    onClick={() => {
                      setError("");
                      irA(paso + 1);
                    }}
                  >
                    Siguiente <ArrowRight />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primario"
                    style={{ marginLeft: "auto" }}
                    disabled={!listo || reservando}
                    onClick={reservar}
                  >
                    <CalendarCheck /> {reservando ? "Reservando…" : "Reservar turno"}
                  </button>
                )}
              </footer>
            </>
          )}
        </section>
      </main>

      <footer className="pie-sitio">
        {NEGOCIO.nombre} · {NEGOCIO.direccion} ·{" "}
        <a href={`https://instagram.com/${NEGOCIO.instagram}`} target="_blank" rel="noopener">
          @{NEGOCIO.instagram}
        </a>
      </footer>
    </>
  );
}

function Cabecera({ titulo, bajada }: { titulo: string; bajada: string }) {
  return (
    <>
      <h2 className="paso-titulo">{titulo}</h2>
      <p className="paso-bajada">{bajada}</p>
    </>
  );
}

/* ───────────── Paso 1 ───────────── */

function PasoServicio({
  cat,
  valor,
  onElegir,
}: {
  cat: Catalogo;
  valor: ServicioId | null;
  onElegir: (s: ServicioId) => void;
}) {
  const ilus: Record<ServicioId, ReactNode> = {
    laser: <IlusLaser className="opcion-ilus" />,
    facial: <IlusFacial className="opcion-ilus" />,
  };
  return (
    <div className="servicios">
      {(Object.keys(SERVICIOS) as ServicioId[]).map((id) => (
        <button key={id} type="button" className="opcion" aria-pressed={valor === id} onClick={() => onElegir(id)}>
          {ilus[id]}
          <span className="opcion-texto">
            <span className="opcion-titulo">{SERVICIOS[id].titulo}</span>
            <span className="opcion-bajada">{SERVICIOS[id].bajada}</span>
            <span className="chip-dato">
              <Clock /> Turno de {formatoDuracion(cat.duracionMin[id])}
            </span>
          </span>
          <span className="check">
            <Check />
          </span>
        </button>
      ))}
    </div>
  );
}

/* ───────────── Paso 2 ───────────── */

type SetPedido = (c: Partial<Pedido>) => void;

function PasoDetalle({ cat, pedido, set }: { cat: Catalogo; pedido: Pedido; set: SetPedido }) {
  const combos = combosDe(pedido, cat);
  const combo = comboElegido(pedido, cat);
  const esLaser = pedido.servicio === "laser";

  const alternar = (item: string) =>
    set({
      items: pedido.items.includes(item) ? pedido.items.filter((x) => x !== item) : [...pedido.items, item],
    });

  return (
    <>
      {esLaser && (
        <div className="seccion">
          <div className="segmentado" role="radiogroup" aria-label="¿Para quién es?">
            {(
              [
                ["ella", "Para ella"],
                ["el", "Para él"],
              ] as [Publico, string][]
            ).map(([id, txt]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={pedido.publico === id}
                onClick={() => pedido.publico !== id && set({ publico: id, items: [] })}
              >
                {txt}
              </button>
            ))}
          </div>
        </div>
      )}

      {combos.length > 0 && (
      <div className="seccion">
        <h3 className="seccion-titulo">
          Combos <small>Tocá uno para elegirlo</small>
        </h3>
        <div className="combos" style={esLaser ? undefined : { gridTemplateColumns: "minmax(0,1fr)" }}>
          {combos.map((c) => (
            <button
              key={c.id}
              type="button"
              className="combo"
              aria-pressed={combo?.id === c.id}
              onClick={() => set({ items: combo?.id === c.id ? [] : c.items })}
            >
              <span className="combo-nombre">
                {c.nombre} <Check />
              </span>
              <span className="combo-items">{c.items.join(esLaser ? " · " : " + ")}</span>
            </button>
          ))}
        </div>
      </div>
      )}

      <div className="seccion">
        <h3 className="seccion-titulo">
          {esLaser
            ? combos.length ? "O armá tu combinación" : "Zonas"
            : combos.length ? "O elegí los tratamientos" : "Tratamientos"}{" "}
          <small>Podés elegir varios</small>
        </h3>
        {esLaser ? (
          <div className="chips">
            {cat.zonas[pedido.publico].map((z) => {
              const activo = pedido.items.includes(z);
              return (
                <button key={z} type="button" className="chip" aria-pressed={activo} onClick={() => alternar(z)}>
                  {activo && <Check />}
                  {z}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="lista">
            {cat.tratamientos.map((t) => (
              <button
                key={t.nombre}
                type="button"
                className="lista-item"
                aria-pressed={pedido.items.includes(t.nombre)}
                onClick={() => alternar(t.nombre)}
              >
                <span className="check">
                  <Check />
                </span>
                <span className="lista-texto">
                  <strong>{t.nombre}</strong>
                  <span>{t.detalle}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="seccion">
        <div className="campo">
          <label htmlFor="otra">
            {esLaser ? "¿Otra zona?" : "¿Querés consultar otra cosa?"} <small>(opcional)</small>
          </label>
          <input
            id="otra"
            className="input"
            value={pedido.otraZona}
            maxLength={200}
            placeholder={esLaser ? "Ej.: bozo, brazos, línea alba" : "Ej.: tengo manchas y quiero saber qué me conviene"}
            onChange={(e) => set({ otraZona: e.target.value })}
          />
        </div>
      </div>

      {esLaser && (
        <p className="nota">
          <Info />
          ¿No sabés qué te conviene? Marcá las zonas que te interesan y {NEGOCIO.profesional} te arma la propuesta.
        </p>
      )}
    </>
  );
}

/* ───────────── Paso 3 ───────────── */

const DOW = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function PasoDia({
  cat,
  pedido,
  set,
  ocupados,
  fallo,
  onReintentar,
}: {
  cat: Catalogo;
  pedido: Pedido;
  set: SetPedido;
  ocupados: Ocupados | null;
  fallo: boolean;
  onReintentar: () => void;
}) {
  const duracion = pedido.servicio ? cat.duracionMin[pedido.servicio] : 30;

  const { dias, columnas, rango } = useMemo(() => {
    const fechas = fechasOfrecidas(cat);
    // turnos libres por día (si todavía no llegaron los ocupados, se calculan sin ellos)
    const libresDe = (iso: string) => turnosLibres(cat, iso, duracion, ocupados?.[iso] ?? []);
    const conHorario = fechas.filter((f) => tramosDe(cat, f).length > 0);
    const columnas = [1, 2, 3, 4, 5, 6, 0].filter(
      (d) => cat.semana[d].length > 0 || conHorario.some((f) => diaDeSemana(f) === d),
    );
    // la grilla arranca el lunes de esta semana
    const primero = sumarDias(fechas[0], -((diaDeSemana(fechas[0]) + 6) % 7));
    const ultimo = fechas[fechas.length - 1];
    const dias: { iso: string; libres: string[]; atiende: boolean; enRango: boolean }[] = [];
    for (let f = primero; f <= ultimo; f = sumarDias(f, 1)) {
      if (!columnas.includes(diaDeSemana(f))) continue;
      const enRango = f >= fechas[0];
      dias.push({ iso: f, libres: enRango ? libresDe(f) : [], atiende: tramosDe(cat, f).length > 0, enRango });
    }
    const mes = (iso: string) => parseFecha(iso).toLocaleDateString("es-AR", { month: "long" });
    const rango = mes(fechas[0]) === mes(ultimo) ? mes(ultimo) : `${mes(fechas[0])} – ${mes(ultimo)}`;
    return { dias, columnas, rango };
  }, [cat, duracion, ocupados]);

  const elegido = dias.find((d) => d.iso === pedido.fecha);
  const horarios = elegido?.libres ?? [];
  // si el horario elegido dejó de estar libre, se descarta
  useEffect(() => {
    if (ocupados && pedido.hora && pedido.fecha && !horarios.includes(pedido.hora)) set({ hora: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocupados, pedido.fecha]);

  const manana = horarios.filter((h) => aMin(h) < 13 * 60);
  const tarde = horarios.filter((h) => aMin(h) >= 13 * 60);

  return (
    <>
      <div className="seccion">
        <h3 className="seccion-titulo">
          Día <small style={{ textTransform: "capitalize" }}>{rango}</small>
        </h3>
        <div className="calendario" style={{ gridTemplateColumns: `repeat(${columnas.length}, minmax(0,1fr))` }}>
          {columnas.map((d) => (
            <span key={d} className="cal-dow">
              {DOW[d]}
            </span>
          ))}
          {dias.map(({ iso, libres, atiende, enRango }) => {
            const fecha = parseFecha(iso);
            const habil = enRango && libres.length > 0;
            const completo = enRango && atiende && libres.length === 0 && !!ocupados;
            const etiqueta = `${fecha.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}${completo ? ", sin turnos libres" : ""}`;
            return (
              <button
                key={iso}
                type="button"
                className={`dia ${completo ? "dia-completo" : ""}`}
                disabled={!habil}
                aria-pressed={pedido.fecha === iso}
                aria-label={etiqueta}
                title={completo ? "Sin turnos libres" : undefined}
                onClick={() => set({ fecha: iso, hora: null })}
              >
                <span>
                  {fecha.getDate()}
                  {fecha.getDate() === 1 && enRango && (
                    <span className="dia-mes">{fecha.toLocaleDateString("es-AR", { month: "short" })}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <p className="leyenda">
          <span className="leyenda-punto" /> Sin turnos libres
        </p>
      </div>

      <div className="seccion">
        <h3 className="seccion-titulo">
          Horario <small>Turnos de {formatoDuracion(duracion)}</small>
        </h3>
        {!pedido.fecha ? (
          <p className="horas-vacio">Elegí un día para ver los horarios libres.</p>
        ) : fallo ? (
          <p className="horas-vacio">
            No pudimos ver qué horarios están libres.{" "}
            <button type="button" className="link" onClick={onReintentar}>
              Probá de nuevo
            </button>
          </p>
        ) : !ocupados ? (
          <div className="horas">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="hora-esqueleto" />
            ))}
          </div>
        ) : (
          <>
            <p className="horas-dia">{fechaLarga(pedido.fecha)}</p>
            {[
              ["Mañana", manana],
              ["Tarde", tarde],
            ].map(([titulo, lista]) =>
              (lista as string[]).length ? (
                <div key={titulo as string} className="horas-grupo">
                  <span className="horas-titulo">{titulo as string}</span>
                  <div className="horas" role="radiogroup" aria-label={`Horarios de la ${(titulo as string).toLowerCase()}`}>
                    {(lista as string[]).map((h) => (
                      <button
                        key={h}
                        type="button"
                        role="radio"
                        className="hora"
                        aria-checked={pedido.hora === h}
                        onClick={() => set({ hora: h })}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </>
        )}
      </div>

      <p className="nota">
        <Info />
        Reservás el horario desde acá y {NEGOCIO.profesional} te lo confirma por WhatsApp.
      </p>
    </>
  );
}

/* ───────────── Paso 4 ───────────── */

function PasoDatos({ pedido, set, mensaje }: { pedido: Pedido; set: SetPedido; mensaje: string }) {
  return (
    <>
      <div className="campo">
        <label htmlFor="nombre">Tu nombre</label>
        <input
          id="nombre"
          className="input"
          autoComplete="name"
          maxLength={80}
          placeholder="Ej.: Camila Ríos"
          value={pedido.nombre}
          onChange={(e) => set({ nombre: e.target.value })}
        />
      </div>
      <div className="campo">
        <label htmlFor="tel">
          Tu teléfono <small>(opcional)</small>
        </label>
        <input
          id="tel"
          className="input"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={30}
          placeholder="Ej.: 343 512-3456"
          value={pedido.telefono}
          onChange={(e) => set({ telefono: e.target.value })}
        />
        <span className="ayuda">Queda en la agenda de {NEGOCIO.profesional}, por si necesita avisarte algo.</span>
      </div>
      <div className="campo">
        <span className="campo-label" id="pv">
          ¿Ya te atendiste en ERHOS?
        </span>
        <div className="segmentado" role="radiogroup" aria-labelledby="pv" style={{ width: "fit-content" }}>
          {(
            [
              [true, "Es mi primera vez"],
              [false, "Sí, ya vine"],
            ] as [boolean, string][]
          ).map(([v, txt]) => (
            <button
              key={txt}
              type="button"
              role="radio"
              aria-checked={pedido.primeraVez === v}
              onClick={() => set({ primeraVez: pedido.primeraVez === v ? null : v })}
            >
              {txt}
            </button>
          ))}
        </div>
      </div>
      <div className="campo">
        <label htmlFor="com">
          ¿Algo que quieras contarle? <small>(opcional)</small>
        </label>
        <textarea
          id="com"
          className="input"
          maxLength={500}
          placeholder="Ej.: tengo la piel sensible, me queda mejor después de las 17 h"
          value={pedido.comentario}
          onChange={(e) => set({ comentario: e.target.value })}
        />
      </div>
      <div className="solo-movil" style={{ marginTop: "var(--s-8)" }}>
        <Preview mensaje={mensaje} />
      </div>
    </>
  );
}

/* ───────────── Vista previa y final ───────────── */

function TextoWhatsApp({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/(\*[^*\n]+\*)/g).map((parte, i) =>
        parte.startsWith("*") && parte.endsWith("*") ? <strong key={i}>{parte.slice(1, -1)}</strong> : parte,
      )}
    </>
  );
}

function Preview({ mensaje }: { mensaje: string }) {
  const hora = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="preview">
      <p className="preview-titulo">
        <IconoWhatsApp /> Así le llega a {NEGOCIO.profesional}
      </p>
      <div className="chat">
        <div className="burbuja">
          {mensaje ? (
            <TextoWhatsApp texto={mensaje} />
          ) : (
            <span className="burbuja-vacia">Tu mensaje se va armando a medida que elegís…</span>
          )}
          <span className="burbuja-hora">{hora}</span>
        </div>
      </div>
    </div>
  );
}

function Listo({ solicitud, onOtro }: { solicitud: Solicitud; onOtro: () => void }) {
  const nombre = solicitud.nombre.split(" ")[0];
  return (
    <div className="listo">
      <div className="listo-sello">
        <Check />
      </div>
      <h2>¡Reservado, {nombre}!</h2>
      <p className="listo-cuando">
        {fechaLarga(solicitud.fecha)} · {solicitud.hora} h
      </p>
      <p>
        Tu turno <span className="codigo">#{solicitud.id}</span> ya está en la agenda de {NEGOCIO.profesional}. Ahora
        mandale el mensaje por WhatsApp así te lo confirma.
      </p>
      <div className="listo-acciones">
        <a className="btn btn-whatsapp" href={linkWhatsApp(mensajeWhatsApp(solicitud))} target="_blank" rel="noopener">
          <IconoWhatsApp /> Avisar por WhatsApp
        </a>
        <button type="button" className="btn btn-borde" onClick={onOtro}>
          <RotateCcw /> Sacar otro turno
        </button>
      </div>
    </div>
  );
}

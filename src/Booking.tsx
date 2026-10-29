import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  AtSign,
  CalendarHeart,
  Check,
  ChevronLeft,
  Clock,
  Info,
  MapPin,
  RotateCcw,
  Sunrise,
  Sunset,
} from "lucide-react";
import {
  DIAS_A_MOSTRAR,
  DIAS_DE_ATENCION,
  FRANJAS,
  NEGOCIO,
  SERVICIOS,
  TRATAMIENTOS_FACIALES,
  ZONAS,
  type FranjaId,
  type Publico,
  type ServicioId,
} from "./data";
import { IconoWhatsApp, IlusFacial, IlusLaser, Logo } from "./icons";
import {
  aBorrador,
  aSolicitud,
  codigoNuevo,
  comboElegido,
  combosDe,
  isoDe,
  linkWhatsApp,
  mensajeWhatsApp,
  pedidoListo,
  pedidoVacio,
  type Pedido,
  type Solicitud,
} from "./turno";

const PASOS = ["Servicio", "Detalle", "Día", "Tus datos"];

export function Booking() {
  const [paso, setPaso] = useState(0);
  const [pedido, setPedido] = useState<Pedido>(pedidoVacio);
  const [codigo, setCodigo] = useState(codigoNuevo);
  const [enviado, setEnviado] = useState<Solicitud | null>(null);

  const set = (cambios: Partial<Pedido>) => setPedido((p) => ({ ...p, ...cambios }));

  const borrador = aBorrador(pedido, paso === 3 ? codigo : "");
  const mensaje = pedido.servicio ? mensajeWhatsApp(borrador) : "";
  const listo = pedidoListo(pedido);

  const puedeSeguir = [
    !!pedido.servicio,
    pedido.items.length > 0 || pedido.otraZona.trim().length > 0,
    !!pedido.fecha && !!pedido.franja,
    listo,
  ][paso];

  const ayuda = [
    "Elegí un servicio para seguir",
    pedido.servicio === "laser" ? "Elegí al menos una zona" : "Elegí al menos un tratamiento",
    !pedido.fecha ? "Elegí un día" : "Elegí un horario",
    "Contanos tu nombre",
  ][paso];

  function enviar() {
    const solicitud = aSolicitud(pedido, codigo);
    fetch("/api/turnos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(solicitud),
      keepalive: true,
    }).catch(() => {
      /* el pedido igual viaja por WhatsApp */
    });
    setEnviado(solicitud);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reiniciar() {
    setPedido(pedidoVacio);
    setCodigo(codigoNuevo());
    setEnviado(null);
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
        <a className="barra-link" href={linkWhatsApp("¡Hola Rocío! Tengo una consulta.")} target="_blank" rel="noopener">
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
            <em>en un mensaje.</em>
          </h1>
          <p className="intro">
            Elegí el tratamiento y el día que te queda cómodo. Te armamos el pedido para que se lo
            mandes a {NEGOCIO.profesional} por WhatsApp y te confirme el horario.
          </p>
          <ul className="datos-local">
            <li>
              <MapPin /> {NEGOCIO.direccion.replace(", Entre Ríos", "")}
            </li>
            <li>
              <Clock /> Láser 30 min · Facial 1 h 30
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
                {paso === 2 && <Cabecera titulo="¿Cuándo te queda bien?" bajada="Elegí el día y el momento que preferís." />}
                {paso === 3 && <Cabecera titulo="Último paso" bajada="Así sabe quién sos cuando le llegue el mensaje." />}
              </div>

              <div className="pasos-cuerpo" key={paso}>
                {paso === 0 && (
                  <PasoServicio
                    valor={pedido.servicio}
                    onElegir={(servicio) => {
                      if (servicio !== pedido.servicio) set({ servicio, items: [], otraZona: "" });
                      irA(1);
                    }}
                  />
                )}
                {paso === 1 && <PasoDetalle pedido={pedido} set={set} />}
                {paso === 2 && <PasoDia pedido={pedido} set={set} />}
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
                    onClick={() => irA(paso + 1)}
                  >
                    Siguiente <ArrowRight />
                  </button>
                ) : listo ? (
                  <a
                    className="btn btn-whatsapp"
                    style={{ marginLeft: "auto" }}
                    href={linkWhatsApp(mensaje)}
                    target="_blank"
                    rel="noopener"
                    onClick={enviar}
                  >
                    <IconoWhatsApp /> Enviar por WhatsApp
                  </a>
                ) : (
                  <button type="button" className="btn btn-whatsapp" style={{ marginLeft: "auto" }} disabled>
                    <IconoWhatsApp /> Enviar por WhatsApp
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

function PasoServicio({ valor, onElegir }: { valor: ServicioId | null; onElegir: (s: ServicioId) => void }) {
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
              <Clock /> {SERVICIOS[id].duracion}
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

function PasoDetalle({ pedido, set }: { pedido: Pedido; set: SetPedido }) {
  const combos = combosDe(pedido);
  const combo = comboElegido(pedido);
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

      <div className="seccion">
        <h3 className="seccion-titulo">
          {esLaser ? "O armá tu combinación" : "O elegí los tratamientos"} <small>Podés elegir varios</small>
        </h3>
        {esLaser ? (
          <div className="chips">
            {ZONAS[pedido.publico].map((z) => {
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
            {TRATAMIENTOS_FACIALES.map((t) => (
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
const ICONO_FRANJA: Record<FranjaId, ReactNode> = {
  manana: <Sunrise />,
  tarde: <Sunset />,
  indistinto: <CalendarHeart />,
};

function PasoDia({ pedido, set }: { pedido: Pedido; set: SetPedido }) {
  const columnas = [...DIAS_DE_ATENCION].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));

  const { semanas, rango } = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const primero = new Date(hoy);
    primero.setDate(hoy.getDate() + 1);
    const ultimo = new Date(hoy);
    ultimo.setDate(hoy.getDate() + DIAS_A_MOSTRAR);

    // arranca el lunes de la semana del primer día disponible
    const cursor = new Date(primero);
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
    const semanas: { fecha: Date; habil: boolean }[][] = [];
    while (cursor <= ultimo) {
      const semana: { fecha: Date; habil: boolean }[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(cursor);
        if (columnas.includes(d.getDay())) semana.push({ fecha: d, habil: d >= primero && d <= ultimo });
        cursor.setDate(cursor.getDate() + 1);
      }
      semanas.push(semana);
    }
    const mes = (d: Date) => d.toLocaleDateString("es-AR", { month: "long" });
    const rango = mes(primero) === mes(ultimo) ? mes(primero) : `${mes(primero)} – ${mes(ultimo)}`;
    return { semanas, rango };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          {semanas.flat().map(({ fecha, habil }) => {
            const iso = isoDe(fecha);
            const etiqueta = fecha.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
            return (
              <button
                key={iso}
                type="button"
                className="dia"
                disabled={!habil}
                aria-pressed={pedido.fecha === iso}
                aria-label={etiqueta}
                onClick={() => set({ fecha: iso })}
              >
                <span>
                  {fecha.getDate()}
                  {fecha.getDate() === 1 && habil && (
                    <span className="dia-mes">{fecha.toLocaleDateString("es-AR", { month: "short" })}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="seccion">
        <h3 className="seccion-titulo">Horario</h3>
        <div className="franjas" role="radiogroup" aria-label="Horario">
          {FRANJAS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              className="franja"
              aria-checked={pedido.franja === f.id}
              onClick={() => set({ franja: f.id })}
            >
              {ICONO_FRANJA[f.id]}
              <strong>{f.nombre}</strong>
              <span>{f.detalle}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="nota">
        <Info />
        Esto es un pedido de turno: {NEGOCIO.profesional} te responde por WhatsApp con el horario exacto.
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
      <h2>¡Listo, {nombre}!</h2>
      <p>
        Se abrió WhatsApp con tu pedido <span className="codigo">#{solicitud.id}</span>. Solo falta que toques enviar
        y {NEGOCIO.profesional} te confirma el horario.
      </p>
      <div className="listo-acciones">
        <a className="btn btn-whatsapp" href={linkWhatsApp(mensajeWhatsApp(solicitud))} target="_blank" rel="noopener">
          <IconoWhatsApp /> Abrir WhatsApp de nuevo
        </a>
        <button type="button" className="btn btn-borde" onClick={onOtro}>
          <RotateCcw /> Pedir otro turno
        </button>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { CalendarClock, CalendarOff, Copy, Info, X } from "lucide-react";
import { SERVICIO_IDS, type Catalogo, type ServicioId, type Tramo } from "../data";
import { ahoraEnParana, diaDeSemana, limpiarTramos, serviciosDe, sumarDias } from "../horarios";
import { fechaLarga, parseFecha } from "../turno";
import { Hoja } from "./Hoja";
import { Tramos, textoTramos } from "./Tramos";

const SEMANA: [number, string, string][] = [
  [1, "lun", "Lunes"],
  [2, "mar", "Martes"],
  [3, "mié", "Miércoles"],
  [4, "jue", "Jueves"],
  [5, "vie", "Viernes"],
  [6, "sáb", "Sábado"],
  [0, "dom", "Domingo"],
];
const ALCANCES: [number, string][] = [
  [14, "2 semanas"],
  [21, "3 semanas"],
  [30, "1 mes"],
  [45, "1 mes y medio"],
  [60, "2 meses"],
];
const DIAS_CALENDARIO = 56;

type Modo = "normal" | "cerrado" | "especial";

// Qué servicios se ofrecen: todos, o uno solo (por ejemplo, una jornada de depilación).
type OpcionServicios = "todos" | ServicioId;
const OPCIONES_SERVICIOS: [OpcionServicios, string][] = [
  ["todos", "Todo"],
  ["laser", "Solo depilación"],
  ["facial", "Solo faciales"],
];
const aOpcion = (l: ServicioId[] | null | undefined): OpcionServicios =>
  l && l.length === 1 ? l[0] : "todos";
const deOpcion = (o: OpcionServicios): ServicioId[] => (o === "todos" ? SERVICIO_IDS : [o]);
const textoServicios = (l: ServicioId[] | null | undefined) =>
  ({ todos: "", laser: "Solo depilación", facial: "Solo faciales" })[aOpcion(l)];
const mismos = (a: ServicioId[], b: ServicioId[]) => a.length === b.length && a.every((x) => b.includes(x));

// Aplica la configuración de una fecha. tramos null = horario de siempre.
function cambiarDia(c: Catalogo, iso: string, tramos: Tramo[] | null, servicios: ServicioId[]): Catalogo {
  const excepciones = { ...c.excepciones };
  const soloServicios = { ...c.soloServicios };
  if (tramos === null) delete excepciones[iso];
  else excepciones[iso] = tramos;
  const deLaSemana = c.serviciosSemana[String(diaDeSemana(iso))] ?? SERVICIO_IDS;
  if (tramos?.length === 0 || mismos(servicios, deLaSemana)) delete soloServicios[iso];
  else soloServicios[iso] = servicios;
  return { ...c, excepciones, soloServicios };
}

export type GuardarDia = (cambiar: (c: Catalogo) => Catalogo, mensaje: string) => Promise<boolean>;

export function Agenda({
  cat,
  set,
  onGuardarDia,
}: {
  cat: Catalogo;
  set: (c: Catalogo) => void;
  onGuardarDia: GuardarDia;
}) {
  const { hoy } = ahoraEnParana();
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);

  const setSemana = (d: number, tramos: Tramo[]) =>
    set({ ...cat, semana: cat.semana.map((t, i) => (i === d ? tramos : t)), horariosRevisados: true });

  const setServiciosSemana = (d: number, o: OpcionServicios) => {
    const serviciosSemana = { ...cat.serviciosSemana };
    if (o === "todos") delete serviciosSemana[String(d)];
    else serviciosSemana[String(d)] = [o];
    set({ ...cat, serviciosSemana });
  };

  const copiarATodos = (d: number) =>
    set({
      ...cat,
      semana: cat.semana.map((t, i) => (i !== d && t.length ? cat.semana[d].map((x) => ({ ...x })) : t)),
      horariosRevisados: true,
    });

  const dias = useMemo(() => {
    const primero = sumarDias(hoy, -((diaDeSemana(hoy) + 6) % 7));
    return Array.from({ length: DIAS_CALENDARIO + ((diaDeSemana(hoy) + 6) % 7) }, (_, i) => sumarDias(primero, i));
  }, [hoy]);

  const especiales = [...new Set([...Object.keys(cat.excepciones), ...Object.keys(cat.soloServicios)])]
    .filter((iso) => iso >= hoy)
    .sort();

  return (
    <>
      <div className="panel-cabecera">
        <div>
          <span className="eyebrow">Tu página</span>
          <h1>Agenda</h1>
        </div>
      </div>
      <p className="panel-intro">
        Armá tus horarios. La gente solo ve los turnos que entran en tu horario y que nadie reservó todavía.
      </p>

      {!cat.horariosRevisados && (
        <div className="aviso-revisar">
          <Info />
          <div>
            <strong>Estos horarios son de ejemplo.</strong>
            <p>Cambialos por los tuyos, o si ya están bien, tocá el botón y después Guardar cambios.</p>
            <button type="button" className="btn btn-borde btn-sm" onClick={() => set({ ...cat, horariosRevisados: true })}>
              Están bien así
            </button>
          </div>
        </div>
      )}

      <section className="ed-bloque">
        <h2 className="ed-titulo">
          <CalendarOff /> Días especiales
        </h2>
        <p className="ed-bajada">
          Tocá un día para dejarlo <strong>solo para depilación</strong> (o solo faciales), cerrarlo por vacaciones o
          feriado, o atender en otro horario. Se guarda al toque.
        </p>

        <div className="cal-admin">
          {SEMANA.map(([d, corto]) => (
            <span key={d} className="cal-dow">
              {corto}
            </span>
          ))}
          {dias.map((iso) => {
            const pasado = iso < hoy;
            const excepcion = cat.excepciones[iso];
            const cerrado = excepcion?.length === 0;
            const especial = !!excepcion?.length;
            const normalCerrado = !excepcion && cat.semana[diaDeSemana(iso)].length === 0;
            const solo = !cerrado && !normalCerrado ? textoServicios(serviciosDe(cat, iso)) : "";
            const fecha = parseFecha(iso);
            return (
              <button
                key={iso}
                type="button"
                className={`dia ${cerrado ? "dia-bloqueado" : ""} ${especial ? "dia-especial" : ""} ${normalCerrado ? "dia-libre" : ""} ${solo ? "dia-solo" : ""}`}
                disabled={pasado}
                aria-label={`${fechaLarga(iso)}: ${excepcion ? (cerrado ? "cerrado" : "horario especial") : normalCerrado ? "no atendés" : "horario de siempre"}${solo ? `, ${solo.toLowerCase()}` : ""}`}
                onClick={() => setDiaAbierto(iso)}
              >
                <span>
                  {fecha.getDate()}
                  {fecha.getDate() === 1 && (
                    <span className="dia-mes">{fecha.toLocaleDateString("es-AR", { month: "short" })}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <div className="leyendas">
          <span>
            <i className="ley ley-solo" /> Un solo servicio
          </span>
          <span>
            <i className="ley ley-cerrado" /> Cerrado
          </span>
          <span>
            <i className="ley ley-especial" /> Horario especial
          </span>
          <span>
            <i className="ley ley-libre" /> No atendés
          </span>
        </div>

        {especiales.length > 0 && (
          <div className="ed-sub">
            <h3 className="seccion-titulo">
              Próximos días especiales <small>{especiales.length}</small>
            </h3>
            <ul className="especiales">
              {especiales.map((iso) => {
                const tramos = cat.excepciones[iso];
                const servicios = tramos?.length === 0 ? "" : textoServicios(serviciosDe(cat, iso));
                const horario = tramos === undefined ? "Horario de siempre" : tramos.length ? textoTramos(tramos) : "Cerrado";
                return (
                  <li key={iso}>
                    <button type="button" className="especial-dato" onClick={() => setDiaAbierto(iso)}>
                      <strong>{fechaLarga(iso)}</strong>
                      <span className={tramos?.length === 0 ? "texto-peligro" : ""}>
                        {servicios && <b className="especial-solo">{servicios} · </b>}
                        {horario}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-fantasma btn-icono"
                      aria-label={`Volver a lo de siempre el ${fechaLarga(iso)}`}
                      onClick={() =>
                        onGuardarDia(
                          (c) => cambiarDia(c, iso, null, c.serviciosSemana[String(diaDeSemana(iso))] ?? SERVICIO_IDS),
                          `${fechaLarga(iso)}: volvió a lo de siempre`,
                        )
                      }
                    >
                      <X />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section className="ed-bloque">
        <h2 className="ed-titulo">
          <CalendarClock /> Tu semana
        </h2>
        <p className="ed-bajada">
          Tu horario de siempre. Si cortás al mediodía, agregá dos horarios en el mismo día. Si un día de la semana es
          siempre de depilación, elegilo en <strong>Ofrecés</strong>.
        </p>
        <div className="semana">
          {SEMANA.map(([d, , largo]) => {
            const tramos = cat.semana[d];
            const atiende = tramos.length > 0;
            return (
              <div key={d} className={`semana-dia ${atiende ? "" : "semana-cerrado"}`}>
                <div className="semana-cabeza">
                  <strong>{largo}</strong>
                  <label className="interruptor">
                    <input
                      type="checkbox"
                      checked={atiende}
                      onChange={(e) => setSemana(d, e.target.checked ? [{ desde: "09:00", hasta: "13:00" }] : [])}
                    />
                    <span aria-hidden="true" />
                    {atiende ? "Atiendo" : "No atiendo"}
                  </label>
                </div>
                {atiende && (
                  <>
                    <Tramos tramos={tramos} etiqueta={largo} onChange={(t) => setSemana(d, t)} />
                    <label className="semana-ofreces">
                      <span>Ofrecés</span>
                      <select
                        className="input input-select"
                        value={aOpcion(cat.serviciosSemana[String(d)])}
                        onChange={(e) => setServiciosSemana(d, e.target.value as OpcionServicios)}
                      >
                        <option value="todos">Todos los servicios</option>
                        <option value="laser">Solo depilación láser</option>
                        <option value="facial">Solo tratamientos faciales</option>
                      </select>
                    </label>
                    {cat.semana.some((t, i) => i !== d && t.length) && (
                      <button type="button" className="link link-chico" onClick={() => copiarATodos(d)}>
                        <Copy /> Copiar este horario a los demás días que atendés
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="ed-bloque">
        <h2 className="ed-titulo">¿Con cuánta anticipación pueden reservar?</h2>
        <div className="chips">
          {ALCANCES.map(([n, txt]) => (
            <button
              key={n}
              type="button"
              className="chip"
              aria-pressed={cat.diasAMostrar === n}
              onClick={() => set({ ...cat, diasAMostrar: n })}
            >
              {txt}
            </button>
          ))}
        </div>
      </section>

      <EditorDia
        iso={diaAbierto}
        cat={cat}
        onCerrar={() => setDiaAbierto(null)}
        onGuardar={async (iso, tramos, servicios) => {
          const ok = await onGuardarDia(
            (c) => cambiarDia(c, iso, tramos, servicios),
            `${fechaLarga(iso)} guardado. Ya se ve en la página.`,
          );
          if (ok) setDiaAbierto(null);
        }}
      />
    </>
  );
}

function EditorDia({
  iso,
  cat,
  onCerrar,
  onGuardar,
}: {
  iso: string | null;
  cat: Catalogo;
  onCerrar: () => void;
  onGuardar: (iso: string, tramos: Tramo[] | null, servicios: ServicioId[]) => Promise<void>;
}) {
  const siempre = iso ? cat.semana[diaDeSemana(iso)] : [];
  const actual = iso ? cat.excepciones[iso] : undefined;
  const modoInicial: Modo = actual === undefined ? "normal" : actual.length ? "especial" : "cerrado";
  const [modo, setModo] = useState<Modo>(modoInicial);
  const [tramos, setTramos] = useState<Tramo[]>([]);
  const [servicios, setServicios] = useState<OpcionServicios>("todos");
  const [abiertoPara, setAbiertoPara] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // al abrir otro día, se arranca de su configuración
  if (iso && iso !== abiertoPara) {
    setAbiertoPara(iso);
    setModo(modoInicial);
    setTramos(actual?.length ? actual : siempre.length ? siempre : [{ desde: "09:00", hasta: "13:00" }]);
    setServicios(aOpcion(serviciosDe(cat, iso)));
  }

  const opciones: [Modo, string, string][] = [
    ["normal", "Horario de siempre", siempre.length ? textoTramos(siempre) : "Ese día no atendés"],
    ["especial", "Horario especial", "Solo para este día"],
    ["cerrado", "No atiendo este día", "Nadie va a poder reservar"],
  ];
  const tramosOk = limpiarTramos(tramos);
  const cerrado = modo === "cerrado";

  async function guardar() {
    if (!iso) return;
    setGuardando(true);
    await onGuardar(iso, modo === "normal" ? null : cerrado ? [] : tramosOk, deOpcion(servicios));
    setGuardando(false);
  }

  return (
    <Hoja
      abierta={!!iso}
      onCerrar={onCerrar}
      titulo={iso ? fechaLarga(iso) : ""}
      pie={
        <>
          <button type="button" className="btn btn-fantasma" onClick={onCerrar}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primario"
            disabled={(modo === "especial" && tramosOk.length === 0) || guardando}
            onClick={guardar}
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </>
      }
    >
      <div className={`dia-bloque ${cerrado ? "dia-bloque-apagado" : ""}`}>
        <h3 className="seccion-titulo">¿Qué ofrecés ese día?</h3>
        <div className="segmentado segmentado-ancho" role="radiogroup" aria-label="Servicios de ese día">
          {OPCIONES_SERVICIOS.map(([id, txt]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={servicios === id}
              disabled={cerrado}
              onClick={() => setServicios(id)}
            >
              {txt}
            </button>
          ))}
        </div>
        <p className="ayuda" style={{ marginTop: "var(--s-2)" }}>
          {cerrado
            ? "Ese día no atendés."
            : servicios === "laser"
              ? "Jornada de depilación: ese día solo se pueden reservar turnos de depilación láser."
              : servicios === "facial"
                ? "Ese día solo se pueden reservar tratamientos faciales."
                : "Se puede reservar cualquier servicio."}
        </p>
      </div>

      <div className="dia-bloque">
        <h3 className="seccion-titulo">¿En qué horario?</h3>
        <div className="opciones-dia" role="radiogroup" aria-label="Horario de ese día">
          {opciones.map(([id, titulo, detalle]) => (
            <button key={id} type="button" role="radio" aria-checked={modo === id} className="opcion-dia" onClick={() => setModo(id)}>
              <span className="radio" aria-hidden="true" />
              <span>
                <strong>{titulo}</strong>
                <small>{detalle}</small>
              </span>
            </button>
          ))}
        </div>
        {modo === "especial" && (
          <div className="ed-sub">
            <Tramos tramos={tramos} etiqueta="Horario especial" onChange={setTramos} />
          </div>
        )}
      </div>
    </Hoja>
  );
}

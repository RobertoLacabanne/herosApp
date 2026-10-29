import { useMemo, useState } from "react";
import { CalendarOff, CalendarClock, Copy, Info, RotateCcw, X } from "lucide-react";
import type { Catalogo, Tramo } from "../data";
import { ahoraEnParana, diaDeSemana, limpiarTramos, sumarDias } from "../horarios";
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

export function Agenda({ cat, set }: { cat: Catalogo; set: (c: Catalogo) => void }) {
  const { hoy } = ahoraEnParana();
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);

  const setSemana = (d: number, tramos: Tramo[]) =>
    set({ ...cat, semana: cat.semana.map((t, i) => (i === d ? tramos : t)), horariosRevisados: true });

  const copiarATodos = (d: number) =>
    set({
      ...cat,
      semana: cat.semana.map((t, i) => (i !== d && t.length ? cat.semana[d].map((x) => ({ ...x })) : t)),
      horariosRevisados: true,
    });

  const setExcepcion = (iso: string, tramos: Tramo[] | null) => {
    const excepciones = { ...cat.excepciones };
    if (tramos === null) delete excepciones[iso];
    else excepciones[iso] = tramos;
    set({ ...cat, excepciones });
  };

  const dias = useMemo(() => {
    const primero = sumarDias(hoy, -((diaDeSemana(hoy) + 6) % 7));
    return Array.from({ length: DIAS_CALENDARIO + ((diaDeSemana(hoy) + 6) % 7) }, (_, i) => sumarDias(primero, i));
  }, [hoy]);

  const especiales = Object.entries(cat.excepciones)
    .filter(([iso]) => iso >= hoy)
    .sort(([a], [b]) => (a < b ? -1 : 1));

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
          <CalendarClock /> Tu semana
        </h2>
        <p className="ed-bajada">Tu horario de siempre. Si cortás al mediodía, agregá dos horarios en el mismo día.</p>
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
                      onChange={(e) =>
                        setSemana(d, e.target.checked ? [{ desde: "09:00", hasta: "13:00" }] : [])
                      }
                    />
                    <span aria-hidden="true" />
                    {atiende ? "Atiendo" : "No atiendo"}
                  </label>
                </div>
                {atiende && (
                  <>
                    <Tramos tramos={tramos} etiqueta={largo} onChange={(t) => setSemana(d, t)} />
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
        <h2 className="ed-titulo">
          <CalendarOff /> Días especiales
        </h2>
        <p className="ed-bajada">
          Tocá un día para cerrarlo (vacaciones, feriados) o para atender en otro horario solo ese día.
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
            const fecha = parseFecha(iso);
            return (
              <button
                key={iso}
                type="button"
                className={`dia ${cerrado ? "dia-bloqueado" : ""} ${especial ? "dia-especial" : ""} ${normalCerrado ? "dia-libre" : ""}`}
                disabled={pasado}
                aria-label={`${fechaLarga(iso)}: ${excepcion ? (cerrado ? "cerrado" : "horario especial") : normalCerrado ? "no atendés" : "horario de siempre"}`}
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
              {especiales.map(([iso, tramos]) => (
                <li key={iso}>
                  <button type="button" className="especial-dato" onClick={() => setDiaAbierto(iso)}>
                    <strong>{fechaLarga(iso)}</strong>
                    <span className={tramos.length ? "" : "texto-peligro"}>{tramos.length ? textoTramos(tramos) : "Cerrado"}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-fantasma btn-icono"
                    aria-label={`Volver al horario de siempre el ${fechaLarga(iso)}`}
                    onClick={() => setExcepcion(iso, null)}
                  >
                    <X />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
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
        onAplicar={(iso, tramos) => {
          setExcepcion(iso, tramos);
          setDiaAbierto(null);
        }}
      />
    </>
  );
}

function EditorDia({
  iso,
  cat,
  onCerrar,
  onAplicar,
}: {
  iso: string | null;
  cat: Catalogo;
  onCerrar: () => void;
  onAplicar: (iso: string, tramos: Tramo[] | null) => void;
}) {
  const siempre = iso ? cat.semana[diaDeSemana(iso)] : [];
  const actual = iso ? cat.excepciones[iso] : undefined;
  const modoInicial: Modo = actual === undefined ? "normal" : actual.length ? "especial" : "cerrado";
  const [modo, setModo] = useState<Modo>(modoInicial);
  const [tramos, setTramos] = useState<Tramo[]>([]);
  const [abiertoPara, setAbiertoPara] = useState<string | null>(null);

  // al abrir otro día, se arranca de su configuración
  if (iso && iso !== abiertoPara) {
    setAbiertoPara(iso);
    setModo(modoInicial);
    setTramos(actual?.length ? actual : siempre.length ? siempre : [{ desde: "09:00", hasta: "13:00" }]);
  }

  const opciones: [Modo, string, string][] = [
    ["normal", "Horario de siempre", siempre.length ? textoTramos(siempre) : "Ese día no atendés"],
    ["cerrado", "No atiendo este día", "Nadie va a poder reservar"],
    ["especial", "Horario especial", "Solo para este día"],
  ];
  const tramosOk = limpiarTramos(tramos);

  return (
    <Hoja
      abierta={!!iso}
      onCerrar={onCerrar}
      titulo={iso ? fechaLarga(iso) : ""}
      bajada="¿Cómo atendés ese día?"
      pie={
        <>
          <button type="button" className="btn btn-fantasma" onClick={onCerrar}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primario"
            disabled={modo === "especial" && tramosOk.length === 0}
            onClick={() => iso && onAplicar(iso, modo === "normal" ? null : modo === "cerrado" ? [] : tramosOk)}
          >
            Aplicar
          </button>
        </>
      }
    >
      <div className="opciones-dia" role="radiogroup" aria-label="Cómo atendés ese día">
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
      {modoInicial !== "normal" && modo === "normal" && (
        <p className="ayuda" style={{ marginTop: "var(--s-3)" }}>
          <RotateCcw style={{ width: 12, height: 12, verticalAlign: -1 }} /> Vuelve a tu horario de siempre.
        </p>
      )}
    </Hoja>
  );
}

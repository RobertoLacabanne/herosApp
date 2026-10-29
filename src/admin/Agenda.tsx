import { useMemo } from "react";
import { X } from "lucide-react";
import type { Catalogo } from "../data";
import { isoDe, parseFecha } from "../turno";

const SEMANA: [number, string, string][] = [
  [1, "lun", "Lunes"],
  [2, "mar", "Martes"],
  [3, "mié", "Miércoles"],
  [4, "jue", "Jueves"],
  [5, "vie", "Viernes"],
  [6, "sáb", "Sábado"],
  [0, "dom", "Domingo"],
];
const ALCANCES = [14, 21, 30, 45, 60];
const DIAS_CALENDARIO = 56;

export function Agenda({ cat, set }: { cat: Catalogo; set: (c: Catalogo) => void }) {
  const hoyIso = isoDe(new Date());
  const bloqueados = cat.diasBloqueados.filter((d) => d >= hoyIso);

  const alternarDia = (d: number) =>
    set({
      ...cat,
      diasAtencion: cat.diasAtencion.includes(d) ? cat.diasAtencion.filter((x) => x !== d) : [...cat.diasAtencion, d],
    });

  const alternarBloqueo = (iso: string) =>
    set({
      ...cat,
      // de paso se limpian los bloqueos que ya pasaron
      diasBloqueados: (cat.diasBloqueados.includes(iso)
        ? cat.diasBloqueados.filter((x) => x !== iso)
        : [...cat.diasBloqueados, iso]
      )
        .filter((x) => x >= hoyIso)
        .sort(),
    });

  const semanas = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const cursor = new Date(hoy);
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
    const fin = new Date(hoy);
    fin.setDate(hoy.getDate() + DIAS_CALENDARIO);
    const dias: Date[] = [];
    while (cursor <= fin) {
      dias.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return { dias, hoy };
  }, []);

  return (
    <>
      <div className="panel-cabecera">
        <div>
          <span className="eyebrow">Tu página</span>
          <h1>Agenda</h1>
        </div>
      </div>
      <p className="panel-intro">
        Elegí qué días atendés y bloqueá los que no vas a estar. La gente solo puede pedir turno en los días libres.
      </p>

      <section className="ed-bloque">
        <h2 className="ed-titulo">Días de atención</h2>
        <div className="semana-toggle" role="group" aria-label="Días de atención">
          {SEMANA.map(([d, corto, largo]) => (
            <button
              key={d}
              type="button"
              aria-pressed={cat.diasAtencion.includes(d)}
              aria-label={largo}
              onClick={() => alternarDia(d)}
            >
              {corto}
            </button>
          ))}
        </div>
        {cat.diasAtencion.length === 0 && (
          <p className="ed-aviso">Elegí al menos un día: si no, se usan de lunes a sábado.</p>
        )}

        <h3 className="seccion-titulo" style={{ marginTop: "var(--s-8)" }}>
          ¿Con cuánta anticipación pueden pedir?
        </h3>
        <div className="chips">
          {ALCANCES.map((n) => (
            <button
              key={n}
              type="button"
              className="chip"
              aria-pressed={cat.diasAMostrar === n}
              onClick={() => set({ ...cat, diasAMostrar: n })}
            >
              {n === 14 ? "2 semanas" : n === 21 ? "3 semanas" : n === 30 ? "1 mes" : n === 45 ? "1 mes y medio" : "2 meses"}
            </button>
          ))}
        </div>
      </section>

      <section className="ed-bloque">
        <h2 className="ed-titulo">Días bloqueados</h2>
        <p className="ed-bajada">Tocá un día para bloquearlo (vacaciones, feriados, un curso). Tocalo de nuevo para liberarlo.</p>

        <div className="cal-admin">
          {SEMANA.map(([d, corto]) => (
            <span key={d} className="cal-dow">
              {corto}
            </span>
          ))}
          {semanas.dias.map((fecha) => {
            const iso = isoDe(fecha);
            const pasado = fecha < semanas.hoy;
            const atiende = cat.diasAtencion.includes(fecha.getDay());
            const bloqueado = cat.diasBloqueados.includes(iso);
            const etiqueta = fecha.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
            return (
              <button
                key={iso}
                type="button"
                className={`dia ${bloqueado ? "dia-bloqueado" : ""}`}
                disabled={pasado || !atiende}
                aria-pressed={bloqueado}
                aria-label={`${etiqueta}${bloqueado ? ", bloqueado" : ""}`}
                onClick={() => alternarBloqueo(iso)}
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

        {bloqueados.length > 0 && (
          <div className="ed-sub">
            <h3 className="seccion-titulo">
              Bloqueados <small>{bloqueados.length}</small>
            </h3>
            <div className="chips">
              {bloqueados.map((iso) => (
                <span key={iso} className="chip chip-editable chip-bloqueo">
                  {parseFecha(iso).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
                  <button type="button" aria-label="Liberar día" onClick={() => alternarBloqueo(iso)}>
                    <X />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

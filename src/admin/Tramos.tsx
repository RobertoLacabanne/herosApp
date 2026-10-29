import { Plus, Trash2 } from "lucide-react";
import type { Tramo } from "../data";
import { aMin, deMin } from "../horarios";

const OPCIONES_HORA = Array.from({ length: (24 - 6) * 4 }, (_, i) => deMin(6 * 60 + i * 15));

// Selector de hora en formato 24 h (el input nativo cambia según el idioma del celular).
export function SelectorHora({
  value,
  onChange,
  etiqueta,
  vacio,
}: {
  value: string;
  onChange: (v: string) => void;
  etiqueta: string;
  vacio?: string;
}) {
  const opciones = value && !OPCIONES_HORA.includes(value) ? [...OPCIONES_HORA, value].sort() : OPCIONES_HORA;
  return (
    <select className="input input-hora" aria-label={etiqueta} value={value} onChange={(e) => onChange(e.target.value)}>
      {vacio !== undefined && <option value="">{vacio}</option>}
      {opciones.map((h) => (
        <option key={h} value={h}>
          {h}
        </option>
      ))}
    </select>
  );
}

export const textoTramos = (t: Tramo[]) =>
  t.length ? t.map((x) => `${x.desde} a ${x.hasta}`).join(" y ") : "No atiende";

// Lista de horarios de un día (por ejemplo, 9:00 a 13:00 y 16:00 a 20:00).
export function Tramos({ tramos, onChange, etiqueta }: { tramos: Tramo[]; onChange: (t: Tramo[]) => void; etiqueta: string }) {
  const cambiar = (i: number, c: Partial<Tramo>) => onChange(tramos.map((t, j) => (j === i ? { ...t, ...c } : t)));

  function agregar() {
    const ultimo = tramos[tramos.length - 1];
    // el nuevo arranca una hora después del anterior (o a las 9 si no hay)
    const desde = ultimo ? Math.min(aMin(ultimo.hasta) + 60, 22 * 60) : 9 * 60;
    onChange([...tramos, { desde: deMin(desde), hasta: deMin(Math.min(desde + 4 * 60, 23 * 60 + 30)) }]);
  }

  return (
    <div className="tramos">
      {tramos.map((t, i) => {
        const invalido = aMin(t.desde) >= aMin(t.hasta);
        return (
          <div key={i} className={`tramo ${invalido ? "tramo-mal" : ""}`}>
            <SelectorHora etiqueta={`${etiqueta}: desde`} value={t.desde} onChange={(v) => cambiar(i, { desde: v })} />
            <span className="tramo-a">a</span>
            <SelectorHora etiqueta={`${etiqueta}: hasta`} value={t.hasta} onChange={(v) => cambiar(i, { hasta: v })} />
            <button
              type="button"
              className="btn btn-sm btn-fantasma btn-icono"
              aria-label="Quitar este horario"
              onClick={() => onChange(tramos.filter((_, j) => j !== i))}
            >
              <Trash2 />
            </button>
            {invalido && <span className="tramo-aviso">La hora de fin tiene que ser después de la de inicio</span>}
          </div>
        );
      })}
      {tramos.length < 4 && (
        <button type="button" className="btn btn-sm btn-fantasma tramo-agregar" onClick={agregar}>
          <Plus /> {tramos.length ? "Agregar otro horario" : "Agregar horario"}
        </button>
      )}
    </div>
  );
}

import { useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import type { Catalogo, Combo, Publico } from "../data";
import { IlusFacial, IlusLaser } from "../icons";

type SetCat = (c: Catalogo) => void;

export function Servicios({ cat, set }: { cat: Catalogo; set: SetCat }) {
  return (
    <>
      <div className="panel-cabecera">
        <div>
          <span className="eyebrow">Tu página</span>
          <h1>Servicios</h1>
        </div>
      </div>
      <p className="panel-intro">
        Lo que cambies acá es lo que ve la gente cuando pide turno. Acordate de tocar <strong>Guardar cambios</strong>.
      </p>
      <Laser cat={cat} set={set} />
      <Faciales cat={cat} set={set} />
    </>
  );
}

function Laser({ cat, set }: { cat: Catalogo; set: SetCat }) {
  const [publico, setPublico] = useState<Publico>("ella");
  const zonas = cat.zonas[publico];
  const combos = cat.combosLaser[publico];

  const setZonas = (nuevas: string[]) =>
    set({
      ...cat,
      zonas: { ...cat.zonas, [publico]: nuevas },
      // si se quita una zona, también sale de los combos
      combosLaser: {
        ...cat.combosLaser,
        [publico]: combos.map((c) => ({ ...c, items: c.items.filter((i) => nuevas.includes(i)) })),
      },
    });
  const setCombos = (nuevos: Combo[]) => set({ ...cat, combosLaser: { ...cat.combosLaser, [publico]: nuevos } });

  return (
    <section className="ed-bloque">
      <header className="ed-cabeza">
        <IlusLaser className="ed-ilus" />
        <div>
          <h2>Depilación láser</h2>
          <p>Zonas y combos, para ella y para él.</p>
        </div>
      </header>

      <div className="campo">
        <label htmlFor="dur-laser">Duración que se muestra</label>
        <input
          id="dur-laser"
          className="input"
          maxLength={30}
          value={cat.duraciones.laser}
          onChange={(e) => set({ ...cat, duraciones: { ...cat.duraciones, laser: e.target.value } })}
        />
      </div>

      <div className="ed-sub">
        <div className="segmentado" role="radiogroup" aria-label="Público">
          {(
            [
              ["ella", "Para ella"],
              ["el", "Para él"],
            ] as [Publico, string][]
          ).map(([id, txt]) => (
            <button key={id} type="button" role="radio" aria-checked={publico === id} onClick={() => setPublico(id)}>
              {txt}
            </button>
          ))}
        </div>
      </div>

      <div className="ed-sub">
        <h3 className="seccion-titulo">
          Zonas <small>{zonas.length}</small>
        </h3>
        <div className="chips">
          {zonas.map((z) => (
            <span key={z} className="chip chip-editable">
              {z}
              <button type="button" aria-label={`Quitar ${z}`} onClick={() => setZonas(zonas.filter((x) => x !== z))}>
                <X />
              </button>
            </span>
          ))}
        </div>
        <Agregar
          placeholder="Nueva zona, ej.: Bozo"
          etiqueta="Agregar zona"
          onAgregar={(z) => !zonas.includes(z) && setZonas([...zonas, z])}
        />
      </div>

      <div className="ed-sub">
        <h3 className="seccion-titulo">
          Combos <small>Atajos que eligen varias zonas juntas</small>
        </h3>
        <EditorCombos combos={combos} opciones={zonas} set={setCombos} prefijo={`l-${publico}`} />
      </div>
    </section>
  );
}

function Faciales({ cat, set }: { cat: Catalogo; set: SetCat }) {
  const trats = cat.tratamientos;

  function renombrar(i: number, nombre: string) {
    const viejo = trats[i].nombre;
    set({
      ...cat,
      tratamientos: trats.map((t, j) => (j === i ? { ...t, nombre } : t)),
      combosFaciales: cat.combosFaciales.map((c) => ({ ...c, items: c.items.map((x) => (x === viejo ? nombre : x)) })),
    });
  }

  function quitar(i: number) {
    const viejo = trats[i].nombre;
    set({
      ...cat,
      tratamientos: trats.filter((_, j) => j !== i),
      combosFaciales: cat.combosFaciales.map((c) => ({ ...c, items: c.items.filter((x) => x !== viejo) })),
    });
  }

  return (
    <section className="ed-bloque">
      <header className="ed-cabeza">
        <IlusFacial className="ed-ilus" />
        <div>
          <h2>Tratamientos faciales</h2>
          <p>Cada tratamiento con una frase corta que lo explique.</p>
        </div>
      </header>

      <div className="campo">
        <label htmlFor="dur-facial">Duración que se muestra</label>
        <input
          id="dur-facial"
          className="input"
          maxLength={30}
          value={cat.duraciones.facial}
          onChange={(e) => set({ ...cat, duraciones: { ...cat.duraciones, facial: e.target.value } })}
        />
      </div>

      <div className="ed-sub">
        <h3 className="seccion-titulo">
          Tratamientos <small>{trats.length}</small>
        </h3>
        <div className="ed-lista">
          {trats.map((t, i) => (
            <div key={i} className="ed-fila">
              <div className="ed-fila-campos">
                <input
                  className="input input-titulo"
                  aria-label="Nombre del tratamiento"
                  maxLength={60}
                  placeholder="Nombre, ej.: Microdermoabrasión"
                  value={t.nombre}
                  onChange={(e) => renombrar(i, e.target.value)}
                />
                <input
                  className="input input-chico"
                  aria-label="Descripción corta"
                  maxLength={120}
                  placeholder="Frase corta (opcional)"
                  value={t.detalle}
                  onChange={(e) =>
                    set({ ...cat, tratamientos: trats.map((x, j) => (j === i ? { ...x, detalle: e.target.value } : x)) })
                  }
                />
              </div>
              <button
                type="button"
                className="btn btn-sm btn-fantasma btn-icono"
                aria-label={`Quitar ${t.nombre || "tratamiento"}`}
                onClick={() => quitar(i)}
              >
                <Trash2 />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-borde btn-sm ed-agregar"
          onClick={() => set({ ...cat, tratamientos: [...trats, { nombre: "", detalle: "" }] })}
        >
          <Plus /> Agregar tratamiento
        </button>
      </div>

      <div className="ed-sub">
        <h3 className="seccion-titulo">
          Combos <small>Atajos con varios tratamientos</small>
        </h3>
        <EditorCombos
          combos={cat.combosFaciales}
          opciones={trats.map((t) => t.nombre).filter(Boolean)}
          set={(combosFaciales) => set({ ...cat, combosFaciales })}
          prefijo="f"
        />
      </div>
    </section>
  );
}

function EditorCombos({
  combos,
  opciones,
  set,
  prefijo,
}: {
  combos: Combo[];
  opciones: string[];
  set: (c: Combo[]) => void;
  prefijo: string;
}) {
  const cambiar = (i: number, c: Partial<Combo>) => set(combos.map((x, j) => (j === i ? { ...x, ...c } : x)));

  return (
    <>
      <div className="ed-combos">
        {combos.map((c, i) => (
          <div key={c.id} className="ed-combo">
            <div className="ed-combo-cabeza">
              <input
                className="input input-titulo"
                aria-label="Nombre del combo"
                maxLength={40}
                value={c.nombre}
                placeholder="Nombre del combo"
                onChange={(e) => cambiar(i, { nombre: e.target.value })}
              />
              <button
                type="button"
                className="btn btn-sm btn-fantasma btn-icono"
                aria-label={`Borrar ${c.nombre || "combo"}`}
                onClick={() => set(combos.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </button>
            </div>
            <div className="chips chips-chicos">
              {opciones.map((o) => {
                const activo = c.items.includes(o);
                return (
                  <button
                    key={o}
                    type="button"
                    className="chip"
                    aria-pressed={activo}
                    onClick={() => cambiar(i, { items: activo ? c.items.filter((x) => x !== o) : [...c.items, o] })}
                  >
                    {activo && <Check />}
                    {o}
                  </button>
                );
              })}
            </div>
            {(!c.items.length || !c.nombre.trim()) && (
              <p className="ed-aviso">
                {!c.nombre.trim() ? "Ponele un nombre" : "Elegí al menos una opción"}: si no, no se va a mostrar.
              </p>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-borde btn-sm ed-agregar"
        onClick={() => set([...combos, { id: `${prefijo}-${Date.now()}`, nombre: `Combo ${combos.length + 1}`, items: [] }])}
      >
        <Plus /> Agregar combo
      </button>
    </>
  );
}

function Agregar({
  placeholder,
  etiqueta,
  onAgregar,
}: {
  placeholder: string;
  etiqueta: string;
  onAgregar: (texto: string) => void;
}) {
  const [valor, setValor] = useState("");
  const enviar = () => {
    const t = valor.trim();
    if (!t) return;
    onAgregar(t);
    setValor("");
  };
  return (
    <form
      className="ed-agregar-fila"
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
    >
      <input
        className="input"
        maxLength={60}
        placeholder={placeholder}
        aria-label={etiqueta}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
      />
      <button type="submit" className="btn btn-borde" disabled={!valor.trim()}>
        <Plus /> <span>Agregar</span>
      </button>
    </form>
  );
}

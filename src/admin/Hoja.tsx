import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

// Diálogo modal nativo; en el celular se muestra como hoja que sube desde abajo.
export function Hoja({
  abierta,
  onCerrar,
  titulo,
  bajada,
  children,
  pie,
}: {
  abierta: boolean;
  onCerrar: () => void;
  titulo: string;
  bajada?: string;
  children: ReactNode;
  pie?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal();
    if (!abierta && d.open) d.close();
  }, [abierta]);

  // Safari todavía no soporta closedby: cerrar al tocar afuera a mano (se mide la posición, no el target).
  useEffect(() => {
    const d = ref.current;
    if (!d || "closedBy" in HTMLDialogElement.prototype) return;
    const afuera = (e: PointerEvent) => {
      const r = d.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let empezoAfuera = false;
    const abajo = (e: PointerEvent) => (empezoAfuera = afuera(e));
    const arriba = (e: PointerEvent) => empezoAfuera && afuera(e) && d.close();
    d.addEventListener("pointerdown", abajo);
    d.addEventListener("pointerup", arriba);
    return () => {
      d.removeEventListener("pointerdown", abajo);
      d.removeEventListener("pointerup", arriba);
    };
  }, []);

  return (
    <dialog ref={ref} className="hoja" aria-labelledby={id} onClose={onCerrar} {...{ closedby: "any" }}>
      <header className="hoja-cabeza">
        <div>
          <h2 id={id}>{titulo}</h2>
          {bajada && <p>{bajada}</p>}
        </div>
        <button type="button" className="btn btn-fantasma btn-sm btn-icono" aria-label="Cerrar" onClick={() => ref.current?.close()}>
          <X />
        </button>
      </header>
      <div className="hoja-cuerpo">{abierta && children}</div>
      {pie && <footer className="hoja-pie">{pie}</footer>}
    </dialog>
  );
}

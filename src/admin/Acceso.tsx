import { useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Logo } from "../icons";
import { api } from "./api";

export function Acceso({ onEntrar }: { onEntrar: (usuario: string) => void }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError("");
    try {
      const r = await api<{ usuario: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ usuario, password }),
      });
      onEntrar(r.usuario);
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  return (
    <main className="acceso-pantalla">
      <form className="tarjeta acceso" onSubmit={entrar}>
        <Logo />
        <h1>Hola de nuevo</h1>
        <p>Entrá para ver tus pedidos y administrar la página.</p>
        <div className="campo">
          <label htmlFor="usuario">Usuario</label>
          <input
            id="usuario"
            className="input"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
          />
        </div>
        <div className="campo">
          <label htmlFor="password">Contraseña</label>
          <div className="input-con-boton">
            <input
              id="password"
              className="input"
              type={ver ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="input-boton"
              aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setVer(!ver)}
            >
              {ver ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>
        <button className="btn btn-primario" type="submit" disabled={!usuario.trim() || !password || enviando}>
          <LogIn /> {enviando ? "Entrando…" : "Entrar"}
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}

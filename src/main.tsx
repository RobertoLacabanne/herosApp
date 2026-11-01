import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Booking } from "./Booking";
import { Panel } from "./admin/Panel";
import "./styles.css";

const esPanel = window.location.pathname.replace(/\/$/, "") === "/panel";

if (esPanel) {
  // El panel se instala en el celular como app; la página pública no.
  document.title = "Panel · ERHOS Estética";
  const agregar = (tag: string, attrs: Record<string, string>) => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  };
  agregar("link", { rel: "manifest", href: "/panel.webmanifest" });
  agregar("link", { rel: "apple-touch-icon", href: "/icono-180.png" });
  agregar("meta", { name: "apple-mobile-web-app-capable", content: "yes" });
  agregar("meta", { name: "mobile-web-app-capable", content: "yes" });
  agregar("meta", { name: "apple-mobile-web-app-title", content: "ERHOS" });
  agregar("meta", { name: "apple-mobile-web-app-status-bar-style", content: "default" });
  agregar("meta", { name: "robots", content: "noindex" });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>{esPanel ? <Panel /> : <Booking />}</StrictMode>,
);

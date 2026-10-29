import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Booking } from "./Booking";
import { Panel } from "./Panel";
import "./styles.css";

const esPanel = window.location.pathname.replace(/\/$/, "") === "/panel";

createRoot(document.getElementById("root")!).render(
  <StrictMode>{esPanel ? <Panel /> : <Booking />}</StrictMode>,
);

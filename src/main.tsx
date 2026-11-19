import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/outfit";
import "./styles/style.css";
import { applyTheme, loadTheme } from "./shared/settings/settings";
import App from "./app/App";

applyTheme(loadTheme());

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

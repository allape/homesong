import { i18n } from "@allape/gocrud-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.scss";
import App from "./App.tsx";
import en from "./i18n/en.ts";
import zh from "./i18n/zh.ts";

i18n
  .setup({
    zh,
    en,
  })
  .then(() => {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });

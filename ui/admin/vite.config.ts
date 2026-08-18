import GoCrudVitePlugin, {
  i18nextPlugin,
} from "@allape/gocrud-react/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), i18nextPlugin(), GoCrudVitePlugin(), viteSingleFile()],
  server: {
    host: "0.0.0.0",
  },
});

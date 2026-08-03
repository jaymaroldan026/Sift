import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(__dirname),
  base: "./",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173
  },
  build: {
    outDir: "../dist/dashboard",
    emptyOutDir: true
  }
});

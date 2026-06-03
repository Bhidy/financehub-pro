import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// The bundled native app calls the production backend API directly.
// Override with MOBILE_API_BASE if you ever point it at a staging host.
const API_BASE = process.env.MOBILE_API_BASE || "https://startamarkets.com";

export default defineConfig({
  root: resolve(__dirname, "mobile-native"),
  // Relative base so assets resolve under Capacitor's capacitor://localhost origin.
  base: "./",
  plugins: [react()],
  define: {
    __API_BASE__: JSON.stringify(API_BASE),
  },
  build: {
    outDir: resolve(__dirname, "mobile-native/dist"),
    emptyOutDir: true,
    assetsDir: "static",
    target: "es2020",
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
});

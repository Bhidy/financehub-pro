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
  // Explicit @/ alias so WorldClassMessage / ChatCards imports resolve in both
  // dev mode and production (Vite root is mobile-native/ so tsconfig paths
  // aren't auto-picked up in dev; this makes it explicit).
  resolve: {
    alias: {
      "@": resolve(__dirname),
    },
  },
  css: {
    // Point at the project-level PostCSS config (frontend/postcss.config.mjs)
    // which applies @tailwindcss/postcss.  Without this, Vite's root being
    // mobile-native/ means PostCSS config is never found, so Tailwind utility
    // classes (used by WorldClassMessage, ChatCards, MobileAiResponse) are
    // completely absent from the CSS bundle — everything renders unstyled.
    postcss: resolve(__dirname, "postcss.config.mjs"),
  },
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

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mubasher.startamarkets",
  appName: "Starta Markets",
  // Bundled native app: the UI ships inside the binary (no remote webview).
  // Built by `vite build --config vite.mobile.config.ts` (single source: app/mobile/StartaMobileApp.tsx).
  // The app calls the production API directly (https://startamarkets.com/api/v1) injected at build time.
  webDir: "mobile-native/dist",
  ios: {
    // We own the safe-area insets in CSS via env(safe-area-inset-*), so the
    // webview must extend full-screen without the system adding its own insets.
    contentInset: "never",
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: "#070b14ff",
  },
  plugins: {
    // The bundled UI runs at origin capacitor://localhost and calls the
    // production API at https://startamarkets.com. CapacitorHttp patches
    // fetch/XHR to go through the native HTTP stack, so cross-origin calls are
    // NOT subject to WKWebView CORS. This is the primary fix for the shipped
    // app loading no data; the next.config ACAO headers are a defensive backup.
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;

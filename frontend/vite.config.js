import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Der Bestand nutzt durchgaengig .js fuer JSX (57 Dateien). Vite parst .js
// standardmaessig ohne JSX und bricht ab. Statt 57 Dateien umzubenennen,
// laeuft esbuild mit dem jsx-Loader vor der Import-Analyse — 'pre' ist
// noetig, damit der Hook vor vite:build-import-analysis greift.
const jsxInJs = {
  name: 'jsx-in-js',
  enforce: 'pre',
  async transform(code, id) {
    if (!id.match(/src\/.*\.js$/)) return null;
    return transformWithEsbuild(code, id, {
      loader: 'jsx',
      jsx: 'automatic',
    });
  },
};

// Service Worker. Bewusst konservativ: die App zeigt Abrechnungsdaten, veraltete
// Zahlen waeren schlimmer als eine ehrliche Fehlermeldung. Deshalb wird nur die
// App-Huelle vorgehalten, keine Nutzdaten.
const pwa = VitePWA({
  registerType: 'prompt',
  // Registrierung passiert von Hand in src/pwa/registerServiceWorker.js, damit
  // sie in der spaeteren Capacitor-Huelle uebersprungen werden kann.
  injectRegister: null,
  manifest: false, // public/manifest.json wird unveraendert ausgeliefert
  includeAssets: [],
  workbox: {
    // config.js traegt die instanzspezifische Laufzeit-Konfiguration und wird
    // beim Containerstart neu geschrieben. Landet sie im Precache, bekaemen
    // Nutzer:innen nach einem Deploy die alte Konfiguration — deshalb raus.
    globPatterns: ['**/*.{js,css,html,woff2,ico,png,svg}'],
    globIgnores: ['**/config.js', '**/node_modules/**'],
    // Nur die App-Huelle. Grosse Assets gehoeren nicht in den Precache.
    maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
    // Offline oeffnet die App-Huelle aus dem Precache; die React-App meldet
    // dann selbst, dass keine Daten geladen werden koennen. offline.html liegt
    // ebenfalls im Precache und traegt den Fall, dass die Huelle fehlt — etwa
    // beim allerersten Aufruf ohne Netz.
    navigateFallback: '/index.html',
    // API-Aufrufe und die Laufzeit-Konfiguration duerfen nie ueber den
    // Navigations-Fallback laufen — sonst bekaeme fetch() HTML statt JSON.
    navigateFallbackDenylist: [/^\/api\//, /^\/config\.js$/],
    cleanupOutdatedCaches: true,
    clientsClaim: false, // erst nach bestaetigtem Update uebernehmen
    skipWaiting: false,
    runtimeCaching: [
      {
        // config.js immer frisch vom Netz. Der Cache dient nur als Notnagel,
        // damit die App im Offline-Start nicht ohne Konfiguration dasteht.
        urlPattern: ({ url }) => url.pathname === '/config.js',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'laufzeit-konfiguration',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 1 },
        },
      },
      {
        // API bewusst OHNE Cache: Fahrten, Abrechnungen und Erstattungssaetze
        // duerfen nie aus einem alten Stand kommen. Offline schlaegt der
        // Request fehl und die App zeigt ihre normale Fehlermeldung.
        urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
        handler: 'NetworkOnly',
      },
    ],
  },
  devOptions: {
    // Im Dev-Server kein SW — er wuerde HMR und den API-Proxy stoeren.
    enabled: false,
  },
});

export default defineConfig({
  plugins: [jsxInJs, react(), pwa],

  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },

  define: {
    // Ersetzt REACT_APP_VERSION aus dem alten Build-Skript ($npm_package_version).
    // Wird im Info-Dialog angezeigt.
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  build: {
    // Der Dockerfile kopiert /app/build nach nginx — Vite schreibt sonst nach dist/.
    outDir: 'build',
    sourcemap: false,
  },

  server: {
    port: 9642,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});

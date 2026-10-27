import { defineConfig, transformWithOxc } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Der Bestand nutzt .js fuer JSX; 'pre', damit Oxc vor der Import-Analyse greift.
const jsxInJs = {
  name: 'jsx-in-js',
  enforce: 'pre',
  async transform(code, id) {
    if (!id.match(/src\/.*\.js$/)) return null;
    return transformWithOxc(code, id, {
      lang: 'jsx',
      jsx: { runtime: 'automatic' },
    });
  },
};

// Nur die App-Huelle vorhalten, nie Abrechnungsdaten.
const pwa = VitePWA({
  registerType: 'prompt',
  // Von Hand registriert, damit die Capacitor-Huelle es ueberspringen kann.
  injectRegister: null,
  manifest: false, // public/manifest.json wird unveraendert ausgeliefert
  includeAssets: [],
  workbox: {
    // config.js wird beim Containerstart neu geschrieben und darf nicht in den Precache.
    globPatterns: ['**/*.{js,css,html,woff2,ico,png,svg}'],
    globIgnores: ['**/config.js', '**/node_modules/**'],
    // Nur die App-Huelle. Grosse Assets gehoeren nicht in den Precache.
    maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
    navigateFallback: '/index.html',
    // Nie ueber den Navigations-Fallback: API, Laufzeit-Konfiguration, Swagger-Doku.
    navigateFallbackDenylist: [/^\/api\//, /^\/api-docs/, /^\/config\.js$/],
    cleanupOutdatedCaches: true,
    clientsClaim: false, // erst nach bestaetigtem Update uebernehmen
    skipWaiting: false,
    runtimeCaching: [
      {
        // Cache nur als Notnagel fuer den Offline-Start.
        urlPattern: ({ url }) => url.pathname === '/config.js',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'laufzeit-konfiguration',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 1 },
        },
      },
      {
        // API ohne Cache: Zahlen duerfen nie veraltet sein.
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
    rolldownOptions: {
      moduleTypes: { '.js': 'jsx' },
    },
  },

  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  build: {
    // Der Dockerfile kopiert /app/build nach nginx — Vite schreibt sonst nach dist/.
    outDir: 'build',
    sourcemap: false,

    rolldownOptions: {
      output: {
        // Aufgeteilt nach Aenderungshaeufigkeit, damit React ueber Deploys im Cache bleibt.
        codeSplitting: { groups: [{ name(id) {
          if (!id.includes('node_modules')) return null;
          if (id.includes('react-dom') || /node_modules\/react\//.test(id)) {
            return 'react';
          }
          if (id.includes('react-router')) return 'router';
          if (id.includes('lucide-react')) return 'icons';
          // Lazy geladene Pakete nicht nach `vendor` ziehen, sonst laden sie beim Start.
          if (/node_modules\/(jszip|pako|@capacitor|@capgo|@aparajita)\//.test(id)) return null;
          return 'vendor';
        } }] },
      },
    },
  },

  server: {
    port: 9642,
    proxy: {
      '/api': { target: 'https://fahrtenbuch.godsapp.de', changeOrigin: true, secure: true },
    },
  },
});

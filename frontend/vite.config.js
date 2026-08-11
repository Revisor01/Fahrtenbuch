import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
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

export default defineConfig({
  plugins: [jsxInJs, react()],

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

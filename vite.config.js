import { defineConfig } from 'vite';

// base relative : le dossier dist/ fonctionne à la racine d'un domaine comme dans un sous-dossier
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
  server: { host: true },
});

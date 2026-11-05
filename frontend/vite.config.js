import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      port: Number(env.VITE_PORT) || 5173,
      // En desarrollo, /api se redirige al backend: no hace falta CORS ni URL absoluta.
      proxy: {
        '/api': env.VITE_API_PROXY || 'http://localhost:3001',
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      // Una página HTML por pantalla
      rollupOptions: {
        input: {
          tasador: 'index.html',
          login: 'login.html',
          panel: 'panel.html',
        },
      },
    },
  };
});

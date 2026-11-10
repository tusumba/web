import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const target = env.VITE_DEV_API_ORIGIN;
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: target ? { '/v1': { target, changeOrigin: true } } : undefined,
    },
  };
});

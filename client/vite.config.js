import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Клиент работает на своём адресе и порту (127.0.0.1:5500), API — на 127.0.0.1:8000.
// base: './' — собранный клиент открывается с любого статического сервера.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { host: '127.0.0.1', port: 5500 },
  worker: { format: 'es' },
});

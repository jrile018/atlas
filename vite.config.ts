import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
  server: {
    host: '127.0.0.1',
    port: 3001,
    strictPort: true,
    open: false,
    proxy: {
      '/research-api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/research-api/, ''),
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 3001,
    strictPort: true,
    proxy: {
      '/research-api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/research-api/, ''),
      },
    },
  },
});

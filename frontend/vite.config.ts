import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom', 'react-router-dom'],
          'konva': ['konva', 'react-konva'],
          'tiptap': ['@tiptap/react', '@tiptap/starter-kit'],
          'math': ['katex', 'react-katex'],
          'radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-select',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-popover',
            '@radix-ui/react-separator',
            '@radix-ui/react-avatar',
            '@radix-ui/react-label',
          ],
          'yjs': ['yjs', 'y-websocket', 'y-indexeddb'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['konva', 'react-konva', 'perfect-freehand', 'katex', 'yjs'],
  },
});

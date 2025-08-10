import { defineConfig } from 'vite';
import path from 'path';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/common': path.resolve(__dirname, 'src/common'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
      '@/main': path.resolve(__dirname, 'src/main'),
    },
  },
});

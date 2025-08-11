import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src'),
      '@/components': path.resolve(dirname, 'src/components'),
      '@/common': path.resolve(dirname, 'src/common'),
      '@/utils': path.resolve(dirname, 'src/utils'),
      '@/lib': path.resolve(dirname, 'src/lib'),
      '@/main': path.resolve(dirname, 'src/main'),
    },
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['src/**/*.stories.{js,ts,tsx}'],
    environment: 'jsdom',
  },
});

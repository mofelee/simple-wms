import { defineConfig } from 'vite';
import path from 'path';

// https://vitejs.dev/config
export default defineConfig(async () => {
  // 动态导入 ESM 模块
  const { default: react } = await import('@vitejs/plugin-react');
  const { TanStackRouterVite } = await import('@tanstack/router-plugin/vite');
  
  return {
    plugins: [
      TanStackRouterVite({
        routesDirectory: './src/routes',
        generatedRouteTree: './src/routeTree.gen.ts',
        autoCodeSplitting: false, // 禁用自动代码分割避免错误
        routeFileIgnorePrefix: '-', // 忽略以 - 开头的文件
        quoteStyle: 'single',
        semicolons: false,
      }),
      react(),
    ],
    resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/common': path.resolve(__dirname, 'src/common'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/main': path.resolve(__dirname, 'src/main'),
      '@/routes': path.resolve(__dirname, 'src/routes'),
    },
  },
  };
});

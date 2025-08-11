/* eslint-disable import/no-unresolved */

import { defineConfig } from "vite";
import path from "path";

// https://vitejs.dev/config
export default defineConfig(async () => {
  // 动态导入 ESM 模块
  const { default: react } = await import("@vitejs/plugin-react");
  const { TanStackRouterVite } = await import("@tanstack/router-plugin/vite");
  const { default: tailwindcss } = await import("@tailwindcss/vite");

  return {
    plugins: [
      TanStackRouterVite({
        routesDirectory: "./src/routes",
        generatedRouteTree: "./src/routeTree.gen.ts",
      }),
      tailwindcss(),
      react(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@/components": path.resolve(__dirname, "src/components"),
        "@/common": path.resolve(__dirname, "src/common"),
        "@/utils": path.resolve(__dirname, "src/utils"),
        "@/lib": path.resolve(__dirname, "src/lib"),
        "@/main": path.resolve(__dirname, "src/main"),
        "@/routes": path.resolve(__dirname, "src/routes"),
        // 添加 Buffer polyfill
        buffer: 'buffer',
      },
    },
    define: {
      // 为浏览器环境定义全局变量
      global: 'globalThis',
    },
    optimizeDeps: {
      include: ['iconv-lite', 'buffer'],
    },
  };
});

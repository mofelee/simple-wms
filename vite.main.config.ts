import { defineConfig } from "vite";
import path from "path";

// https://vitejs.dev/config
export default defineConfig(async () => {
  return {
    plugins: [],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@/components": path.resolve(__dirname, "src/components"),
        "@/common": path.resolve(__dirname, "src/common"),
        "@/utils": path.resolve(__dirname, "src/utils"),
        "@/lib": path.resolve(__dirname, "src/lib"),
        "@/main": path.resolve(__dirname, "src/main"),
        "@/routes": path.resolve(__dirname, "src/routes"),
      },
    },
    build: {
      rollupOptions: {
        external: [
          // electron-updater 需要被打包，不应该标记为 external
        ],
      },
    },
  };
});

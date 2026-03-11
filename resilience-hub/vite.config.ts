import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/uploads": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("three")) return "vendor-three";
          if (id.includes("leaflet") || id.includes("react-leaflet")) return "vendor-maps";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (
            id.includes("react-router") ||
            id.includes("@tanstack/react-query") ||
            id.includes("react-dom") ||
            id.includes("/react/")
          ) {
            return "vendor-react";
          }
        },
      },
    },
  },
}));

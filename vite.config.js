import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/mediata/",
  plugins: [react(), svgr()],
  build: {
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        codeSplitting: {
          minSize: 20000,
          groups: [
            {
              name: "react-vendor",
              test: /node_modules\/(react|react-dom|scheduler)\//,
            },
            {
              name: "router-vendor",
              test: /node_modules\/react-router|node_modules\/react-router-dom/,
            },
            {
              name: "mui-vendor",
              test: /node_modules\/(@mui|@emotion)\//,
            },
            {
              name: "charts-vendor",
              test: /node_modules\/(chart\.js|react-chartjs-2|chroma-js)\//,
            },
            {
              name: "three-vendor",
              test: /node_modules\/(three|@react-three|three-mesh-bvh)\//,
            },
            {
              name: "icons-vendor",
              test: /node_modules\/react-icons/,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "./coverage",
    },
  },
});
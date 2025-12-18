import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
      },
      includeAssets: ["favicon.svg", "icons/*.png"],
      devOptions: {
        enabled: true,
        type: "module",
      },
      manifest: {
        name: "Drawing Explorer",
        short_name: "DrawExplorer",
        description: "Drawing application with file explorer and OPFS storage",
        theme_color: "#1a1a2e",
        background_color: "#f8fafc",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/icons/icon-48x48.png", sizes: "48x48", type: "image/png" },
          { src: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
          { src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
          { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
          { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
          { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
          { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-256x256.png", sizes: "256x256", type: "image/png" },
          { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@internal/dock": resolve(__dirname, "../../packages/dock/src/index.ts"),
      "@internal/file-tree": resolve(__dirname, "../../packages/file-tree/src/index.ts"),
    },
  },
  optimizeDeps: {
    exclude: ["lucide-react", "@internal/dock", "@internal/file-tree"],
    include: ["workbox-window"],
  },
  server: {
    fs: {
      allow: ["../.."],
    },
  },
})

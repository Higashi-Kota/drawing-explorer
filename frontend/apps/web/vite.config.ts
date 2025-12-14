import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@internal/dock": resolve(__dirname, "../../packages/dock/src/index.ts"),
      "@internal/file-tree": resolve(__dirname, "../../packages/file-tree/src/index.ts"),
    },
  },
  optimizeDeps: {
    exclude: ["lucide-react", "@internal/dock", "@internal/file-tree"],
  },
  server: {
    fs: {
      allow: ["../.."],
    },
  },
})

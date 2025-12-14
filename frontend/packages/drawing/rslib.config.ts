import { defineConfig } from "@rslib/core"

const isProduction = process.env.NODE_ENV === "production"
const isDevelopment = process.env.NODE_ENV === "development"

export default defineConfig({
  lib: [
    {
      source: {
        entry: {
          index: "src/index.ts",
        },
        tsconfigPath: "./tsconfig.json",
      },
      format: "esm",
      syntax: "esnext",
      dts: true,
      bundle: true,
      output: {
        minify: isProduction,
        sourceMap: isDevelopment,
        target: "web",
        externals: [
          "react",
          "react-dom",
          "react/jsx-runtime",
          "lucide-react",
          "nanoevents",
          "ts-pattern",
        ],
      },
    },
  ],
  output: {
    distPath: {
      root: "dist",
    },
    cleanDistPath: "auto",
  },
  tools: {
    swc: {
      jsc: {
        transform: {
          react: {
            runtime: "automatic",
          },
        },
      },
    },
  },
  plugins: [
    {
      name: "build-success",
      setup(api) {
        api.onAfterBuild(() => {
          console.log("✅ @internal/drawing built successfully!")
        })
      },
    },
  ],
})

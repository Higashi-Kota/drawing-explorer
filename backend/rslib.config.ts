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
      dts: false,
      bundle: true,
      output: {
        minify: isProduction,
        sourceMap: isDevelopment,
        target: "node",
        externals: ["express", "cors"],
      },
    },
  ],
  output: {
    distPath: {
      root: "dist",
    },
    cleanDistPath: "auto",
  },
  plugins: [
    {
      name: "build-success",
      setup(api) {
        api.onAfterBuild(() => {
          console.log("✅ @internal/backend built successfully!")
        })
      },
    },
  ],
})
